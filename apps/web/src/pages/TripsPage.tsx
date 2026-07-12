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
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const canOps = hasRole("DISPATCHER", "FLEET_MANAGER");

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
      if (!vehicleId && v[0]) setVehicleId(v[0].id);
      if (!driverId && d[0]) setDriverId(d[0].id);
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
          vehicleId,
          driverId,
        }),
      });
      setMsg("Draft trip created — dispatch when ready.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function action(id: string, path: string) {
    setError("");
    setMsg("");
    try {
      await api(`/api/trips/${id}/${path}`, { method: "POST", body: "{}" });
      setMsg(`Trip ${path} successful.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Trip desk"
        subtitle="Draft → dispatch with capacity & license rules → complete or cancel."
      />
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {canOps && (
        <Panel className="mb-6 animate-fade-up" title="New trip" description="Creates a Draft; rules run on Dispatch">
          <form onSubmit={onCreate} className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Origin</Label>
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
              <Label>Vehicle</Label>
              <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} · {v.status} · max {v.maxLoad}kg
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Driver</Label>
              <select className="input-field" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full h-[42px]">
                Create draft
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel className="animate-fade-up stagger-2">
        {loading ? (
          <LoadingBlock />
        ) : trips.length === 0 ? (
          <EmptyState title="No trips yet" hint="Create a draft, then dispatch with one click." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="font-semibold text-slate-900">
                        {t.origin}
                        <span className="mx-1.5 text-slate-300">→</span>
                        {t.destination}
                      </div>
                    </td>
                    <td className="font-mono text-xs">{t.vehicle?.registrationNo}</td>
                    <td>{t.driver?.name}</td>
                    <td>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                        {t.cargoWeight} kg
                      </span>
                    </td>
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
                            <button type="button" className="btn-ghost btn-success" onClick={() => action(t.id, "complete")}>
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
