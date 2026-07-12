import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  IconChart,
  IconFuel,
  IconRoute,
  IconTruck,
  IconUsers,
} from "../components/Icons";
import { Alert, EmptyState, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";

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

type Trip = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  cargoWeight: number;
  plannedDistance: number;
  completedAt?: string | null;
  createdAt: string;
  vehicle?: { registrationNo: string };
  driver?: { name: string };
};

type ReportSummary = {
  fleet: {
    totalVehicles: number;
    fleetUtilizationPercent: number;
    totalOperationalCost: number;
    avgFuelEfficiency: number | null;
  };
  vehicles: {
    registrationNo: string;
    operationalCost: number;
    fuelEfficiency: number | null;
    roiPercent: number | null;
  }[];
};

export function AnalyticsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Kpis>("/api/dashboard/kpis"),
      api<Trip[]>("/api/trips"),
      api<ReportSummary>("/api/reports/summary").catch(() => null),
    ])
      .then(([k, t, r]) => {
        setKpis(k);
        setTrips(t);
        setReport(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const recentTrips = useMemo(() => {
    return [...trips]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8);
  }, [trips]);

  const completionRate = useMemo(() => {
    if (!kpis) return null;
    const done = kpis.completedTrips;
    const total = done + kpis.activeTrips + kpis.pendingTrips;
    if (total === 0) return null;
    return Math.round((done / total) * 100);
  }, [kpis]);

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Live metrics from your fleet data — nothing is pre-filled."
        action={
          <Link to="/reports" className="btn-primary">
            Full reports
          </Link>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {!kpis && !error && <EmptyState title="No data yet" hint="Register vehicles and run trips." />}

      {kpis && (
        <>
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={<IconTruck className="w-4 h-4" />}
              label="Vehicles"
              value={String(kpis.totalVehicles)}
              sub={`${kpis.availableVehicles} available`}
            />
            <Stat
              icon={<IconRoute className="w-4 h-4" />}
              label="Active trips"
              value={String(kpis.activeTrips)}
              sub={`${kpis.pendingTrips} draft`}
            />
            <Stat
              icon={<IconUsers className="w-4 h-4" />}
              label="Drivers on duty"
              value={String(kpis.driversOnDuty)}
              sub={`${kpis.totalDrivers} total`}
            />
            <Stat
              icon={<IconChart className="w-4 h-4" />}
              label="Utilization"
              value={`${kpis.fleetUtilizationPercent}%`}
              sub={
                completionRate != null
                  ? `${completionRate}% trips completed (of open pipeline)`
                  : "No trips yet"
              }
            />
          </div>

          <div className="mb-6 grid sm:grid-cols-3 gap-4">
            <div className="card-elevated rounded-2xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                <IconFuel className="w-4 h-4" /> Fuel this month
              </div>
              <div className="mt-2 text-2xl font-bold">
                ₹{Number(kpis.fuelCostThisMonth).toFixed(0)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {Number(kpis.fuelLitersThisMonth).toFixed(1)} L
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase text-slate-500">Expenses this month</div>
              <div className="mt-2 text-2xl font-bold">
                ₹{Number(kpis.expensesThisMonth).toFixed(0)}
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Ops cost (all-time fuel+maint)
              </div>
              <div className="mt-2 text-2xl font-bold">
                {report
                  ? `₹${Number(report.fleet.totalOperationalCost).toFixed(0)}`
                  : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Avg efficiency:{" "}
                {report?.fleet.avgFuelEfficiency != null
                  ? `${report.fleet.avgFuelEfficiency.toFixed(2)} km/L`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Recent trips" description="From your database">
              {recentTrips.length === 0 ? (
                <EmptyState title="No trips yet" hint="Create and dispatch trips to see activity." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentTrips.map((t) => (
                    <li key={t.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {t.origin} → {t.destination}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.vehicle?.registrationNo ?? "—"} · {t.driver?.name ?? "—"} ·{" "}
                          {t.cargoWeight} kg · {t.plannedDistance} km
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Vehicle snapshot" description="Top by operational cost">
              {!report || report.vehicles.length === 0 ? (
                <EmptyState title="No vehicle cost data" hint="Add vehicles, fuel, and maintenance." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-shell">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Ops cost</th>
                        <th>Efficiency</th>
                        <th>ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.vehicles]
                        .sort((a, b) => b.operationalCost - a.operationalCost)
                        .slice(0, 8)
                        .map((v) => (
                          <tr key={v.registrationNo}>
                            <td className="font-mono font-semibold">{v.registrationNo}</td>
                            <td>₹{Number(v.operationalCost).toFixed(0)}</td>
                            <td>
                              {v.fuelEfficiency != null
                                ? `${v.fuelEfficiency.toFixed(2)} km/L`
                                : "—"}
                            </td>
                            <td>
                              {v.roiPercent != null ? `${v.roiPercent.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: import("react").ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}
