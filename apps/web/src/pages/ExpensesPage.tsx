import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";

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

  async function load() {
    const [f, e, v] = await Promise.all([
      api<Fuel[]>("/api/fuel"),
      api<Expense[]>("/api/expenses"),
      api<Vehicle[]>("/api/vehicles"),
    ]);
    setFuel(f);
    setExpenses(e);
    setVehicles(v);
    if (!vehicleId && v[0]) setVehicleId(v[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Fuel & Expenses</h1>
      <p className="text-slate-500 text-sm mb-6">Operational costs</p>
      {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-3">Add fuel log</h2>
          <form onSubmit={addFuel} className="bg-white border rounded-xl p-4 space-y-3 shadow-sm">
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              placeholder="Liters"
            />
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost"
            />
            <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">
              Save fuel
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {fuel.slice(0, 8).map((f) => (
              <li key={f.id} className="bg-white border rounded-lg px-3 py-2">
                {f.vehicle?.registrationNo}: {f.liters}L · ₹{f.cost}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Add expense</h2>
          <form
            onSubmit={addExpense}
            className="bg-white border rounded-xl p-4 space-y-3 shadow-sm"
          >
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNo}
                </option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={expType}
              onChange={(e) => setExpType(e.target.value)}
            />
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">
              Save expense
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {expenses.slice(0, 8).map((x) => (
              <li key={x.id} className="bg-white border rounded-lg px-3 py-2">
                {x.type}: ₹{x.amount} {x.vehicle ? `(${x.vehicle.registrationNo})` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
