import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconTruck } from "../components/Icons";

type Vehicle = {
  id: string;
  registrationNo: string;
  model: string;
  manufacturer?: string | null;
  type: string;
  fuelType?: string | null;
  region: string;
  capacity: string | null;
  maxLoad: number;
  odometer: number;
  acquisitionCost: number;
  status: string;
};

const VEHICLE_TYPES = ["Van", "Truck", "MiniTruck", "Trailer"] as const;
const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric"] as const;
const REGIONS = ["North", "South", "East", "West"] as const;
const STATUSES = ["Available", "OnTrip", "InShop", "Retired"] as const;

function formatInr(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ring-1 ${
        active
          ? "bg-indigo-600 text-white ring-indigo-600 shadow-sm shadow-indigo-500/20"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

export function VehiclesPage() {
  const canCreate = hasRole("FLEET_MANAGER", "DISPATCHER");
  const canManage = hasRole("FLEET_MANAGER", "DISPATCHER");
  const canDelete = hasRole("FLEET_MANAGER");

  const [items, setItems] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reg, setReg] = useState("");
  const [model, setModel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [type, setType] = useState("Van");
  const [fuelType, setFuelType] = useState("Diesel");
  const [region, setRegion] = useState("North");
  const [maxLoad, setMaxLoad] = useState("");
  const [odometer, setOdometer] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [query, setQuery] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    model: "",
    maxLoad: "",
    odometer: "",
    region: "North",
    fuelType: "Diesel",
    acquisitionCost: "",
  });

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter((v) => v.status === "Available").length,
      onTrip: items.filter((v) => v.status === "OnTrip").length,
      inShop: items.filter((v) => v.status === "InShop").length,
      retired: items.filter((v) => v.status === "Retired").length,
      fleetValue: items.reduce((s, v) => s + Number(v.acquisitionCost || 0), 0),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((v) => {
      if (filterStatus && v.status !== filterStatus) return false;
      if (filterType && v.type !== filterType) return false;
      if (filterRegion && v.region !== filterRegion) return false;
      if (q) {
        const hay = [v.registrationNo, v.model, v.manufacturer, v.type, v.region, v.fuelType, v.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterType, filterRegion, query]);

  async function load() {
    try {
      setItems(await api<Vehicle[]>("/api/vehicles"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vehicles");
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
    setSuccess("");
    const ml = Number(maxLoad);
    if (!Number.isFinite(ml) || ml <= 0) {
      setError("Max load must be greater than 0 kg.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          registrationNo: reg.trim(),
          model: model.trim(),
          manufacturer: manufacturer.trim() || null,
          type,
          fuelType,
          region,
          maxLoad: ml,
          odometer: odometer === "" ? 0 : Number(odometer),
          acquisitionCost: acquisitionCost === "" ? 0 : Number(acquisitionCost),
        }),
      });
      setReg("");
      setModel("");
      setManufacturer("");
      setMaxLoad("");
      setOdometer("");
      setAcquisitionCost("");
      setSuccess("Vehicle registered.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(v: Vehicle) {
    setEditId(v.id);
    setEditForm({
      model: v.model,
      maxLoad: String(v.maxLoad),
      odometer: String(v.odometer),
      region: v.region || "North",
      fuelType: v.fuelType || "Diesel",
      acquisitionCost: String(v.acquisitionCost ?? 0),
    });
    setError("");
    setSuccess("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api(`/api/vehicles/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          model: editForm.model.trim(),
          maxLoad: Number(editForm.maxLoad),
          odometer: Number(editForm.odometer),
          region: editForm.region,
          fuelType: editForm.fuelType,
          acquisitionCost: Number(editForm.acquisitionCost),
        }),
      });
      setSuccess("Vehicle updated.");
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: "Available" | "Retired") {
    setError("");
    setSuccess("");
    try {
      await api(`/api/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setSuccess(status === "Retired" ? "Vehicle marked Retired." : "Vehicle set Available.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status change failed");
    }
  }

  async function removeVehicle(id: string) {
    if (!confirm("Remove this vehicle? If it has history it will be Retired instead.")) return;
    setError("");
    setSuccess("");
    try {
      const res = await api<{ retired?: boolean; message?: string } | undefined>(
        `/api/vehicles/${id}`,
        { method: "DELETE" },
      );
      if (res && typeof res === "object" && res.retired) {
        setSuccess(res.message || "Vehicle retired (has history).");
      } else {
        setSuccess("Vehicle removed.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Registry aligned to schema: type, region, fuel, load, odometer, acquisition cost, status."
      />
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Fleet", value: stats.total, sub: formatInr(stats.fleetValue) },
              { label: "Available", value: stats.available, sub: "Ready" },
              { label: "On trip", value: stats.onTrip, sub: "Dispatched" },
              { label: "In shop", value: stats.inShop, sub: "Maintenance" },
              { label: "Retired", value: stats.retired, sub: "Out of service" },
            ].map((c) => (
              <div key={c.label} className="card-elevated rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <IconTruck className="h-3.5 w-3.5" />
                  {c.label}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{c.value}</div>
                <div className="text-[11px] text-slate-400">{c.sub}</div>
              </div>
            ))}
          </div>

          {canCreate && (
            <Panel className="mb-6" title="Register vehicle" description="Unique registration · Available by default">
              <form
                onSubmit={onCreate}
                className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
              >
                <div>
                  <Label>Registration No *</Label>
                  <input
                    className="input-field font-mono"
                    value={reg}
                    onChange={(e) => setReg(e.target.value)}
                    required
                    placeholder="e.g. MH-12-AB-1234"
                  />
                </div>
                <div>
                  <Label>Model *</Label>
                  <input
                    className="input-field"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    placeholder="e.g. Tata Ace"
                  />
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <input
                    className="input-field"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Fuel type</Label>
                  <select
                    className="input-field"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                  >
                    {FUEL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Region</Label>
                  <select className="input-field" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Max load (kg) *</Label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Odometer (km)</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Acquisition cost (₹)</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary h-[42px]" disabled={saving}>
                  {saving ? "Saving…" : "Add vehicle"}
                </button>
              </form>
            </Panel>
          )}

          {editId && canManage && (
            <Panel className="mb-6" title="Edit vehicle" description="Odometer cannot decrease · status rules on server">
              <form onSubmit={saveEdit} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Model</Label>
                  <input
                    className="input-field"
                    value={editForm.model}
                    onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Max load (kg)</Label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={editForm.maxLoad}
                    onChange={(e) => setEditForm((f) => ({ ...f, maxLoad: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Odometer (km)</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editForm.odometer}
                    onChange={(e) => setEditForm((f) => ({ ...f, odometer: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <select
                    className="input-field"
                    value={editForm.region}
                    onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}
                  >
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Fuel</Label>
                  <select
                    className="input-field"
                    value={editForm.fuelType}
                    onChange={(e) => setEditForm((f) => ({ ...f, fuelType: e.target.value }))}
                  >
                    {FUEL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Acquisition (₹)</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editForm.acquisitionCost}
                    onChange={(e) => setEditForm((f) => ({ ...f, acquisitionCost: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    Save changes
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </Panel>
          )}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 rounded-t-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Fleet list</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing {filtered.length} of {items.length}
                </p>
              </div>
              {(filterStatus || filterType || filterRegion || query) && (
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => {
                    setFilterStatus("");
                    setFilterType("");
                    setFilterRegion("");
                    setQuery("");
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!filterStatus} onClick={() => setFilterStatus("")}>
                    All
                  </Chip>
                  {STATUSES.map((s) => (
                    <Chip
                      key={s}
                      active={filterStatus === s}
                      onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Type</Label>
                  <select
                    className="input-field"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All types</option>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Region</Label>
                  <select
                    className="input-field"
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                  >
                    <option value="">All regions</option>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Search</Label>
                  <input
                    className="input-field"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Reg. no, model, fuel…"
                  />
                </div>
              </div>
            </div>
          </div>

          <Panel>
            {filtered.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? "No vehicles yet" : "No matches"}
                hint={items.length === 0 ? "Register a vehicle to start the fleet." : "Clear filters."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Reg. No</th>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Fuel</th>
                      <th>Region</th>
                      <th>Max load</th>
                      <th>Odometer</th>
                      <th>Acq. cost</th>
                      <th>Status</th>
                      {(canManage || canDelete) && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => (
                      <tr key={v.id}>
                        <td className="font-semibold font-mono text-xs">{v.registrationNo}</td>
                        <td>
                          <div className="text-sm font-medium text-slate-900">{v.model}</div>
                          {v.manufacturer ? (
                            <div className="text-[11px] text-slate-400">{v.manufacturer}</div>
                          ) : null}
                        </td>
                        <td>{v.type}</td>
                        <td className="text-xs text-slate-600">{v.fuelType || "—"}</td>
                        <td>{v.region || "—"}</td>
                        <td className="tabular-nums">{v.maxLoad} kg</td>
                        <td className="tabular-nums">{v.odometer} km</td>
                        <td className="tabular-nums whitespace-nowrap">{formatInr(v.acquisitionCost)}</td>
                        <td>
                          <StatusBadge status={v.status} />
                        </td>
                        {(canManage || canDelete) && (
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              {canManage && (
                                <button
                                  type="button"
                                  className="btn-ghost text-xs"
                                  onClick={() => startEdit(v)}
                                >
                                  Edit
                                </button>
                              )}
                              {canManage && v.status === "Available" && (
                                <button
                                  type="button"
                                  className="btn-ghost text-xs"
                                  onClick={() => setStatus(v.id, "Retired")}
                                >
                                  Retire
                                </button>
                              )}
                              {canManage && v.status === "Retired" && (
                                <button
                                  type="button"
                                  className="btn-ghost btn-success text-xs"
                                  onClick={() => setStatus(v.id, "Available")}
                                >
                                  Reactivate
                                </button>
                              )}
                              {canDelete && v.status !== "OnTrip" && v.status !== "InShop" && (
                                <button
                                  type="button"
                                  className="btn-ghost btn-danger text-xs"
                                  onClick={() => removeVehicle(v.id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
