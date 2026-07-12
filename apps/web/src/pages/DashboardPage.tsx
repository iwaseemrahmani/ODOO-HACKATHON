import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Alert, LoadingBlock } from "../components/ui";
import {
  IconChart,
  IconRoute,
  IconTruck,
  IconUsers,
  IconWrench,
} from "../components/Icons";

type Kpis = {
  availableVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilizationPercent: number;
  totalVehicles?: number;
  completedTrips?: number;
};

type VehicleRow = { region?: string };

const VEHICLE_TYPES = ["Van", "Truck", "MiniTruck", "Trailer"] as const;

export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");

  async function load(f: { type: string; status: string; region: string }) {
    setError("");
    setLoading(true);
    const q = new URLSearchParams();
    if (f.type) q.set("type", f.type);
    if (f.status) q.set("status", f.status);
    if (f.region) q.set("region", f.region);
    const qs = q.toString();
    try {
      setKpis(await api<Kpis>(`/api/dashboard/kpis${qs ? `?${qs}` : ""}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ type: "", status: "", region: "" });
    api<VehicleRow[]>("/api/vehicles")
      .then((list) => {
        setRegions(
          [...new Set(list.map((v) => v.region).filter((r): r is string => Boolean(r?.trim())))].sort()
        );
      })
      .catch(() => setRegions([]));
  }, []);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    load({ type, status, region });
  }

  function onClear() {
    setType("");
    setStatus("");
    setRegion("");
    load({ type: "", status: "", region: "" });
  }

  const filterActive = Boolean(type || status || region);

  const util = kpis?.fleetUtilizationPercent ?? 0;
  const utilClamped = Math.min(100, Math.max(0, util));

  const cards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: "Active vehicles",
        value: kpis.activeVehicles,
        sub: "On trip",
        icon: IconTruck,
        color: "text-sky-600",
        bg: "bg-sky-50",
        ring: "ring-sky-100",
      },
      {
        label: "Available vehicles",
        value: kpis.availableVehicles,
        sub: "Ready to dispatch",
        icon: IconTruck,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        ring: "ring-emerald-100",
      },
      {
        label: "In maintenance",
        value: kpis.vehiclesInMaintenance,
        sub: "In shop",
        icon: IconWrench,
        color: "text-amber-600",
        bg: "bg-amber-50",
        ring: "ring-amber-100",
      },
      {
        label: "Active trips",
        value: kpis.activeTrips,
        sub: "Dispatched",
        icon: IconRoute,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        ring: "ring-indigo-100",
      },
      {
        label: "Pending trips",
        value: kpis.pendingTrips,
        sub: "Draft",
        icon: IconChart,
        color: "text-slate-600",
        bg: "bg-slate-100",
        ring: "ring-slate-200",
      },
      {
        label: "Drivers on duty",
        value: kpis.driversOnDuty,
        sub: "On trip",
        icon: IconUsers,
        color: "text-violet-600",
        bg: "bg-violet-50",
        ring: "ring-violet-100",
      },
    ];
  }, [kpis]);

  return (
    <div className="space-y-6 pb-2">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.75rem]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live fleet KPIs · type, status & region filters below
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/vehicles" className="btn-ghost">
            Vehicles
          </Link>
          <Link to="/trips" className="btn-primary">
            <IconRoute className="h-4 w-4" />
            Trips
          </Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {loading && !kpis && <LoadingBlock />}

      {kpis && (
        <>
          {/* Utilization banner */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid sm:grid-cols-[1fr_auto] gap-0">
              <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                    Fleet utilization
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
                      {utilClamped}%
                    </span>
                    <span className="text-sm text-slate-400">
                      of vehicles on trip
                      {kpis.totalVehicles != null ? ` (${kpis.totalVehicles} total)` : ""}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-700"
                    style={{ width: `${utilClamped}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone="sky">{kpis.activeVehicles} on trip</Pill>
                  <Pill tone="emerald">{kpis.availableVehicles} available</Pill>
                  <Pill tone="amber">{kpis.vehiclesInMaintenance} in shop</Pill>
                  <Pill tone="indigo">{kpis.activeTrips} active trips</Pill>
                  <Pill tone="slate">{kpis.pendingTrips} pending</Pill>
                  <Pill tone="violet">{kpis.driversOnDuty} drivers on duty</Pill>
                </div>
              </div>
              <div className="flex items-center justify-center border-t border-slate-100 bg-slate-50/80 px-8 py-6 sm:border-l sm:border-t-0">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                    <IconChart className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-600">Live metrics</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Updated from API</p>
                </div>
              </div>
            </div>
          </section>

          {/* KPI grid — 6 mandatory + utilization already above */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Key performance indicators</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className={`flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ${c.ring}`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {c.label}
                      </p>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                        {c.value}
                      </p>
                      <p className="text-xs text-slate-500">{c.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {kpis.totalVehicles === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No vehicles yet</p>
              <p className="mt-1 text-xs text-slate-500">Register vehicles to populate KPIs.</p>
              <Link to="/vehicles" className="btn-primary mt-4 inline-flex">
                Vehicle registry
              </Link>
            </div>
          )}
        </>
      )}

      {/* Single filter section — bottom */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={onFilter} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Filter KPIs</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                By vehicle type, status, and region
              </p>
            </div>
            <div className="flex gap-2">
              {filterActive && (
                <button type="button" className="btn-ghost" onClick={onClear}>
                  Clear
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Loading…" : "Apply"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <select
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All types</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Available">Available</option>
                <option value="OnTrip">On Trip</option>
                <option value="InShop">In Shop</option>
                <option value="Retired">Retired</option>
              </select>
            </Field>
            <Field label="Region">
              <select
                className="input-field"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">All regions</option>
                {(regions.length
                  ? regions
                  : ["North", "South", "East", "West"]
                ).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Pill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "sky" | "emerald" | "amber" | "indigo" | "slate" | "violet";
}) {
  const map = {
    sky: "bg-sky-50 text-sky-800 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-900 ring-amber-100",
    indigo: "bg-indigo-50 text-indigo-800 ring-indigo-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-800 ring-violet-100",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${map[tone]}`}
    >
      {children}
    </span>
  );
}
