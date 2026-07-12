import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconRoute } from "../components/Icons";
import { VehicleSearchSelect } from "../components/VehicleSearchSelect";

type Vehicle = {
  id: string;
  registrationNo: string;
  maxLoad: number;
  status: string;
  odometer?: number;
  type?: string;
  region?: string;
  model?: string;
};

type Driver = {
  id: string;
  name: string;
  status: string;
  licenseExpiry?: string;
  licenseNo?: string;
};

type Trip = {
  id: string;
  tripCode?: string;
  origin: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  distanceKm?: number | null;
  revenue?: number;
  priority?: string;
  notes?: string | null;
  status: string;
  scheduledAt?: string;
  completedAt?: string | null;
  vehicle?: Vehicle;
  driver?: Driver;
};

const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
const STATUS_TABS = ["all", "Draft", "Dispatched", "Completed", "Cancelled"] as const;

function licenseValid(expiry?: string) {
  if (!expiry) return true;
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
}

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

export function TripsPage() {
  const canOps = hasRole("DISPATCHER", "FLEET_MANAGER");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [plannedRevenue, setPlannedRevenue] = useState("");

  const [completeId, setCompleteId] = useState<string | null>(null);
  const [actualDistance, setActualDistance] = useState("");
  const [revenue, setRevenue] = useState("0");
  const [finalOdo, setFinalOdo] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("all");
  const [query, setQuery] = useState("");

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles],
  );
  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === "Available" && licenseValid(d.licenseExpiry)),
    [drivers],
  );

  const selectedVehicle = availableVehicles.find((v) => v.id === vehicleId);
  const cargoNum = Number(cargoWeight);
  const cargoOk =
    selectedVehicle && Number.isFinite(cargoNum) ? cargoNum <= selectedVehicle.maxLoad : true;

  const stats = useMemo(() => {
    return {
      draft: trips.filter((t) => t.status === "Draft").length,
      dispatched: trips.filter((t) => t.status === "Dispatched").length,
      completed: trips.filter((t) => t.status === "Completed").length,
      cancelled: trips.filter((t) => t.status === "Cancelled").length,
      revenue: trips
        .filter((t) => t.status === "Completed")
        .reduce((s, t) => s + Number(t.revenue || 0), 0),
    };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        t.tripCode,
        t.origin,
        t.destination,
        t.vehicle?.registrationNo,
        t.driver?.name,
        t.priority,
        t.status,
        t.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trips, statusFilter, query]);

  async function load() {
    try {
      const [t, v, d] = await Promise.all([
        api<Trip[]>("/api/trips"),
        api<Vehicle[]>("/api/vehicles"),
        api<Driver[]>("/api/drivers"),
      ]);
      setTrips(t);
      setVehicles(v);
      setDrivers(d);
      const av = v.filter((x) => x.status === "Available");
      const ad = d.filter((x) => x.status === "Available" && licenseValid(x.licenseExpiry));
      setVehicleId((prev) => (prev && av.some((x) => x.id === prev) ? prev : av[0]?.id || ""));
      setDriverId((prev) => (prev && ad.some((x) => x.id === prev) ? prev : ad[0]?.id || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trips");
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
    setMsg("");
    if (!canOps) {
      setError("Only Dispatcher or Fleet Manager can create trips.");
      return;
    }
    if (!vehicleId || !driverId) {
      setError("Select an available vehicle and driver.");
      return;
    }
    if (!cargoOk) {
      setError(
        `Cargo ${cargoNum} kg exceeds max load ${selectedVehicle?.maxLoad} kg for this vehicle.`,
      );
      return;
    }
    try {
      await api("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          cargoWeight: Number(cargoWeight),
          plannedDistance: Number(plannedDistance),
          vehicleId,
          driverId,
          priority,
          notes: notes.trim() || undefined,
          revenue: plannedRevenue !== "" ? Number(plannedRevenue) : undefined,
        }),
      });
      setMsg("Draft trip created. Dispatch when ready.");
      setOrigin("");
      setDestination("");
      setCargoWeight("");
      setPlannedDistance("");
      setNotes("");
      setPlannedRevenue("");
      setPriority("Medium");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    }
  }

  async function action(id: string, path: string, body?: object) {
    setError("");
    setMsg("");
    setBusyId(id);
    try {
      await api(`/api/trips/${id}/${path}`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      });
      setMsg(
        path === "dispatch"
          ? "Dispatched — vehicle & driver are now On Trip."
          : path === "complete"
            ? "Completed — vehicle & driver restored to Available."
            : path === "cancel"
              ? "Cancelled — assets restored if trip was dispatched."
              : `Trip ${path} OK`,
      );
      setCompleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function openComplete(t: Trip) {
    setCompleteId(t.id);
    setActualDistance(String(t.plannedDistance || ""));
    setRevenue(String(t.revenue ?? 0));
    setFinalOdo(String(t.vehicle?.odometer ?? ""));
    setFuelLiters("");
    setFuelCost("");
    setError("");
    setMsg("");
  }

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle="Draft → Dispatch → Complete/Cancel · cargo ≤ max load · license & status rules on server."
      />
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Draft", value: stats.draft },
              { label: "Dispatched", value: stats.dispatched },
              { label: "Completed", value: stats.completed },
              { label: "Cancelled", value: stats.cancelled },
              { label: "Revenue", value: formatInr(stats.revenue), isMoney: true },
            ].map((c) => (
              <div key={c.label} className="card-elevated rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <IconRoute className="h-3.5 w-3.5" />
                  {c.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{c.value}</div>
              </div>
            ))}
          </div>

          {canOps && (
            <Panel
              className="mb-6"
              title="New trip"
              description="Only Available vehicles (not Retired/In Shop/On Trip) and Available drivers with valid licenses"
            >
              <form onSubmit={onCreate} className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Source *</Label>
                  <input
                    className="input-field"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                    placeholder="Origin city / depot"
                  />
                </div>
                <div>
                  <Label>Destination *</Label>
                  <input
                    className="input-field"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    placeholder="Destination"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <select
                    className="input-field"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Cargo weight (kg) *</Label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    className={`input-field ${!cargoOk ? "border-rose-400 ring-1 ring-rose-200" : ""}`}
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    required
                  />
                  {selectedVehicle && (
                    <p
                      className={`mt-1 text-[11px] ${cargoOk ? "text-slate-400" : "text-rose-600 font-medium"}`}
                    >
                      Max load for {selectedVehicle.registrationNo}: {selectedVehicle.maxLoad} kg
                      {!cargoOk && " — cargo exceeds capacity"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Planned distance (km) *</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Expected revenue (₹)</Label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={plannedRevenue}
                    onChange={(e) => setPlannedRevenue(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <VehicleSearchSelect
                    vehicles={availableVehicles}
                    value={vehicleId}
                    onChange={setVehicleId}
                    label="Available vehicle *"
                    required
                    placeholder="Search Available vehicles…"
                    hint="Retired, In Shop, and On Trip are hidden"
                  />
                </div>
                <div>
                  <Label>Available driver *</Label>
                  <select
                    className="input-field"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    required
                  >
                    {availableDrivers.length === 0 && (
                      <option value="">No Available drivers</option>
                    )}
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.licenseNo ? ` · ${d.licenseNo}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Suspended, Off Duty, On Trip, expired license hidden
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label>Notes</Label>
                  <input
                    className="input-field"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional dispatch notes"
                  />
                </div>
                <div className="flex items-end md:col-span-2 lg:col-span-3">
                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto"
                    disabled={!vehicleId || !driverId || !cargoOk}
                  >
                    <IconRoute className="h-4 w-4" />
                    Create draft
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {!canOps && (
            <Alert type="info">
              You can view trips. Sign in as <strong>dispatch@demo.com</strong> or{" "}
              <strong>fleet@demo.com</strong> to create, dispatch, complete, or cancel.
            </Alert>
          )}

          {completeId && canOps && (
            <Panel
              className="mb-6"
              title="Complete trip"
              description="Final odometer + optional fuel log · vehicle & driver → Available"
            >
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Actual distance (km)</Label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={actualDistance}
                    onChange={(e) => setActualDistance(e.target.value)}
                    placeholder="Defaults to planned"
                  />
                </div>
                <div>
                  <Label>Final odometer (km)</Label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={finalOdo}
                    onChange={(e) => setFinalOdo(e.target.value)}
                    placeholder="Updates vehicle odometer"
                  />
                </div>
                <div>
                  <Label>Fuel consumed (L)</Label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step="any"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    placeholder="Creates fuel log"
                  />
                </div>
                <div>
                  <Label>Fuel cost (₹)</Label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step="any"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Revenue (₹)</Label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busyId === completeId}
                    onClick={() =>
                      action(completeId, "complete", {
                        distanceKm: actualDistance ? Number(actualDistance) : undefined,
                        revenue: Number(revenue) || 0,
                        odometer: finalOdo !== "" ? Number(finalOdo) : undefined,
                        fuelLiters: fuelLiters !== "" ? Number(fuelLiters) : undefined,
                        fuelCost: fuelCost !== "" ? Number(fuelCost) : undefined,
                      })
                    }
                  >
                    {busyId === completeId ? "Saving…" : "Confirm complete"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setCompleteId(null)}>
                    Back
                  </button>
                </div>
              </div>
            </Panel>
          )}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 rounded-t-2xl">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Trip board</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredTrips.length} of {trips.length} trips
                </p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  className="input-field"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search code, route, vehicle, driver…"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {STATUS_TABS.map((s) => (
                <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s === "all" ? "All" : s}
                </Chip>
              ))}
            </div>
          </div>

          <Panel>
            {filteredTrips.length === 0 ? (
              <EmptyState
                title={trips.length === 0 ? "No trips yet" : "No matches"}
                hint={
                  trips.length === 0
                    ? "Create a draft with Available assets."
                    : "Try another status or search."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Route</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Cargo</th>
                      <th>Km</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.map((t) => (
                      <tr key={t.id}>
                        <td className="font-mono text-[11px] font-semibold text-slate-700">
                          {t.tripCode || t.id.slice(0, 8)}
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900">
                            {t.origin} → {t.destination}
                          </div>
                          {t.notes ? (
                            <div className="text-[11px] text-slate-400 line-clamp-1">{t.notes}</div>
                          ) : null}
                        </td>
                        <td className="font-mono text-xs">
                          {t.vehicle?.registrationNo}
                          {t.vehicle?.status && t.status === "Dispatched" && (
                            <span className="block text-[10px] text-slate-400">
                              {t.vehicle.status}
                            </span>
                          )}
                        </td>
                        <td>
                          {t.driver?.name}
                          {t.driver?.status && t.status === "Dispatched" && (
                            <span className="block text-[10px] text-slate-400">
                              {t.driver.status}
                            </span>
                          )}
                        </td>
                        <td className="tabular-nums whitespace-nowrap">{t.cargoWeight} kg</td>
                        <td className="tabular-nums whitespace-nowrap">
                          {t.distanceKm != null ? t.distanceKm : t.plannedDistance} km
                        </td>
                        <td>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {t.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {canOps && t.status === "Draft" && (
                              <>
                                <button
                                  type="button"
                                  className="btn-ghost btn-success text-xs"
                                  disabled={busyId === t.id}
                                  onClick={() => action(t.id, "dispatch")}
                                >
                                  Dispatch
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost btn-danger text-xs"
                                  disabled={busyId === t.id}
                                  onClick={() => action(t.id, "cancel")}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {canOps && t.status === "Dispatched" && (
                              <>
                                <button
                                  type="button"
                                  className="btn-ghost btn-success text-xs"
                                  onClick={() => openComplete(t)}
                                >
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost btn-danger text-xs"
                                  disabled={busyId === t.id}
                                  onClick={() => action(t.id, "cancel")}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {t.status === "Completed" && (
                              <span className="text-[11px] text-slate-400">
                                {formatInr(Number(t.revenue || 0))}
                              </span>
                            )}
                          </div>
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
