import {
  DriverStatus,
  Prisma,
  TripStatus,
  VehicleStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

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

/**
 * Mandatory business rules for trip lifecycle.
 */
export async function createTrip(input: {
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  cargoWeight: number;
  scheduledAt?: string;
  distanceKm?: number;
  notes?: string;
}) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new BusinessRuleError("Vehicle not found", 404);

  if (input.cargoWeight > vehicle.maxLoad) {
    throw new BusinessRuleError(
      `Cargo weight ${input.cargoWeight} kg exceeds vehicle max load ${vehicle.maxLoad} kg`
    );
  }

  const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) throw new BusinessRuleError("Driver not found", 404);

  return prisma.trip.create({
    data: {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      origin: input.origin,
      destination: input.destination,
      cargoWeight: input.cargoWeight,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      distanceKm: input.distanceKm,
      notes: input.notes,
      status: TripStatus.Draft,
    },
    include: { vehicle: true, driver: true },
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

    const { vehicle, driver } = trip;

    if (
      vehicle.status === VehicleStatus.Retired ||
      vehicle.status === VehicleStatus.InShop ||
      vehicle.status === VehicleStatus.OnTrip
    ) {
      throw new BusinessRuleError(
        `Vehicle ${vehicle.registrationNo} cannot be dispatched (status: ${vehicle.status})`
      );
    }

    if (driver.status === DriverStatus.Suspended || driver.status === DriverStatus.OnTrip) {
      throw new BusinessRuleError(
        `Driver ${driver.name} cannot be assigned (status: ${driver.status})`
      );
    }

    if (isLicenseExpired(driver.licenseExpiry)) {
      throw new BusinessRuleError(`Driver ${driver.name} has an expired license`);
    }

    if (trip.cargoWeight > vehicle.maxLoad) {
      throw new BusinessRuleError(
        `Cargo weight ${trip.cargoWeight} kg exceeds max load ${vehicle.maxLoad} kg`
      );
    }

    // Re-check latest status (race safety)
    const [vNow, dNow] = await Promise.all([
      tx.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } }),
      tx.driver.findUniqueOrThrow({ where: { id: driver.id } }),
    ]);
    if (vNow.status !== VehicleStatus.Available) {
      throw new BusinessRuleError(`Vehicle no longer available (${vNow.status})`);
    }
    if (dNow.status !== DriverStatus.Available) {
      throw new BusinessRuleError(`Driver no longer available (${dNow.status})`);
    }

    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { status: VehicleStatus.OnTrip },
    });
    await tx.driver.update({
      where: { id: driver.id },
      data: { status: DriverStatus.OnTrip },
    });

    return tx.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.Dispatched },
      include: { vehicle: true, driver: true },
    });
  });
}

export async function completeTrip(
  tripId: string,
  opts?: { distanceKm?: number; notes?: string }
) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new BusinessRuleError("Trip not found", 404);
    if (trip.status !== TripStatus.Dispatched) {
      throw new BusinessRuleError(`Cannot complete trip in status ${trip.status}`);
    }

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VehicleStatus.Available },
    });
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DriverStatus.Available },
    });

    return tx.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.Completed,
        completedAt: new Date(),
        distanceKm: opts?.distanceKm ?? undefined,
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

export async function openMaintenance(input: {
  vehicleId: string;
  description: string;
  cost?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new BusinessRuleError("Vehicle not found", 404);
    if (vehicle.status === VehicleStatus.OnTrip) {
      throw new BusinessRuleError("Cannot open maintenance while vehicle is OnTrip");
    }
    if (vehicle.status === VehicleStatus.Retired) {
      throw new BusinessRuleError("Cannot open maintenance on a retired vehicle");
    }

    await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: { status: VehicleStatus.InShop },
    });

    return tx.maintenanceRecord.create({
      data: {
        vehicleId: input.vehicleId,
        description: input.description,
        cost: input.cost ?? 0,
        status: "Open",
      },
      include: { vehicle: true },
    });
  });
}

export async function closeMaintenance(recordId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new BusinessRuleError("Maintenance record not found", 404);
    if (record.status === "Closed") {
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
      data: { status: "Closed", closedAt: new Date() },
      include: { vehicle: true },
    });
  });
}

export function isPrismaUniqueError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
