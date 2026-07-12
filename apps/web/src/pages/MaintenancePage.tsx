import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

type Vehicle = { id: string; registrationNo: string; status: string };
type Record = {
  id: string;
  description: string;
  cost: number;
  status: string;
  vehicle?: Vehicle;
};

export function MaintenancePage() {
  const [items, setItems] = useState<Record[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("Oil change");
  const [cost, setCost] = useState("120");
  const [error, setError] = useState("");

  async function load() {
    const [m, v] = await Promise.all([
      api<Record[]>("/api/maintenance"),
      api<Vehicle[]>("/api/vehicles"),
    ]);
    setItems(m);
    setVehicles(v);
    if (!vehicleId && v[0]) setVehicleId(v[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onOpen(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          description,
          cost: Number(cost),
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onClose(id: string) {
    setError("");
    try {
      await api(`/api/maintenance/${id}/close`, { method: "POST", body: "{}" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Maintenance</h1>
      <p className="text-slate-500 text-sm mb-6">Open → vehicle InShop · Close → Available</p>
      {error && <p className="text-rose-600 mb-3 text-sm">{error}</p>}

      <form
        onSubmit={onOpen}
        className="bg-white border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end shadow-sm"
      >
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNo} ({v.status})
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          className="border rounded-lg px-3 py-2 text-sm w-28"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">
          Open maintenance
        </button>
      </form>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Description</th>
              <th className="p-3">Cost</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.vehicle?.registrationNo}</td>
                <td className="p-3">{r.description}</td>
                <td className="p-3">₹{r.cost}</td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3">
                  {r.status === "Open" && (
                    <button
                      type="button"
                      className="text-indigo-600 font-medium"
                      onClick={() => onClose(r.id)}
                    >
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
