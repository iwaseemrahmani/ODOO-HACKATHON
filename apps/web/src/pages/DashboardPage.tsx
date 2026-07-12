import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader, Panel, Alert, LoadingBlock, Label } from "../components/ui";
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
  { key: "activeVehicles", label: "Active (on trip)", icon: IconRoute, tone: "from-sky-500 to-blue-600" },
  { key: "vehiclesInMaintenance", label: "In maintenance", icon: IconWrench, tone: "from-amber-500 to-orange-600" },
  { key: "activeTrips", label: "Active trips", icon: IconRoute, tone: "from-indigo-500 to-blue-600" },
  { key: "pendingTrips", label: "Pending trips", icon: IconChart, tone: "from-slate-500 to-slate-700" },
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
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");

  async function load(filters?: { type: string; status: string; region: string }) {
    setError("");
    const f = filters ?? { type, status, region };
    const q = new URLSearchParams();
    if (f.type) q.set("type", f.type);
    if (f.status) q.set("status", f.status);
    if (f.region) q.set("region", f.region);
    const qs = q.toString();
    try {
      setKpis(await api<Kpis>(`/api/dashboard/kpis${qs ? `?${qs}` : ""}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load({ type: "", status: "", region: "" });
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

  return (
    <div>
      <PageHeader
        title="Command center"
        subtitle="KPIs with filters by vehicle type, status, and region."
        action={
          <Link to="/trips" className="btn-primary">
            <IconRoute className="w-4 h-4" />
            Open trips
          </Link>
        }
      />

      <Panel className="mb-6" title="Filters" description="Vehicle type · status · region">
        <form onSubmit={onFilter} className="p-5 flex flex-wrap gap-4 items-end">
          <div>
            <Label>Type</Label>
            <select className="input-field min-w-[140px]" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
              <option value="Bus">Bus</option>
              <option value="Car">Car</option>
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select className="input-field min-w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Available">Available</option>
              <option value="OnTrip">On Trip</option>
              <option value="InShop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          <div>
            <Label>Region</Label>
            <select className="input-field min-w-[140px]" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Apply
          </button>
          <button type="button" className="btn-ghost" onClick={onClear}>
            Clear
          </button>
        </form>
      </Panel>

      {error && <Alert type="error">{error}</Alert>}
      {!kpis && !error && <LoadingBlock />}

      {kpis && (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Fleet pulse</p>
              <div className="mt-3 flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-4xl font-bold">{kpis.fleetUtilizationPercent}%</div>
                  <div className="text-sm text-slate-400 mt-1">Utilization</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.activeTrips}</div>
                  <div className="text-sm text-slate-400 mt-1">Active trips</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.availableVehicles}</div>
                  <div className="text-sm text-slate-400 mt-1">Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.vehiclesInMaintenance}</div>
                  <div className="text-sm text-slate-400 mt-1">In shop</div>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-400"
                  style={{ width: `${Math.min(100, kpis.fleetUtilizationPercent)}%` }}
                />
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">This month</p>
              <p className="mt-3 text-3xl font-bold">
                ₹{Number(kpis.fuelCostThisMonth + kpis.expensesThisMonth).toFixed(0)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Fuel + expenses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {cardMeta.map((c) => {
              const Icon = c.icon;
              const raw = Number(kpis[c.key] ?? 0);
              const value = c.format ? c.format(raw) : String(raw);
              return (
                <div key={c.key} className="card-elevated rounded-2xl p-4">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
