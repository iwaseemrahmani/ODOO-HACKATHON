import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";

type Vehicle = {
  id: string;
  registrationNo: string;
  model: string;
  capacity: string | null;
  maxLoad: number;
  status: string;
};

export function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [reg, setReg] = useState("");
  const [model, setModel] = useState("");
  const [maxLoad, setMaxLoad] = useState("500");
  const canCreate = hasRole("FLEET_MANAGER", "DISPATCHER");

  async function load() {
    try {
      setItems(await api<Vehicle[]>("/api/vehicles"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          registrationNo: reg,
          model,
          maxLoad: Number(maxLoad),
        }),
      });
      setReg("");
      setModel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Vehicles</h1>
      <p className="text-slate-500 text-sm mb-6">Fleet registry</p>
      {error && <p className="text-rose-600 mb-4 text-sm">{error}</p>}

      {canCreate && (
        <form
          onSubmit={onCreate}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end shadow-sm"
        >
          <div>
            <label className="text-xs text-slate-500">Reg. No</label>
            <input
              className="block border rounded-lg px-3 py-2 text-sm"
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Model</label>
            <input
              className="block border rounded-lg px-3 py-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Max load (kg)</label>
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 text-sm w-28"
              value={maxLoad}
              onChange={(e) => setMaxLoad(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-500"
          >
            Add vehicle
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Registration</th>
              <th className="p-3">Model</th>
              <th className="p-3">Max load</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{v.registrationNo}</td>
                <td className="p-3">{v.model}</td>
                <td className="p-3">{v.maxLoad} kg</td>
                <td className="p-3">
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
