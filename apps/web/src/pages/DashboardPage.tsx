import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, Panel, Alert, LoadingBlock } from "../components/ui";
import {
  IconChart,
  IconFuel,
  IconRoute,
  IconTruck,
  IconUsers,
  IconWrench,
} from "../components/Icons";

type Kpis = {
  totalVehicles: number;
  availableVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  completedTrips: number;
  totalDrivers: number;
  driversOnDuty: number;
  openMaintenance: number;
  fleetUtilizationPercent: number;
  fuelCostThisMonth: number;
  fuelLitersThisMonth: number;
  expensesThisMonth: number;
};

const cardMeta: {
  key: keyof Kpis;
  label: string;
  format?: (v: number) => string;
  icon: typeof IconTruck;
  tone: string;
}[] = [
  { key: "totalVehicles", label: "Total vehicles", icon: IconTruck, tone: "from-indigo-500 to-violet-600" },
  { key: "availableVehicles", label: "Available", icon: IconTruck, tone: "from-emerald-500 to-teal-600" },
  { key: "activeVehicles", label: "On trip", icon: IconRoute, tone: "from-sky-500 to-blue-600" },
  { key: "vehiclesInMaintenance", label: "In shop", icon: IconWrench, tone: "from-amber-500 to-orange-600" },
  { key: "activeTrips", label: "Active trips", icon: IconRoute, tone: "from-indigo-500 to-blue-600" },
  { key: "pendingTrips", label: "Pending drafts", icon: IconChart, tone: "from-slate-500 to-slate-700" },
  { key: "driversOnDuty", label: "Drivers on duty", icon: IconUsers, tone: "from-violet-500 to-purple-600" },
  {
    key: "fleetUtilizationPercent",
    label: "Fleet utilization",
    format: (v) => `${v}%`,
    icon: IconChart,
    tone: "from-cyan-500 to-sky-600",
  },
  {
    key: "fuelCostThisMonth",
    label: "Fuel cost (month)",
    format: (v) => `₹${Number(v).toFixed(0)}`,
    icon: IconFuel,
    tone: "from-rose-500 to-pink-600",
  },
  {
    key: "expensesThisMonth",
    label: "Expenses (month)",
    format: (v) => `₹${Number(v).toFixed(0)}`,
    icon: IconFuel,
    tone: "from-fuchsia-500 to-purple-600",
  },
];

export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Kpis>("/api/dashboard/kpis")
      .then(setKpis)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Command center"
        subtitle="Live fleet KPIs, utilization, and cost signals for the month."
        action={
          <Link to="/trips" className="btn-primary">
            <IconRoute className="w-4 h-4" />
            Open trips
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {!kpis && !error && <LoadingBlock />}

      {kpis && (
        <>
          {/* Hero strip */}
          <div className="mb-6 grid gap-4 lg:grid-cols-3 animate-fade-up">
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-900/10 overflow-hidden relative">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                  Fleet pulse
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-6">
                  <div>
                    <div className="text-4xl font-bold tracking-tight">
                      {kpis.fleetUtilizationPercent}%
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Utilization</div>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block" />
                  <div>
                    <div className="text-2xl font-bold">{kpis.activeTrips}</div>
                    <div className="text-sm text-slate-400 mt-1">Active trips</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.availableVehicles}</div>
                    <div className="text-sm text-slate-400 mt-1">Ready vehicles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpis.openMaintenance}</div>
                    <div className="text-sm text-slate-400 mt-1">Open shop jobs</div>
                  </div>
                </div>
                <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, kpis.fleetUtilizationPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl card-elevated p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  This month
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  ₹{Number(kpis.fuelCostThisMonth + kpis.expensesThisMonth).toFixed(0)}
                </p>
                <p className="text-sm text-slate-500 mt-1">Fuel + other expenses</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-400 text-xs">Fuel</div>
                  <div className="font-semibold text-slate-800">
                    ₹{Number(kpis.fuelCostThisMonth).toFixed(0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-400 text-xs">Other</div>
                  <div className="font-semibold text-slate-800">
                    ₹{Number(kpis.expensesThisMonth).toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {cardMeta.map((c, i) => {
              const Icon = c.icon;
              const raw = Number(kpis[c.key] ?? 0);
              const value = c.format ? c.format(raw) : String(raw);
              return (
                <div
                  key={c.key}
                  className={`card-elevated rounded-2xl p-4 animate-fade-up stagger-${(i % 4) + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-md`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                    {value}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { to: "/trips", title: "Dispatch a trip", desc: "Create draft → validate → go" },
              { to: "/vehicles", title: "Fleet registry", desc: "Status, capacity, load limits" },
              { to: "/maintenance", title: "Shop floor", desc: "Open / close maintenance" },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="card-elevated rounded-2xl p-5 transition hover:-translate-y-0.5 hover:ring-1 hover:ring-indigo-200"
              >
                <div className="text-sm font-semibold text-slate-900">{q.title}</div>
                <div className="text-xs text-slate-500 mt-1">{q.desc}</div>
                <div className="mt-3 text-xs font-semibold text-indigo-600">Open →</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
