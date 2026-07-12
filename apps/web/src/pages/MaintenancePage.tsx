import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Vehicle = { id: string; registrationNo: string; status: string };
type Record = {
  id: string;
  description: string;
  cost: number;
  status: string;
  openedAt?: string;
  vehicle?: Vehicle;
};

export function MaintenancePage() {
  const [items, setItems] = useState<Record[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const stats = useMemo(() => {
    const available = vehicles.filter((v) => v.status === "Available").length;
    const inShop = vehicles.filter((v) => v.status === "InShop").length;
    const openJobs = items.filter((i) => i.status === "Open").length;
    const closedJobs = items.filter((i) => i.status === "Closed").length;
    return { available, inShop, openJobs, closedJobs };
  }, [vehicles, items]);

  const openable = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles]
  );

  async function load() {
    try {
      const [m, v] = await Promise.all([
        api<Record[]>("/api/maintenance"),
        api<Vehicle[]>("/api/vehicles"),
      ]);
      setItems(m);
      setVehicles(v);
      const open = v.filter((x) => x.status === "Available");
      setVehicleId((prev) =>
        prev && open.some((x) => x.id === prev) ? prev : open[0]?.id || ""
      );
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
    if (!vehicleId) {
      setError("Select an Available vehicle.");
      return;
    }
    try {
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          description,
          cost: cost === "" ? 0 : Number(cost),
        }),
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

  const cards = [
    { label: "Available", count: stats.available, color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
    { label: "In shop", count: stats.inShop, color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800" },
    { label: "Open jobs", count: stats.openJobs, color: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-800" },
    { label: "Closed jobs", count: stats.closedJobs, color: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-700" },
  ];

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Open a job to set a vehicle In Shop. Close to restore Available."
      />
      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`card-elevated rounded-2xl p-4 ${c.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
              <span className={`text-xs font-semibold ${c.text}`}>{c.label}</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${c.text}`}>{c.count}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Open job" description="Sets vehicle status to In Shop">
          <form onSubmit={onOpen} className="p-5 space-y-4">
            <div>
              <Label>Vehicle (Available only)</Label>
              <select
                className="input-field"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
              >
                {openable.length === 0 && <option value="">No Available vehicles</option>}
                {openable.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Work description</Label>
              <input
                className="input-field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Description"
              />
            </div>
            <div>
              <Label>Cost (₹)</Label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={!vehicleId}
            >
              Open job
            </button>
          </form>
        </Panel>

        <Panel title="Open jobs" description="Active maintenance (In Shop)">
          {loading ? (
            <LoadingBlock />
          ) : items.filter((i) => i.status === "Open").length === 0 ? (
            <EmptyState title="No open jobs" hint="Open a job when a vehicle needs service." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items
                .filter((i) => i.status === "Open")
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold">
                        {r.vehicle?.registrationNo ?? "—"}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{r.description}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">₹{r.cost}</span>
                      <button
                        type="button"
                        className="btn-ghost btn-success"
                        onClick={() => onClose(r.id)}
                      >
                        Close
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Maintenance log" description="All records from the database">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No maintenance records" hint="Nothing logged yet." />
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
                    <td className="font-mono text-xs font-semibold">
                      {r.vehicle?.registrationNo || "—"}
                    </td>
                    <td>{r.description}</td>
                    <td className="font-semibold">₹{r.cost}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      {r.status === "Open" && (
                        <button
                          type="button"
                          className="btn-ghost btn-success"
                          onClick={() => onClose(r.id)}
                        >
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
