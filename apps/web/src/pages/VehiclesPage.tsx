import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

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
  const [loading, setLoading] = useState(true);
  const [reg, setReg] = useState("");
  const [model, setModel] = useState("");
  const [maxLoad, setMaxLoad] = useState("500");
  const canCreate = hasRole("FLEET_MANAGER", "DISPATCHER");

  async function load() {
    try {
      setItems(await api<Vehicle[]>("/api/vehicles"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
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
      <PageHeader
        title="Vehicle registry"
        subtitle="Unique registration, load capacity, and live operational status."
      />
      {error && <Alert type="error">{error}</Alert>}

      {canCreate && (
        <Panel className="mb-6 animate-fade-up" title="Register vehicle" description="Fleet managers & dispatchers">
          <form onSubmit={onCreate} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Registration No</Label>
              <input className="input-field font-mono" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Van-05" required />
            </div>
            <div>
              <Label>Model</Label>
              <input className="input-field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Toyota HiAce" required />
            </div>
            <div>
              <Label>Max load (kg)</Label>
              <input type="number" className="input-field" value={maxLoad} onChange={(e) => setMaxLoad(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary h-[42px]">
              Add vehicle
            </button>
          </form>
        </Panel>
      )}

      <Panel className="animate-fade-up stagger-2">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No vehicles yet" hint="Register your first asset above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Capacity</th>
                  <th>Max load</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td className="font-semibold font-mono text-slate-900">{v.registrationNo}</td>
                    <td className="text-slate-700">{v.model}</td>
                    <td className="text-slate-500">{v.capacity || "—"}</td>
                    <td>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {v.maxLoad} kg
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
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
