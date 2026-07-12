import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconTruck, IconWrench } from "../components/Icons";
import { VehicleSearchSelect, type VehicleOption } from "../components/VehicleSearchSelect";

type Vehicle = VehicleOption & {
  model: string;
  type: string;
  region: string;
  status: string;
  odometer: number;
};

type MaintRecord = {
  id: string;
  description: string;
  cost: number;
  status: string;
  maintenanceType?: string;
  openedAt?: string;
  closedAt?: string | null;
  vehicle?: Vehicle;
};

const MAINT_TYPES = ["Service", "Repair", "Inspection", "OilChange", "TireChange"] as const;
const STATUS_FILTERS = ["all", "open", "Closed"] as const;

function formatInr(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function typeLabel(t?: string) {
  if (!t) return "Service";
  return t.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function isOpenStatus(status: string) {
  return status !== "Closed";
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

export function MaintenancePage() {
  const canManage = hasRole("FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER");

  const [items, setItems] = useState<MaintRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [maintType, setMaintType] = useState<string>("Service");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [filterType, setFilterType] = useState("");
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const available = vehicles.filter((v) => v.status === "Available").length;
    const inShop = vehicles.filter((v) => v.status === "InShop").length;
    const openJobs = items.filter((i) => isOpenStatus(i.status)).length;
    const closedJobs = items.filter((i) => i.status === "Closed").length;
    const openCost = items
      .filter((i) => isOpenStatus(i.status))
      .reduce((s, i) => s + Number(i.cost || 0), 0);
    const totalCost = items.reduce((s, i) => s + Number(i.cost || 0), 0);
    return { available, inShop, openJobs, closedJobs, openCost, totalCost };
  }, [vehicles, items]);

  const openable = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles],
  );

  const openJobs = useMemo(
    () => items.filter((i) => isOpenStatus(i.status)),
    [items],
  );

  const filteredLog = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (filterStatus === "open" && !isOpenStatus(r.status)) return false;
      if (filterStatus === "Closed" && r.status !== "Closed") return false;
      if (filterType && (r.maintenanceType || "Service") !== filterType) return false;
      if (filterVehicleId && r.vehicle?.id !== filterVehicleId) return false;
      if (q) {
        const hay = [
          r.vehicle?.registrationNo,
          r.description,
          r.maintenanceType,
          r.status,
          r.vehicle?.region,
          r.vehicle?.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterType, filterVehicleId, query]);

  const filteredCost = useMemo(
    () => filteredLog.reduce((s, r) => s + Number(r.cost || 0), 0),
    [filteredLog],
  );

  async function load() {
    try {
      const [m, v] = await Promise.all([
        api<MaintRecord[]>("/api/maintenance"),
        api<Vehicle[]>("/api/vehicles"),
      ]);
      setItems(m);
      setVehicles(v);
      setVehicleId((prev) => {
        const open = v.filter((x) => x.status === "Available");
        if (prev && open.some((x) => x.id === prev)) return prev;
        return open[0]?.id || "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load maintenance");
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
    setSuccess("");
    if (!canManage) {
      setError("Your role cannot open maintenance jobs. Use fleet@demo.com (Fleet Manager), dispatch@demo.com, or safety@demo.com.");
      return;
    }
    if (!vehicleId) {
      setError("Select an Available vehicle to open a shop job.");
      return;
    }
    if (!description.trim()) {
      setError("Describe the work required.");
      return;
    }
    const costNum = cost === "" ? 0 : Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError("Cost must be 0 or greater.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          description: description.trim(),
          cost: costNum,
          maintenanceType: maintType,
        }),
      });
      setSuccess("Job opened — vehicle set to In Shop.");
      setDescription("");
      setCost("");
      setMaintType("Service");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open job");
    } finally {
      setSaving(false);
    }
  }

  async function onClose(id: string) {
    setError("");
    setSuccess("");
    setClosingId(id);
    try {
      await api(`/api/maintenance/${id}/close`, { method: "POST", body: "{}" });
      setSuccess("Job closed — vehicle restored to Available.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close job");
    } finally {
      setClosingId(null);
    }
  }

  function clearFilters() {
    setFilterStatus("all");
    setFilterType("");
    setFilterVehicleId("");
    setQuery("");
  }

  const filtersActive =
    filterStatus !== "all" || Boolean(filterType) || Boolean(filterVehicleId) || Boolean(query.trim());

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Open shop jobs (Available → In Shop), track costs in ₹, and close when work is done."
        action={
          <Link to="/vehicles" className="btn-ghost">
            <IconTruck className="h-4 w-4" />
            Vehicles
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          {/* KPI strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <IconTruck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Available
                </div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.available}</div>
                <div className="text-[11px] text-slate-400">Ready for service</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <IconWrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  In shop
                </div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.inShop}</div>
                <div className="text-[11px] text-slate-400">{stats.openJobs} open jobs</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-sm font-bold">
                ₹
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Open job cost
                </div>
                <div className="text-xl font-bold tabular-nums text-slate-900">
                  {formatInr(stats.openCost)}
                </div>
                <div className="text-[11px] text-slate-400">Active work</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-sm font-bold">
                Σ
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Lifetime spend
                </div>
                <div className="text-xl font-bold tabular-nums text-slate-900">
                  {formatInr(stats.totalCost)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stats.closedJobs} closed · {items.length} total
                </div>
              </div>
            </div>
          </div>

          {/* Open form + active jobs */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Panel
              title="Open shop job"
              description="Only Available vehicles · sets status to In Shop"
            >
              {!canManage ? (
                <div className="p-5">
                  <Alert type="info">
                    Your account can view the log but not open or close jobs. Sign in as{" "}
                    <strong>fleet@demo.com</strong>, <strong>dispatch@demo.com</strong>, or{" "}
                    <strong>safety@demo.com</strong> (password: password123).
                  </Alert>
                </div>
              ) : (
              <form onSubmit={onOpen} className="p-5 space-y-4">
                <VehicleSearchSelect
                  vehicles={openable}
                  value={vehicleId}
                  onChange={setVehicleId}
                  label="Vehicle"
                  required
                  placeholder="Search Available vehicles…"
                  hint={
                    openable.length === 0
                      ? "No Available vehicles — finish trips or close existing shop jobs first."
                      : `${openable.length} vehicle${openable.length === 1 ? "" : "s"} available`
                  }
                />

                <div>
                  <Label>Work type</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {MAINT_TYPES.map((t) => (
                      <Chip
                        key={t}
                        active={maintType === t}
                        onClick={() => setMaintType(t)}
                      >
                        {typeLabel(t)}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Work description</Label>
                  <textarea
                    className="input-field min-h-[88px] resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="e.g. Brake pads + rotor inspection, front axle"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Estimated cost (₹)</Label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input-field"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={!vehicleId || saving || openable.length === 0}
                >
                  <IconWrench className="h-4 w-4" />
                  {saving ? "Opening…" : "Open job"}
                </button>
              </form>
              )}
            </Panel>

            <Panel
              title="Active jobs"
              description="Close when work is complete · vehicle returns to Available"
            >
              {openJobs.length === 0 ? (
                <EmptyState
                  title="No open jobs"
                  hint="Open a job when a vehicle needs service or repair."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {openJobs.map((r) => (
                    <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/10">
                          <IconWrench className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {r.vehicle?.registrationNo ?? "—"}
                            </span>
                            <StatusBadge status={r.status} />
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {typeLabel(r.maintenanceType)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 line-clamp-2">{r.description}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Opened {formatDate(r.openedAt)}
                            {r.vehicle?.region ? ` · ${r.vehicle.region}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 sm:flex-col sm:items-end">
                        <span className="text-sm font-bold tabular-nums text-slate-900">
                          {formatInr(r.cost)}
                        </span>
                        {canManage && (
                        <button
                          type="button"
                          className="btn-success"
                          disabled={closingId === r.id}
                          onClick={() => onClose(r.id)}
                        >
                          {closingId === r.id ? "Closing…" : "Close job"}
                        </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Filters + full log */}
          <div className="relative z-20 mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Maintenance log</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Filter by status, work type, or vehicle · search description and reg. no
                </p>
              </div>
              {filtersActive && (
                <button type="button" className="btn-ghost shrink-0 text-xs" onClick={clearFilters}>
                  Reset filters
                </button>
              )}
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>
                      All
                    </Chip>
                    <Chip active={filterStatus === "open"} onClick={() => setFilterStatus("open")}>
                      Open
                    </Chip>
                    <Chip
                      active={filterStatus === "Closed"}
                      onClick={() => setFilterStatus("Closed")}
                    >
                      Closed
                    </Chip>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Work type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!filterType} onClick={() => setFilterType("")}>
                      All
                    </Chip>
                    {MAINT_TYPES.map((t) => (
                      <Chip
                        key={t}
                        active={filterType === t}
                        onClick={() => setFilterType(filterType === t ? "" : t)}
                      >
                        {typeLabel(t)}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Search</Label>
                  <input
                    className="input-field"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Reg. no, description, type…"
                  />
                </div>
                <VehicleSearchSelect
                  vehicles={vehicles}
                  value={filterVehicleId}
                  onChange={setFilterVehicleId}
                  label="Filter by vehicle"
                  allowEmpty
                  emptyLabel="All vehicles"
                  compact
                  placeholder="Search fleet…"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs">
                <div>
                  <span className="text-slate-400">Showing </span>
                  <span className="font-semibold text-slate-800">{filteredLog.length}</span>
                  <span className="text-slate-400"> of {items.length}</span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400">Cost in view </span>
                  <span className="font-semibold text-indigo-700">{formatInr(filteredCost)}</span>
                </div>
              </div>
            </div>
          </div>

          <Panel>
            {filteredLog.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? "No maintenance records" : "No matches"}
                hint={
                  items.length === 0
                    ? "Open a shop job to start the log."
                    : "Try clearing filters or a broader search."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Cost</th>
                      <th>Opened</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLog.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="font-mono text-xs font-semibold text-slate-900">
                            {r.vehicle?.registrationNo || "—"}
                          </div>
                          {r.vehicle?.region ? (
                            <div className="text-[11px] text-slate-400">{r.vehicle.region}</div>
                          ) : null}
                        </td>
                        <td>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {typeLabel(r.maintenanceType)}
                          </span>
                        </td>
                        <td className="max-w-[220px]">
                          <span className="line-clamp-2 text-sm text-slate-700">{r.description}</span>
                        </td>
                        <td className="font-semibold tabular-nums whitespace-nowrap">
                          {formatInr(r.cost)}
                        </td>
                        <td className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(r.openedAt)}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="text-right">
                          {canManage && isOpenStatus(r.status) && (
                            <button
                              type="button"
                              className="btn-ghost btn-success text-xs"
                              disabled={closingId === r.id}
                              onClick={() => onClose(r.id)}
                            >
                              {closingId === r.id ? "…" : "Close"}
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
        </>
      )}
    </div>
  );
}
