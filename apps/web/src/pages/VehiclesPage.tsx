import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Vehicle = {
  id: string;
  registrationNo: string;
  model: string;
  type: string;
  region: string;
  capacity: string | null;
  maxLoad: number;
  odometer: number;
  acquisitionCost: number;
  status: string;
};

export function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reg, setReg] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("Van");
  const [region, setRegion] = useState("North");
  const [maxLoad, setMaxLoad] = useState("");
  const [odometer, setOdometer] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
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
          type,
          region,
          maxLoad: Number(maxLoad),
          odometer: odometer === "" ? 0 : Number(odometer),
          acquisitionCost: acquisitionCost === "" ? 0 : Number(acquisitionCost),
        }),
      });
      setReg("");
      setModel("");
      setMaxLoad("");
      setOdometer("");
      setAcquisitionCost("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehicle registry"
        subtitle="Registration, type, region, load, odometer, acquisition cost, and status."
      />
      {error && <Alert type="error">{error}</Alert>}

      {canCreate && (
        <Panel className="mb-6 animate-fade-up" title="Register vehicle">
          <form
            onSubmit={onCreate}
            className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
          >
            <div>
              <Label>Registration No</Label>
              <input className="input-field font-mono" value={reg} onChange={(e) => setReg(e.target.value)} required />
            </div>
            <div>
              <Label>Model / name</Label>
              <input className="input-field" value={model} onChange={(e) => setModel(e.target.value)} required />
            </div>
            <div>
              <Label>Type</Label>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                <option>Van</option>
                <option>Truck</option>
                <option>Bus</option>
                <option>Car</option>
              </select>
            </div>
            <div>
              <Label>Region</Label>
              <select className="input-field" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option>North</option>
                <option>South</option>
                <option>East</option>
                <option>West</option>
              </select>
            </div>
            <div>
              <Label>Max load (kg)</Label>
              <input type="number" className="input-field" value={maxLoad} onChange={(e) => setMaxLoad(e.target.value)} required />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <input type="number" className="input-field" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div>
              <Label>Acquisition cost (₹)</Label>
              <input type="number" className="input-field" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
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
          <EmptyState title="No vehicles yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Reg. No</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Max load</th>
                  <th>Odometer</th>
                  <th>Acq. cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td className="font-semibold font-mono">{v.registrationNo}</td>
                    <td>{v.model}</td>
                    <td>{v.type}</td>
                    <td>{v.region}</td>
                    <td>{v.maxLoad} kg</td>
                    <td>{v.odometer} km</td>
                    <td>₹{Number(v.acquisitionCost).toLocaleString()}</td>
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
