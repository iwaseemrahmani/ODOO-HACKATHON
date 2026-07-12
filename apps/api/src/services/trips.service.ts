import {
  DriverStatus,
  MaintenanceStatus,
  MaintenanceType,
  Prisma,
  TripStatus,
  VehicleStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

function makeTripCode() {
  return `TRP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export class BusinessRuleError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BusinessRuleError";
    this.status = status;
  }
}

function isLicenseExpired(expiry: Date) {
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end < new Date();
}

function assertVehicleAssignable(
  vehicle: { registrationNo: string; status: VehicleStatus; maxLoad: number },
  cargoWeight: number
) {
  if (
    vehicle.status === VehicleStatus.Retired ||
    vehicle.status === VehicleStatus.InShop ||
    vehicle.status === VehicleStatus.OnTrip
  ) {
    throw new BusinessRuleError(
      `Vehicle ${vehicle.registrationNo} cannot be assigned (status: ${vehicle.status}). Retired/In Shop/On Trip are not allowed.`
    );
  }
  if (vehicle.status !== VehicleStatus.Available) {
    throw new BusinessRuleError(
      `Vehicle ${vehicle.registrationNo} must be Available to assign (status: ${vehicle.status})`
    );
  }
  if (cargoWeight > vehicle.maxLoad) {
    throw new BusinessRuleError(
      `Cargo weight ${cargoWeight} kg exceeds vehicle max load ${vehicle.maxLoad} kg`
    );
  }
}

function assertDriverAssignable(driver: {
  name: string;
  status: DriverStatus;
  licenseExpiry: Date;
}) {
  if (driver.status === DriverStatus.Suspended) {
    throw new BusinessRuleError(`Driver ${driver.name} is Suspended and cannot be assigned`);
  }
  if (driver.status === DriverStatus.OnTrip) {
    throw new BusinessRuleError(`Driver ${driver.name} is already On Trip`);
  }
  if (driver.status === DriverStatus.OffDuty) {
    throw new BusinessRuleError(`Driver ${driver.name} is Off Duty and cannot be assigned`);
  }
  if (driver.status !== DriverStatus.Available) {
    throw new BusinessRuleError(
      `Driver ${driver.name} must be Available (status: ${driver.status})`
    );
  }
  if (isLicenseExpired(driver.licenseExpiry)) {
    throw new BusinessRuleError(`Driver ${driver.name} has an expired license`);
  }
}

/**
 * Mandatory business rules for trip lifecycle (brief §4).
 */
const TRIP_PRIORITIES = new Set(["Low", "Medium", "High", "Critical"]);

export async function createTrip(input: {
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  scheduledAt?: string;
  notes?: string;
  priority?: string;
  dispatcherId?: string;
  revenue?: number;
}) {
  if (!input.origin?.trim() || !input.destination?.trim()) {
    throw new BusinessRuleError("Source and destination are required");
  }
  if (!Number.isFinite(input.cargoWeight) || input.cargoWeight <= 0) {
    throw new BusinessRuleError("Cargo weight must be greater than 0");
  }
  if (
    input.plannedDistance == null ||
    Number.isNaN(input.plannedDistance) ||
    input.plannedDistance < 0
  ) {
    throw new BusinessRuleError("plannedDistance is required and must be >= 0");
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new BusinessRuleError("Vehicle not found", 404);

  const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) throw new BusinessRuleError("Driver not found", 404);

  // Same assignment rules as dispatch — draft cannot hold blocked assets
  assertVehicleAssignable(vehicle, input.cargoWeight);
  assertDriverAssignable(driver);

  const priority =
    input.priority && TRIP_PRIORITIES.has(input.priority)
      ? (input.priority as "Low" | "Medium" | "High" | "Critical")
      : "Medium";

  return prisma.trip.create({
    data: {
      tripCode: makeTripCode(),
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      dispatcherId: input.dispatcherId || null,
      origin: input.origin.trim(),
      destination: input.destination.trim(),
      cargoWeight: input.cargoWeight,
      plannedDistance: input.plannedDistance,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      notes: input.notes?.trim() || null,
      priority,
      revenue:
        input.revenue != null && Number.isFinite(input.revenue) && input.revenue >= 0
          ? input.revenue
          : 0,
      status: TripStatus.Draft,
    },
    include: { vehicle: { include: { region: true } }, driver: true },
  });
}

export async function dispatchTrip(tripId: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });
    if (!trip) throw new BusinessRuleError("Trip not found", 404);
    if (trip.status !== TripStatus.Draft) {
      throw new BusinessRuleError(`Cannot dispatch trip in status ${trip.status}`);
    }

    assertVehicleAssignable(trip.vehicle, trip.cargoWeight);
    assertDriverAssignable(trip.driver);

    const [vNow, dNow] = await Promise.all([
      tx.vehicle.findUniqueOrThrow({ where: { id: trip.vehicleId } }),
      tx.driver.findUniqueOrThrow({ where: { id: trip.driverId } }),
    ]);
    if (vNow.status !== VehicleStatus.Available) {
      throw new BusinessRuleError(`Vehicle no longer available (${vNow.status})`);
    }
    if (dNow.status !== DriverStatus.Available) {
      throw new BusinessRuleError(`Driver no longer available (${dNow.status})`);
    }
    if (isLicenseExpired(dNow.licenseExpiry)) {
      throw new BusinessRuleError(`Driver ${dNow.name} has an expired license`);
    }
    if (trip.cargoWeight > vNow.maxLoad) {
      throw new BusinessRuleError(
        `Cargo weight ${trip.cargoWeight} kg exceeds max load ${vNow.maxLoad} kg`
      );
    }

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VehicleStatus.OnTrip },
    });
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.OnTrip },
    });

    return tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.Dispatched },
      include: { vehicle: true, driver: true },
    });
  });
}

/**
 * Complete trip: restore Available; optional final odometer + fuel consumed (workflow step 6).
 */
export async function completeTrip(
  tripId: string,
  opts?: {
    distanceKm?: number;
    revenue?: number;
    notes?: string;
    /** Final odometer reading (updates vehicle) */
    odometer?: number;
    /** Fuel consumed on this trip (creates fuel log) */
    fuelLiters?: number;
    fuelCost?: number;
  }
) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true },
    });
    if (!trip) throw new BusinessRuleError("Trip not found", 404);
    if (trip.status !== TripStatus.Dispatched) {
      throw new BusinessRuleError(`Cannot complete trip in status ${trip.status}`);
    }

    const vehicleUpdate: { status: VehicleStatus; odometer?: number } = {
      status: VehicleStatus.Available,
    };

    if (opts?.odometer != null) {
      if (!Number.isFinite(opts.odometer) || opts.odometer < 0) {
        throw new BusinessRuleError("Final odometer must be a number >= 0");
      }
      if (opts.odometer < trip.vehicle.odometer) {
        throw new BusinessRuleError(
          `Final odometer (${opts.odometer}) cannot be less than current vehicle odometer (${trip.vehicle.odometer})`
        );
      }
      vehicleUpdate.odometer = opts.odometer;
    }

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: vehicleUpdate,
    });
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.Available },
    });

    // Workflow step 6: fuel consumed → fuel log (feeds reports efficiency/cost)
    if (opts?.fuelLiters != null && opts.fuelLiters > 0) {
      const cost =
        opts.fuelCost != null && Number.isFinite(opts.fuelCost) ? opts.fuelCost : 0;
      if (cost < 0) throw new BusinessRuleError("Fuel cost cannot be negative");
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          liters: opts.fuelLiters,
          cost,
          date: new Date(),
          odometer: opts.odometer ?? null,
        },
      });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.Completed,
        completedAt: new Date(),
        distanceKm:
          opts?.distanceKm != null ? opts.distanceKm : trip.plannedDistance || undefined,
        revenue: opts?.revenue != null ? opts.revenue : undefined,
        notes: opts?.notes ?? undefined,
      },
      include: { vehicle: true, driver: true },
    });
  });
}

export async function cancelTrip(tripId: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new BusinessRuleError("Trip not found", 404);
    if (trip.status === TripStatus.Completed || trip.status === TripStatus.Cancelled) {
      throw new BusinessRuleError(`Cannot cancel trip in status ${trip.status}`);
    }

    // Cancelling a dispatched trip restores vehicle + driver to Available
    if (trip.status === TripStatus.Dispatched) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.Available },
      });
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.Available },
      });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.Cancelled },
      include: { vehicle: true, driver: true },
    });
  });
}

const MAINT_TYPES = new Set<string>(Object.values(MaintenanceType));

function resolveMaintenanceType(raw?: string | MaintenanceType): MaintenanceType {
  if (raw && MAINT_TYPES.has(String(raw))) {
    return raw as MaintenanceType;
  }
  return MaintenanceType.Service;
}

export async function openMaintenance(input: {
  vehicleId: string;
  description: string;
  cost?: number;
  maintenanceType?: string | MaintenanceType;
}) {
  if (!input.description?.trim()) {
    throw new BusinessRuleError("Description is required");
  }
  const cost = input.cost ?? 0;
  if (!Number.isFinite(cost) || cost < 0) {
    throw new BusinessRuleError("Cost must be 0 or greater");
  }
  const maintenanceType = resolveMaintenanceType(input.maintenanceType);

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new BusinessRuleError("Vehicle not found", 404);
    if (vehicle.status === VehicleStatus.OnTrip) {
      throw new BusinessRuleError("Cannot open maintenance while vehicle is OnTrip");
    }
    if (vehicle.status === VehicleStatus.Retired) {
      throw new BusinessRuleError("Cannot open maintenance on a retired vehicle");
    }
    if (vehicle.status === VehicleStatus.InShop) {
      throw new BusinessRuleError("Vehicle is already In Shop");
    }

    await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: { status: VehicleStatus.InShop },
    });

    // Schema enum: ToShop | Scheduled | InShop | Closed (not "Open")
    return tx.maintenanceRecord.create({
      data: {
        vehicleId: input.vehicleId,
        description: input.description.trim(),
        cost,
        maintenanceType,
        status: MaintenanceStatus.InShop,
      },
      include: { vehicle: { include: { region: true } } },
    });
  });
}

export async function closeMaintenance(recordId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new BusinessRuleError("Maintenance record not found", 404);
    if (record.status === MaintenanceStatus.Closed) {
      throw new BusinessRuleError("Maintenance already closed");
    }

    const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: record.vehicleId } });
    if (vehicle.status !== VehicleStatus.Retired) {
      await tx.vehicle.update({
        where: { id: record.vehicleId },
        data: { status: VehicleStatus.Available },
      });
    }

    return tx.maintenanceRecord.update({
      where: { id: recordId },
      data: { status: MaintenanceStatus.Closed, closedAt: new Date() },
      include: { vehicle: true },
    });
  });
}

export function isPrismaUniqueError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
