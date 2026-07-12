import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_URL, getToken } from "../lib/api";
import { Alert, LoadingBlock, PageHeader, Panel } from "../components/ui";

type VehicleRow = {
  registrationNo: string;
  model: string;
  type: string;
  region: string;
  acquisitionCost: number;
  fuelCost: number;
  maintenanceCost: number;
  operationalCost: number;
  totalDistance: number;
  totalFuelLiters: number;
  fuelEfficiency: number | null;
  revenue: number;
  roi: number | null;
  roiPercent: number | null;
};

type Summary = {
  fleet: {
    totalVehicles: number;
    fleetUtilizationPercent: number;
    totalOperationalCost: number;
    avgFuelEfficiency: number | null;
  };
  vehicles: VehicleRow[];
};

export function ReportsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api<Summary>("/api/reports/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  async function downloadCsv() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/reports/export.csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transitops-vehicle-report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports & analytics"
        subtitle="Fuel efficiency, utilization, operational cost (fuel + maintenance), vehicle ROI, CSV export."
        action={
          <button type="button" className="btn-primary" onClick={downloadCsv} disabled={exporting}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <LoadingBlock />}

      {data && (
        <>
          <div className="mb-6 grid sm:grid-cols-3 gap-4">
            <div className="card-elevated rounded-2xl p-5">
              <div className="text-xs text-slate-500 font-semibold uppercase">Fleet utilization</div>
              <div className="text-3xl font-bold mt-1">{data.fleet.fleetUtilizationPercent}%</div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total operational cost</div>
              <div className="text-3xl font-bold mt-1">
                ₹{Number(data.fleet.totalOperationalCost).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-1">Fuel + maintenance</div>
            </div>
            <div className="card-elevated rounded-2xl p-5">
              <div className="text-xs text-slate-500 font-semibold uppercase">Avg fuel efficiency</div>
              <div className="text-3xl font-bold mt-1">
                {data.fleet.avgFuelEfficiency != null
                  ? `${data.fleet.avgFuelEfficiency.toFixed(2)} km/L`
                  : "—"}
              </div>
            </div>
          </div>

          <Panel title="Per-vehicle costs & ROI" description="ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost">
            <div className="overflow-x-auto">
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Region</th>
                    <th>Fuel ₹</th>
                    <th>Maint ₹</th>
                    <th>Ops cost ₹</th>
                    <th>Distance</th>
                    <th>Efficiency</th>
                    <th>Revenue ₹</th>
                    <th>ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.map((v) => (
                    <tr key={v.registrationNo}>
                      <td className="font-mono font-semibold">{v.registrationNo}</td>
                      <td>{v.type}</td>
                      <td>{v.region}</td>
                      <td>₹{Number(v.fuelCost).toFixed(0)}</td>
                      <td>₹{Number(v.maintenanceCost).toFixed(0)}</td>
                      <td className="font-semibold">₹{Number(v.operationalCost).toFixed(0)}</td>
                      <td>{Number(v.totalDistance).toFixed(0)} km</td>
                      <td>
                        {v.fuelEfficiency != null ? `${v.fuelEfficiency.toFixed(2)} km/L` : "—"}
                      </td>
                      <td>₹{Number(v.revenue).toFixed(0)}</td>
                      <td>
                        {v.roiPercent != null ? (
                          <span
                            className={
                              v.roiPercent >= 0 ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"
                            }
                          >
                            {v.roiPercent.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <p className="mt-4 text-sm text-slate-500">
            Log fuel and maintenance on{" "}
            <Link to="/expenses" className="text-indigo-600 font-medium">
              Fuel & Expenses
            </Link>{" "}
            and{" "}
            <Link to="/maintenance" className="text-indigo-600 font-medium">
              Maintenance
            </Link>
            . Complete trips with revenue to populate ROI.
          </p>
        </>
      )}
    </div>
  );
}
