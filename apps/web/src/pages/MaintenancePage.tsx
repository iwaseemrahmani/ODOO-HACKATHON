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
};

export function MaintenancePage() {
  const [items, setItems] = useState<Record[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("Oil change");
  const [cost, setCost] = useState("120");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [m, v] = await Promise.all([
        api<Record[]>("/api/maintenance"),
        api<Vehicle[]>("/api/vehicles"),
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
      <PageHeader
        title="Maintenance bay"
        subtitle="Opening a job sets the vehicle In Shop. Closing restores Available."
      />
      {error && <Alert type="error">{error}</Alert>}

      <Panel className="mb-6 animate-fade-up" title="Open maintenance" description="Vehicle leaves the dispatch pool">
        <form onSubmit={onOpen} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Vehicle</Label>
            <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo} ({v.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Work description</Label>
            <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div>
            <Label>Cost (₹)</Label>
            <input type="number" className="input-field" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary h-[42px]">
            Open job
          </button>
        </form>
      </Panel>

      <Panel className="animate-fade-up stagger-2">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No maintenance records" hint="Open a job when a unit needs service." />
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
                    <td className="font-mono text-xs font-semibold">{r.vehicle?.registrationNo}</td>
                    <td>{r.description}</td>
                    <td className="font-semibold text-slate-800">₹{r.cost}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
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
