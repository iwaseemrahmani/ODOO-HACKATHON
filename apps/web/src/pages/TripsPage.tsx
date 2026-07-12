import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Vehicle = { id: string; registrationNo: string; maxLoad: number; status: string };
type Driver = { id: string; name: string; status: string };
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

export function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("Warehouse A");
  const [destination, setDestination] = useState("Client B");
  const [cargoWeight, setCargoWeight] = useState("450");
  const [plannedDistance, setPlannedDistance] = useState("100");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [actualDistance, setActualDistance] = useState("");
  const [revenue, setRevenue] = useState("0");
  const canOps = hasRole("DISPATCHER", "FLEET_MANAGER");

  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const availableDrivers = drivers.filter((d) => d.status === "Available");

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
      const ad = d.filter((x) => x.status === "Available");
      if (!vehicleId && av[0]) setVehicleId(av[0].id);
      if (!driverId && ad[0]) setDriverId(ad[0].id);
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
      setMsg("Draft trip created.");
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
      setMsg(`Trip ${path} OK`);
      setCompleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Trip desk"
        subtitle="Source, destination, available assets, cargo, planned distance — Draft → Dispatch → Complete/Cancel."
      />
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {canOps && (
        <Panel className="mb-6" title="New trip" description="Only Available vehicles/drivers in the lists">
          <form onSubmit={onCreate} className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Source</Label>
              <input className="input-field" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
            </div>
            <div>
              <Label>Destination</Label>
              <input className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>
            <div>
              <Label>Cargo weight (kg)</Label>
              <input type="number" className="input-field" value={cargoWeight} onChange={(e) => setCargoWeight(e.target.value)} required />
            </div>
            <div>
              <Label>Planned distance (km)</Label>
              <input type="number" className="input-field" value={plannedDistance} onChange={(e) => setPlannedDistance(e.target.value)} required />
            </div>
            <div>
              <Label>Available vehicle</Label>
              <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                {availableVehicles.length === 0 && <option value="">No available vehicles</option>}
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} · max {v.maxLoad}kg
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Available driver</Label>
              <select className="input-field" value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                {availableDrivers.length === 0 && <option value="">No available drivers</option>}
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full h-[42px]" disabled={!vehicleId || !driverId}>
                Create draft
              </button>
            </div>
          </form>
        </Panel>
      )}

      {completeId && canOps && (
        <Panel className="mb-6" title="Complete trip" description="Actual distance & revenue for ROI">
          <div className="p-5 flex flex-wrap gap-4 items-end">
            <div>
              <Label>Actual distance (km)</Label>
              <input className="input-field" type="number" value={actualDistance} onChange={(e) => setActualDistance(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Revenue (₹)</Label>
              <input className="input-field" type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                action(completeId, "complete", {
                  distanceKm: actualDistance ? Number(actualDistance) : undefined,
                  revenue: Number(revenue) || 0,
                })
              }
            >
              Confirm complete
            </button>
            <button type="button" className="btn-ghost" onClick={() => setCompleteId(null)}>
              Cancel
            </button>
          </div>
        </Panel>
      )}

      <Panel>
        {loading ? (
          <LoadingBlock />
        ) : trips.length === 0 ? (
          <EmptyState title="No trips yet" />
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
                    <td className="font-mono text-xs">{t.vehicle?.registrationNo}</td>
                    <td>{t.driver?.name}</td>
                    <td>{t.cargoWeight} kg</td>
                    <td>{t.plannedDistance} km</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {canOps && t.status === "Draft" && (
                          <>
                            <button type="button" className="btn-ghost btn-success" onClick={() => action(t.id, "dispatch")}>
                              Dispatch
                            </button>
                            <button type="button" className="btn-ghost btn-danger" onClick={() => action(t.id, "cancel")}>
                              Cancel
                            </button>
                          </>
                        )}
                        {canOps && t.status === "Dispatched" && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost btn-success"
                              onClick={() => {
                                setCompleteId(t.id);
                                setActualDistance(String(t.plannedDistance || ""));
                                setRevenue("0");
                              }}
                            >
                              Complete
                            </button>
                            <button type="button" className="btn-ghost btn-danger" onClick={() => action(t.id, "cancel")}>
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
