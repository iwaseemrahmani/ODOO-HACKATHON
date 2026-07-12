import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";

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
  const [origin, setOrigin] = useState("Warehouse A");
  const [destination, setDestination] = useState("Client B");
  const [cargoWeight, setCargoWeight] = useState("450");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const canOps = hasRole("DISPATCHER", "FLEET_MANAGER");

  async function load() {
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
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
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
      setMsg("Draft trip created");
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
      setMsg(`Trip ${path} OK`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Trips</h1>
      <p className="text-slate-500 text-sm mb-6">Create, dispatch, complete, cancel</p>
      {error && <p className="text-rose-600 mb-3 text-sm">{error}</p>}
      {msg && <p className="text-emerald-700 mb-3 text-sm">{msg}</p>}

      {canOps && (
        <form
          onSubmit={onCreate}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 shadow-sm"
        >
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Cargo kg"
            value={cargoWeight}
            onChange={(e) => setCargoWeight(e.target.value)}
            required
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNo} ({v.status}) max {v.maxLoad}kg
              </option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.status})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Create draft trip
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Route</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="p-3">
                  {t.origin} → {t.destination}
                </td>
                <td className="p-3">{t.vehicle?.registrationNo}</td>
                <td className="p-3">{t.driver?.name}</td>
                <td className="p-3">{t.cargoWeight} kg</td>
                <td className="p-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="p-3 space-x-2">
                  {canOps && t.status === "Draft" && (
                    <button
                      type="button"
                      className="text-indigo-600 font-medium hover:underline"
                      onClick={() => action(t.id, "dispatch")}
                    >
                      Dispatch
                    </button>
                  )}
                  {canOps && t.status === "Dispatched" && (
                    <>
                      <button
                        type="button"
                        className="text-emerald-600 font-medium hover:underline"
                        onClick={() => action(t.id, "complete")}
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        className="text-rose-600 font-medium hover:underline"
                        onClick={() => action(t.id, "cancel")}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {canOps && t.status === "Draft" && (
                    <button
                      type="button"
                      className="text-rose-600 font-medium hover:underline"
                      onClick={() => action(t.id, "cancel")}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">
                  No trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
