import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";

type Driver = {
  id: string;
  name: string;
  licenseNo: string;
  licenseExpiry: string;
  phone: string | null;
  status: string;
};

export function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("2028-12-31");
  const canCreate = hasRole("FLEET_MANAGER", "SAFETY_OFFICER", "DISPATCHER");

  async function load() {
    try {
      setItems(await api<Driver[]>("/api/drivers"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/drivers", {
        method: "POST",
        body: JSON.stringify({ name, licenseNo, licenseExpiry }),
      });
      setName("");
      setLicenseNo("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Drivers</h1>
      <p className="text-slate-500 text-sm mb-6">Licenses & availability</p>
      {error && <p className="text-rose-600 mb-4 text-sm">{error}</p>}

      {canCreate && (
        <form
          onSubmit={onCreate}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end shadow-sm"
        >
          <div>
            <label className="text-xs text-slate-500">Name</label>
            <input
              className="block border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">License No</label>
            <input
              className="block border rounded-lg px-3 py-2 text-sm"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Expiry</label>
            <input
              type="date"
              className="block border rounded-lg px-3 py-2 text-sm"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Add driver
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">License</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3">{d.licenseNo}</td>
                <td className="p-3">{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                <td className="p-3">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
