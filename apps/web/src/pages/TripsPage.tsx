import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Vehicle = {
  id: string;
  registrationNo: string;
  maxLoad: number;
  status: string;
  odometer?: number;
};
type Driver = {
  id: string;
  name: string;
  status: string;
  licenseExpiry?: string;
};
type Trip = {
  id: string;
  origin: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  status: string;
  vehicle?: Vehicle;
  driver?: Driver;
};

function licenseValid(expiry?: string) {
  if (!expiry) return true;
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
}

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [actualDistance, setActualDistance] = useState("");
  const [revenue, setRevenue] = useState("0");
  const [finalOdo, setFinalOdo] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const canOps = hasRole("DISPATCHER", "FLEET_MANAGER");

  // PDF: Retired/In Shop/On Trip never in selection; only Available
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles]
  );
  // PDF: Suspended/On Trip/Off Duty/expired license cannot be assigned
  const availableDrivers = useMemo(
    () =>
      drivers.filter(
        (d) => d.status === "Available" && licenseValid(d.licenseExpiry)
      ),
    [drivers]
  );

  const selectedVehicle = availableVehicles.find((v) => v.id === vehicleId);
  const cargoNum = Number(cargoWeight);
  const cargoOk =
    selectedVehicle && Number.isFinite(cargoNum)
      ? cargoNum <= selectedVehicle.maxLoad
      : true;

  async function load() {
    try {
      const [t, v, d] = await Promise.all([
        api<Trip[]>("/api/trips"),
        api<Vehicle[]>("/api/vehicles"),
        api<Driver[]>("/api/drivers"),
      ]);
      setTrips(t);
      setVehicles(v);
      setDrivers(d);
      const av = v.filter((x) => x.status === "Available");
      const ad = d.filter(
        (x) => x.status === "Available" && licenseValid(x.licenseExpiry)
      );
      setVehicleId((prev) => (prev && av.some((x) => x.id === prev) ? prev : av[0]?.id || ""));
      setDriverId((prev) => (prev && ad.some((x) => x.id === prev) ? prev : ad[0]?.id || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!vehicleId || !driverId) {
      setError("Select an available vehicle and driver.");
      return;
    }
    if (!cargoOk) {
      setError(
        `Cargo ${cargoNum} kg exceeds max load ${selectedVehicle?.maxLoad} kg for this vehicle.`
      );
      return;
    }
    try {
      await api("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          cargoWeight: Number(cargoWeight),
          plannedDistance: Number(plannedDistance),
          vehicleId,
          driverId,
        }),
      });
      setMsg("Draft trip created. Dispatch when ready.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function action(id: string, path: string, body?: object) {
    setError("");
    setMsg("");
    try {
      await api(`/api/trips/${id}/${path}`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      });
      setMsg(
        path === "dispatch"
          ? "Dispatched — vehicle & driver are now On Trip."
          : path === "complete"
            ? "Completed — vehicle & driver restored to Available."
            : path === "cancel"
              ? "Cancelled — assets restored if trip was dispatched."
              : `Trip ${path} OK`
      );
      setCompleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  function openComplete(t: Trip) {
    setCompleteId(t.id);
    setActualDistance(String(t.plannedDistance || ""));
    setRevenue("0");
    setFinalOdo(String(t.vehicle?.odometer ?? ""));
    setFuelLiters("");
    setFuelCost("");
  }

  return (
    <div>
      <PageHeader
        title="Trip desk"
        subtitle="Only Available vehicles (not Retired/In Shop/On Trip) and Available drivers with valid licenses. Cargo ≤ max load. Status transitions are automatic."
      />
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {canOps && (
        <Panel
          className="mb-6"
          title="New trip"
          description="Draft → Dispatch → Complete / Cancel · rules enforced on server"
        >
          <form
            onSubmit={onCreate}
            className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <Label>Source *</Label>
              <input
                className="input-field"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Destination *</Label>
              <input
                className="input-field"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Cargo weight (kg) *</Label>
              <input
                type="number"
                min="0.01"
                step="any"
                className={`input-field ${!cargoOk ? "border-rose-400 ring-1 ring-rose-200" : ""}`}
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
                required
              />
              {selectedVehicle && (
                <p className={`mt-1 text-[11px] ${cargoOk ? "text-slate-400" : "text-rose-600 font-medium"}`}>
                  Max load for {selectedVehicle.registrationNo}: {selectedVehicle.maxLoad} kg
                  {!cargoOk && " — cargo exceeds capacity"}
                </p>
              )}
            </div>
            <div>
              <Label>Planned distance (km) *</Label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={plannedDistance}
                onChange={(e) => setPlannedDistance(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Available vehicle *</Label>
              <select
                className="input-field"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
              >
                {availableVehicles.length === 0 && (
                  <option value="">No Available vehicles</option>
                )}
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} · max {v.maxLoad} kg
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Retired, In Shop, and On Trip are hidden
              </p>
            </div>
            <div>
              <Label>Available driver *</Label>
              <select
                className="input-field"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
              >
                {availableDrivers.length === 0 && (
                  <option value="">No Available drivers</option>
                )}
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Suspended, Off Duty, On Trip, expired license hidden
              </p>
            </div>
            <div className="flex items-end md:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="btn-primary w-full h-[42px]"
                disabled={!vehicleId || !driverId || !cargoOk}
              >
                Create draft
              </button>
            </div>
          </form>
        </Panel>
      )}

      {completeId && canOps && (
        <Panel
          className="mb-6"
          title="Complete trip"
          description="Workflow step 6: final odometer + fuel consumed · vehicle & driver → Available"
        >
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Actual distance (km)</Label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={actualDistance}
                onChange={(e) => setActualDistance(e.target.value)}
                placeholder="Defaults to planned"
              />
            </div>
            <div>
              <Label>Final odometer (km)</Label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={finalOdo}
                onChange={(e) => setFinalOdo(e.target.value)}
                placeholder="Updates vehicle odometer"
              />
            </div>
            <div>
              <Label>Fuel consumed (L)</Label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="any"
                value={fuelLiters}
                onChange={(e) => setFuelLiters(e.target.value)}
                placeholder="Creates fuel log"
              />
            </div>
            <div>
              <Label>Fuel cost (₹)</Label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="any"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                placeholder="Optional with fuel"
              />
            </div>
            <div>
              <Label>Revenue (₹)</Label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  action(completeId, "complete", {
                    distanceKm: actualDistance ? Number(actualDistance) : undefined,
                    revenue: Number(revenue) || 0,
                    odometer: finalOdo !== "" ? Number(finalOdo) : undefined,
                    fuelLiters: fuelLiters !== "" ? Number(fuelLiters) : undefined,
                    fuelCost: fuelCost !== "" ? Number(fuelCost) : undefined,
                  })
                }
              >
                Confirm complete
              </button>
              <button type="button" className="btn-ghost" onClick={() => setCompleteId(null)}>
                Back
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Trips" description="Draft → Dispatched → Completed / Cancelled">
        {loading ? (
          <LoadingBlock />
        ) : trips.length === 0 ? (
          <EmptyState title="No trips yet" hint="Create a draft with Available assets." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Cargo</th>
                  <th>Planned km</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold">
                      {t.origin} → {t.destination}
                    </td>
                    <td className="font-mono text-xs">
                      {t.vehicle?.registrationNo}
                      {t.vehicle?.status && t.status === "Dispatched" && (
                        <span className="block text-[10px] text-slate-400">
                          {t.vehicle.status}
                        </span>
                      )}
                    </td>
                    <td>
                      {t.driver?.name}
                      {t.driver?.status && t.status === "Dispatched" && (
                        <span className="block text-[10px] text-slate-400">
                          {t.driver.status}
                        </span>
                      )}
                    </td>
                    <td>{t.cargoWeight} kg</td>
                    <td>{t.plannedDistance} km</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {canOps && t.status === "Draft" && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost btn-success"
                              onClick={() => action(t.id, "dispatch")}
                            >
                              Dispatch
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-danger"
                              onClick={() => action(t.id, "cancel")}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {canOps && t.status === "Dispatched" && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost btn-success"
                              onClick={() => openComplete(t)}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-danger"
                              onClick={() => action(t.id, "cancel")}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
