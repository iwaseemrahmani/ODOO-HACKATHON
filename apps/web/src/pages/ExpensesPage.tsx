import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Alert, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconFuel } from "../components/Icons";
import { VehicleSearchSelect, type VehicleOption } from "../components/VehicleSearchSelect";
import { StatusBadge } from "../components/StatusBadge";

type Vehicle = VehicleOption & {
  model: string;
  type: string;
  region: string;
  status: string;
  odometer: number;
};

type Fuel = {
  id: string;
  liters: number;
  cost: number;
  date: string;
  odometer: number | null;
  vehicle?: Vehicle;
};

type Expense = {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string | null;
  vehicle?: Vehicle | null;
};

type ReportSummary = {
  vehicles: {
    registrationNo: string;
    operationalCost: number;
    fuelCost: number;
    maintenanceCost: number;
  }[];
};

/** Matches Prisma ExpenseCategory (+ a few UI aliases mapped server-side) */
const EXPENSE_TYPES = [
  "Toll",
  "Maintenance",
  "Fuel",
  "DriverAllowance",
  "Fine",
  "Repair",
  "Other",
  "Parking",
  "Insurance",
];

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ExpensesPage() {
  const [fuel, setFuel] = useState<Fuel[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);

  const [fuelVehicleId, setFuelVehicleId] = useState("");
  const [expVehicleId, setExpVehicleId] = useState("");
  const [historyVehicleId, setHistoryVehicleId] = useState("");
  const [chipType, setChipType] = useState("");
  const [chipRegion, setChipRegion] = useState("");
  const [historyTab, setHistoryTab] = useState<"all" | "fuel" | "expense">("all");

  const [liters, setLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelDate, setFuelDate] = useState(todayInputValue());
  const [fuelOdo, setFuelOdo] = useState("");

  const [expType, setExpType] = useState("Toll");
  const [amount, setAmount] = useState("");
  const [expDate, setExpDate] = useState(todayInputValue());
  const [expDesc, setExpDesc] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFuel, setSavingFuel] = useState(false);
  const [savingExp, setSavingExp] = useState(false);

  const fuelVehicle = vehicles.find((v) => v.id === fuelVehicleId);
  const historyVehicle = vehicles.find((v) => v.id === historyVehicleId) ?? null;

  const types = useMemo(
    () => [...new Set(vehicles.map((v) => v.type).filter(Boolean))].sort(),
    [vehicles]
  );
  const regions = useMemo(
    () => [...new Set(vehicles.map((v) => v.region).filter(Boolean))].sort(),
    [vehicles]
  );

  const fleetForPicker = useMemo(() => {
    return vehicles.filter((v) => {
      if (chipType && v.type !== chipType) return false;
      if (chipRegion && v.region !== chipRegion) return false;
      return true;
    });
  }, [vehicles, chipType, chipRegion]);

  async function load() {
    try {
      const [f, e, v] = await Promise.all([
        api<Fuel[]>("/api/fuel"),
        api<Expense[]>("/api/expenses"),
        api<Vehicle[]>("/api/vehicles"),
      ]);
      setFuel(f);
      setExpenses(e);
      setVehicles(v);
      try {
        setReport(await api<ReportSummary>("/api/reports/summary"));
      } catch {
        setReport(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (fuelVehicle) setFuelOdo(String(fuelVehicle.odometer ?? ""));
  }, [fuelVehicleId]);

  const filteredFuel = useMemo(() => {
    if (!historyVehicleId) return fuel;
    return fuel.filter((f) => f.vehicle?.id === historyVehicleId);
  }, [fuel, historyVehicleId]);

  const filteredExpenses = useMemo(() => {
    if (!historyVehicleId) return expenses;
    return expenses.filter((x) => x.vehicle?.id === historyVehicleId);
  }, [expenses, historyVehicleId]);

  const fuelTotal = filteredFuel.reduce((s, f) => s + Number(f.cost), 0);
  const expTotal = filteredExpenses.reduce((s, x) => s + Number(x.amount), 0);

  const selectedOps = useMemo(() => {
    if (!historyVehicle || !report) return null;
    return (
      report.vehicles.find((r) => r.registrationNo === historyVehicle.registrationNo) ?? null
    );
  }, [historyVehicle, report]);

  type HistoryRow = {
    id: string;
    kind: "fuel" | "expense";
    title: string;
    meta: string;
    amount: number;
    date: string;
  };

  const historyRows: HistoryRow[] = useMemo(() => {
    const rows: HistoryRow[] = [];
    if (historyTab === "all" || historyTab === "fuel") {
      for (const f of filteredFuel) {
        rows.push({
          id: `f-${f.id}`,
          kind: "fuel",
          title: `Fuel · ${f.vehicle?.registrationNo ?? "—"}`,
          meta: `${f.liters}L${f.odometer != null ? ` · ${f.odometer} km` : ""}${
            f.vehicle?.region ? ` · ${f.vehicle.region}` : ""
          }`,
          amount: Number(f.cost),
          date: f.date,
        });
      }
    }
    if (historyTab === "all" || historyTab === "expense") {
      for (const x of filteredExpenses) {
        rows.push({
          id: `e-${x.id}`,
          kind: "expense",
          title: `${x.type}${x.vehicle ? ` · ${x.vehicle.registrationNo}` : " · general"}`,
          meta: x.description || (x.vehicle?.type ? `${x.vehicle.type}` : "Expense"),
          amount: Number(x.amount),
          date: x.date,
        });
      }
    }
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [filteredFuel, filteredExpenses, historyTab]);

  async function addFuel(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!fuelVehicleId) {
      setError("Select a vehicle for the fuel log (search by reg. no, type, or region).");
      return;
    }
    const L = Number(liters);
    const C = Number(fuelCost);
    if (!Number.isFinite(L) || L <= 0) {
      setError("Liters must be greater than 0.");
      return;
    }
    if (!Number.isFinite(C) || C < 0) {
      setError("Fuel cost must be 0 or greater.");
      return;
    }
    setSavingFuel(true);
    try {
      await api("/api/fuel", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: fuelVehicleId,
          liters: L,
          cost: C,
          date: fuelDate || undefined,
          odometer: fuelOdo !== "" ? Number(fuelOdo) : undefined,
        }),
      });
      setSuccess("Fuel log saved.");
      setLiters("");
      setFuelCost("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save fuel");
    } finally {
      setSavingFuel(false);
    }
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const A = Number(amount);
    if (!expType.trim()) {
      setError("Expense type is required.");
      return;
    }
    if (!Number.isFinite(A) || A <= 0) {
      setError("Expense amount must be greater than 0.");
      return;
    }
    if (expType === "Maintenance" && !expVehicleId) {
      setError("Maintenance expenses must be linked to a vehicle.");
      return;
    }
    setSavingExp(true);
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: expVehicleId || null,
          type: expType,
          amount: A,
          date: expDate || undefined,
          description: expDesc || null,
        }),
      });
      setSuccess("Expense saved.");
      setAmount("");
      setExpDesc("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSavingExp(false);
    }
  }

  function clearHistoryFilter() {
    setHistoryVehicleId("");
    setChipType("");
    setChipRegion("");
  }

  return (
    <div>
      <PageHeader
        title="Fuel & expenses"
        subtitle="Search the fleet, log fuel and costs in ₹, then review history for any vehicle."
      />
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          {/* KPI strip */}
          <div className="mb-5 grid sm:grid-cols-3 gap-3">
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                <IconFuel className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Fuel {historyVehicleId ? "· filtered" : "· all"}
                </div>
                <div className="text-xl font-bold text-slate-900">₹{fuelTotal.toFixed(0)}</div>
                <div className="text-[11px] text-slate-400">{filteredFuel.length} logs</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold">
                ₹
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Expenses {historyVehicleId ? "· filtered" : "· all"}
                </div>
                <div className="text-xl font-bold text-slate-900">₹{expTotal.toFixed(0)}</div>
                <div className="text-[11px] text-slate-400">{filteredExpenses.length} entries</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ops cost (Fuel + Maint)
              </div>
              {selectedOps ? (
                <>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    ₹{Number(selectedOps.operationalCost).toFixed(0)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Fuel ₹{Number(selectedOps.fuelCost).toFixed(0)} · Maint ₹
                    {Number(selectedOps.maintenanceCost).toFixed(0)}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Select a vehicle below to see per-vehicle cost, or open{" "}
                  <Link to="/reports" className="text-indigo-600 font-semibold">
                    Reports
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>

          {/* History filter — overflow visible so dropdown is not clipped */}
          <div className="relative z-20 mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Fleet history filter</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Filter by type or region, then search registration number
                </p>
              </div>
              {(historyVehicleId || chipType || chipRegion) && (
                <button type="button" className="btn-ghost shrink-0 text-xs" onClick={clearHistoryFilter}>
                  Reset filters
                </button>
              )}
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!chipType} onClick={() => setChipType("")}>
                      All
                    </Chip>
                    {types.map((t) => (
                      <Chip
                        key={t}
                        active={chipType === t}
                        onClick={() => setChipType(t === chipType ? "" : t)}
                      >
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Region
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!chipRegion} onClick={() => setChipRegion("")}>
                      All
                    </Chip>
                    {regions.map((r) => (
                      <Chip
                        key={r}
                        active={chipRegion === r}
                        onClick={() => setChipRegion(r === chipRegion ? "" : r)}
                      >
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative z-30 w-full max-w-lg">
                <VehicleSearchSelect
                  vehicles={fleetForPicker}
                  value={historyVehicleId}
                  onChange={setHistoryVehicleId}
                  label="Search vehicle"
                  allowEmpty
                  emptyLabel="All vehicles in scope"
                  compact
                  placeholder={
                    chipType || chipRegion
                      ? `Search within ${[chipType, chipRegion].filter(Boolean).join(" · ")}…`
                      : "Search registration, model, type, region…"
                  }
                />
                {(chipType || chipRegion) && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Showing {fleetForPicker.length} of {vehicles.length} vehicles
                    {chipType ? ` · type ${chipType}` : ""}
                    {chipRegion ? ` · region ${chipRegion}` : ""}
                  </p>
                )}
              </div>

              {historyVehicle && (
                <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                    {historyVehicle.registrationNo.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {historyVehicle.registrationNo}
                      </span>
                      <StatusBadge status={historyVehicle.status} />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {historyVehicle.model} · {historyVehicle.type} · {historyVehicle.region} ·{" "}
                      {historyVehicle.odometer} km
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <div className="text-slate-400">Fuel</div>
                      <div className="font-semibold text-slate-800">{filteredFuel.length}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Expenses</div>
                      <div className="font-semibold text-slate-800">{filteredExpenses.length}</div>
                    </div>
                    {selectedOps && (
                      <div>
                        <div className="text-slate-400">Ops cost</div>
                        <div className="font-semibold text-indigo-700">
                          ₹{Number(selectedOps.operationalCost).toFixed(0)}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setHistoryVehicleId("")}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Forms */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Panel title="Log fuel" description="Vehicle required · liters, cost, date">
              <form onSubmit={addFuel} className="p-5 space-y-3">
                <VehicleSearchSelect
                  vehicles={vehicles.filter((v) => v.status !== "Retired")}
                  value={fuelVehicleId}
                  onChange={(id) => {
                    setFuelVehicleId(id);
                    const v = vehicles.find((x) => x.id === id);
                    if (v) setFuelOdo(String(v.odometer ?? ""));
                  }}
                  required
                  hint="Search registration, model, type, or region"
                />
                {fuelVehicle?.status === "InShop" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Vehicle is In Shop — fuel can still be logged if needed.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Liters *</Label>
                    <input type="number" min="0.01" step="any" className="input-field" value={liters} onChange={(e) => setLiters(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Cost (₹) *</Label>
                    <input type="number" min="0" step="any" className="input-field" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <input type="date" className="input-field" value={fuelDate} max={todayInputValue()} onChange={(e) => setFuelDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Odometer (km)</Label>
                    <input type="number" min="0" className="input-field" value={fuelOdo} onChange={(e) => setFuelOdo(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={savingFuel || !fuelVehicleId}>
                  {savingFuel ? "Saving…" : "Save fuel log"}
                </button>
              </form>
            </Panel>

            <Panel title="Log expense" description="Tolls, maintenance, parking…">
              <form onSubmit={addExpense} className="p-5 space-y-3">
                <VehicleSearchSelect
                  vehicles={vehicles.filter((v) => v.status !== "Retired")}
                  value={expVehicleId}
                  onChange={setExpVehicleId}
                  allowEmpty
                  emptyLabel="No vehicle (general expense)"
                  required={expType === "Maintenance"}
                  hint={
                    expType === "Maintenance"
                      ? "Maintenance must be linked to a vehicle"
                      : "Optional — attach for per-vehicle cost"
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type *</Label>
                    <select className="input-field" value={expType} onChange={(e) => setExpType(e.target.value)}>
                      {EXPENSE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Amount (₹) *</Label>
                    <input type="number" min="0.01" step="any" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <input type="date" className="input-field" value={expDate} max={todayInputValue()} onChange={(e) => setExpDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Note</Label>
                    <input className="input-field" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={savingExp}>
                  {savingExp ? "Saving…" : "Save expense"}
                </button>
              </form>
            </Panel>
          </div>

          {/* Unified history */}
          <Panel
            title="Activity history"
            description={
              historyVehicle
                ? `Showing ${historyVehicle.registrationNo}`
                : chipType || chipRegion
                  ? "All vehicles in current type/region scope"
                  : "All fleet activity"
            }
          >
            <div className="px-4 pt-3 flex flex-wrap gap-2 border-b border-slate-100">
              {(
                [
                  ["all", "All"],
                  ["fuel", "Fuel only"],
                  ["expense", "Expenses only"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHistoryTab(id)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    historyTab === id
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {historyRows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No activity{historyVehicle ? ` for ${historyVehicle.registrationNo}` : ""} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Kind</th>
                      <th>Detail</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.slice(0, 50).map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-slate-500 text-xs">
                          {new Date(row.date).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              row.kind === "fuel"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-violet-50 text-violet-700"
                            }`}
                          >
                            {row.kind}
                          </span>
                        </td>
                        <td>
                          <div className="font-medium text-slate-900 text-sm">{row.title}</div>
                          <div className="text-[11px] text-slate-400">{row.meta}</div>
                        </td>
                        <td className="text-right font-semibold text-slate-900">
                          ₹{row.amount.toFixed(0)}
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
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
