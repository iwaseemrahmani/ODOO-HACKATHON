import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Alert, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconFuel } from "../components/Icons";

type Vehicle = { id: string; registrationNo: string };
type Fuel = { id: string; liters: number; cost: number; date: string; vehicle?: Vehicle };
type Expense = {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string | null;
  vehicle?: Vehicle | null;
};

export function ExpensesPage() {
  const [fuel, setFuel] = useState<Fuel[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [liters, setLiters] = useState("40");
  const [cost, setCost] = useState("60");
  const [expType, setExpType] = useState("Toll");
  const [amount, setAmount] = useState("15");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      if (!vehicleId && v[0]) setVehicleId(v[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addFuel(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/fuel", {
        method: "POST",
        body: JSON.stringify({ vehicleId, liters: Number(liters), cost: Number(cost) }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          type: expType,
          amount: Number(amount),
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  const fuelTotal = fuel.reduce((s, f) => s + Number(f.cost), 0);
  const expTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div>
      <PageHeader
        title="Fuel & expenses"
        subtitle="Track operational spend in ₹. Per-vehicle Fuel + Maintenance totals are on Reports."
      />
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-6 grid sm:grid-cols-2 gap-4 animate-fade-up">
            <div className="card-elevated rounded-2xl p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25">
                <IconFuel className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fuel total</div>
                <div className="text-2xl font-bold text-slate-900">₹{fuelTotal.toFixed(0)}</div>
              </div>
            </div>
            <div className="card-elevated rounded-2xl p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                <span className="text-lg font-bold">₹</span>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Other expenses</div>
                <div className="text-2xl font-bold text-slate-900">₹{expTotal.toFixed(0)}</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Panel className="animate-fade-up" title="Log fuel" description="Liters & cost per vehicle">
              <form onSubmit={addFuel} className="p-5 space-y-3">
                <div>
                  <Label>Vehicle</Label>
                  <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Liters</Label>
                    <input type="number" className="input-field" value={liters} onChange={(e) => setLiters(e.target.value)} />
                  </div>
                  <div>
                    <Label>Cost (₹)</Label>
                    <input type="number" className="input-field" value={cost} onChange={(e) => setCost(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Save fuel log
                </button>
              </form>
              <ul className="border-t border-slate-100 divide-y divide-slate-50 max-h-64 overflow-auto">
                {fuel.slice(0, 10).map((f) => (
                  <li key={f.id} className="px-5 py-3 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {f.vehicle?.registrationNo}
                      <span className="text-slate-400 font-normal"> · {f.liters}L</span>
                    </span>
                    <span className="font-semibold text-slate-900">₹{f.cost}</span>
                  </li>
                ))}
                {fuel.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-slate-400">No fuel logs yet</li>
                )}
              </ul>
            </Panel>

            <Panel className="animate-fade-up stagger-2" title="Log expense" description="Tolls, fees, misc">
              <form onSubmit={addExpense} className="p-5 space-y-3">
                <div>
                  <Label>Vehicle</Label>
                  <select className="input-field" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <input className="input-field" value={expType} onChange={(e) => setExpType(e.target.value)} />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Save expense
                </button>
              </form>
              <ul className="border-t border-slate-100 divide-y divide-slate-50 max-h-64 overflow-auto">
                {expenses.slice(0, 10).map((x) => (
                  <li key={x.id} className="px-5 py-3 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {x.type}
                      {x.vehicle && (
                        <span className="text-slate-400 font-normal"> · {x.vehicle.registrationNo}</span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">₹{x.amount}</span>
                  </li>
                ))}
                {expenses.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-slate-400">No expenses yet</li>
                )}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
