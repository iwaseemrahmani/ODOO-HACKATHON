import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Vehicle = { id: string; registrationNo: string; status: string };
type Record = {
  id: string;
  description: string;
  cost: number;
  status: string;
  vehicle?: Vehicle;
  date?: string;
};

const mockSchedule = [
  { id: "1", vehicle: "TN-01-AB-1234", service: "Oil change", dueIn: "2 days", priority: "high" },
  { id: "2", vehicle: "TN-01-CD-5678", service: "Brake inspection", dueIn: "1 week", priority: "medium" },
  { id: "3", vehicle: "TN-01-EF-9012", service: "Tire rotation", dueIn: "3 weeks", priority: "low" },
];

const statusCards = [
  { label: "Operational", count: 8, color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
  { label: "In shop", count: 3, color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800" },
  { label: "Overdue service", count: 2, color: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-800" },
  { label: "Scheduled", count: 5, color: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-800" },
];

export function MaintenancePage() {
  const [items, setItems] = useState<Record[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [m, v] = await Promise.all([
        api<Record[]>("/api/maintenance").catch(() => [] as Record[]),
        api<Vehicle[]>("/api/vehicles").catch(() => [] as Vehicle[]),
      ]);
      setItems(m);
      setVehicles(v);
      if (!vehicleId && v[0]) setVehicleId(v[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onOpen(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({ vehicleId, description, cost: Number(cost) }),
      });
      setDescription("");
      setCost("");
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
      <PageHeader
        title="Maintenance"
        subtitle="Vehicle upkeep, service scheduling, and maintenance logs."
      />
      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
        {statusCards.map((c) => (
          <div key={c.label} className={`card-elevated rounded-2xl p-4 ${c.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
              <span className={`text-xs font-semibold ${c.text}`}>{c.label}</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${c.text}`}>{c.count}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 animate-fade-up stagger-2">
        <Panel title="Service schedule" description="Upcoming maintenance by vehicle">
          <div className="divide-y divide-slate-100">
            {mockSchedule.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{s.vehicle}</div>
                  <div className="text-xs text-slate-500">{s.service}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{s.dueIn}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${
                      s.priority === "high"
                        ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                        : s.priority === "medium"
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                          : "bg-sky-50 text-sky-700 ring-sky-600/20"
                    }`}
                  >
                    {s.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Open job" description="Log new maintenance work">
          <form onSubmit={onOpen} className="p-5 space-y-4">
            <div>
              <Label>Vehicle</Label>
              <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.length === 0 && <option value="">No vehicles</option>}
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Work description</Label>
              <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g. Brake pad replacement" />
            </div>
            <div>
              <Label>Cost (₹)</Label>
              <input type="number" className="input-field" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
            </div>
            <button type="submit" className="btn-primary w-full justify-center">
              Open job
            </button>
          </form>
        </Panel>
      </div>

      <Panel className="animate-fade-up stagger-3" title="Maintenance logs" description="Recent and historical service records">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No maintenance records" hint="Open a job when a vehicle needs service." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs font-semibold">{r.vehicle?.registrationNo || "—"}</td>
                    <td>{r.description}</td>
                    <td className="font-semibold text-slate-800">₹{r.cost}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.status === "Open" && (
                        <button type="button" className="btn-ghost btn-success" onClick={() => onClose(r.id)}>
                          Close job
                        </button>
                      )}
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
