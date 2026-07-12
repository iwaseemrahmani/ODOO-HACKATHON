import { useEffect, useState } from "react";
import { api } from "../lib/api";

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

export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Kpis>("/api/dashboard/kpis")
      .then(setKpis)
      .catch((e) => setError(e.message));
  }, []);

  const cards = kpis
    ? [
        { label: "Total vehicles", value: kpis.totalVehicles },
        { label: "Available", value: kpis.availableVehicles },
        { label: "On trip", value: kpis.activeVehicles },
        { label: "In shop", value: kpis.vehiclesInMaintenance },
        { label: "Active trips", value: kpis.activeTrips },
        { label: "Pending (draft)", value: kpis.pendingTrips },
        { label: "Drivers on duty", value: kpis.driversOnDuty },
        { label: "Fleet utilization", value: `${kpis.fleetUtilizationPercent}%` },
        { label: "Fuel cost (month)", value: `₹${Number(kpis.fuelCostThisMonth).toFixed(0)}` },
        { label: "Expenses (month)", value: `₹${Number(kpis.expensesThisMonth).toFixed(0)}` },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-500 text-sm mt-1 mb-6">Live operational KPIs</p>
      {error && <p className="text-rose-600 mb-4">{error}</p>}
      {!kpis && !error && <p className="text-slate-500">Loading…</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
              {c.label}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
