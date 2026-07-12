import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  IconChart,
  IconFuel,
  IconRoute,
  IconSpark,
  IconTruck,
  IconUsers,
} from "../components/Icons";
import { Alert, LoadingBlock, PageHeader, Panel } from "../components/ui";

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

const trends = [
  { label: "Trip completion", value: "+12%", positive: true },
  { label: "Avg trip duration", value: "-8 min", positive: true },
  { label: "Fuel efficiency", value: "+3.2 km/L", positive: true },
  { label: "Maintenance cost", value: "+5%", positive: false },
  { label: "On-time delivery", value: "94%", positive: true },
  { label: "Driver utilization", value: "78%", positive: true },
];

const recentActivity = [
  { time: "10 min ago", event: "Trip #T-1042 completed", detail: "Chennai → Bangalore" },
  { time: "32 min ago", event: "Vehicle TN-01-AB-1234 entered shop", detail: "Scheduled brake service" },
  { time: "1 hr ago", event: "New driver onboarded", detail: "Ravi Kumar — License DL-8821" },
  { time: "2 hr ago", event: "Fuel refill logged", detail: "45 L · ₹3,825" },
  { time: "3 hr ago", event: "Expense report filed", detail: "Toll & parking — ₹1,200" },
];

const monthlyStats = [
  { month: "Jan", trips: 42, cost: 180000 },
  { month: "Feb", trips: 38, cost: 165000 },
  { month: "Mar", trips: 51, cost: 210000 },
  { month: "Apr", trips: 47, cost: 195000 },
  { month: "May", trips: 55, cost: 230000 },
  { month: "Jun", trips: 44, cost: 188000 },
];

export function AnalyticsPage() {
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
        title="Analytics"
        subtitle="Performance metrics, trends, and operational insights."
      />

      {error && <Alert type="error">{error}</Alert>}

      {!kpis && !error && <LoadingBlock />}

      {kpis && (
        <>
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
            <div className="card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <IconRoute className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{kpis.completedTrips}</div>
                  <div className="text-xs text-slate-500">Trips completed</div>
                </div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                  <IconTruck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{kpis.activeVehicles}</div>
                  <div className="text-xs text-slate-500">Active vehicles</div>
                </div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                  <IconUsers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{kpis.driversOnDuty}</div>
                  <div className="text-xs text-slate-500">Drivers on duty</div>
                </div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                  <IconFuel className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{kpis.fuelLitersThisMonth}</div>
                  <div className="text-xs text-slate-500">Liters (month)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3 animate-fade-up stagger-2">
            <Panel title="Trend summary" className="lg:col-span-2">
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {trends.map((t) => (
                    <div key={t.label} className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">{t.label}</div>
                      <div className={`mt-1 text-lg font-bold ${t.positive ? "text-emerald-700" : "text-rose-700"}`}>
                        {t.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Monthly trend" description="Trips & cost (6 months)">
              <div className="p-5 space-y-3">
                {monthlyStats.map((m) => (
                  <div key={m.month}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{m.month}</span>
                      <span className="text-slate-400">{m.trips} trips</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all"
                        style={{ width: `${(m.trips / 60) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      ₹{(m.cost / 1000).toFixed(0)}k
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 animate-fade-up stagger-3">
            <Panel title="Utilization breakdown">
              <div className="p-5 space-y-5">
                {[
                  { label: "Fleet utilization", value: kpis.fleetUtilizationPercent, color: "bg-indigo-500" },
                  { label: "Vehicles on trip", value: Math.round((kpis.activeVehicles / Math.max(kpis.totalVehicles, 1)) * 100), color: "bg-sky-500" },
                  { label: "Drivers on duty", value: Math.round((kpis.driversOnDuty / Math.max(kpis.totalDrivers, 1)) * 100), color: "bg-violet-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent activity">
              <div className="divide-y divide-slate-100">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="flex h-2 w-2 mt-1.5 shrink-0">
                      <span className="absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">{a.event}</div>
                      <div className="text-xs text-slate-500">{a.detail}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
