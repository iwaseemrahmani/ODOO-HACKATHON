import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

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
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("2028-12-31");
  const canCreate = hasRole("FLEET_MANAGER", "SAFETY_OFFICER", "DISPATCHER");

  async function load() {
    try {
      setItems(await api<Driver[]>("/api/drivers"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
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

  function expiryTone(date: string) {
    const days = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days < 0) return "text-rose-600 font-semibold";
    if (days < 60) return "text-amber-600 font-medium";
    return "text-slate-600";
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Licenses, expiry risk, and assignment readiness for dispatch."
      />
      {error && <Alert type="error">{error}</Alert>}

      {canCreate && (
        <Panel className="mb-6 animate-fade-up" title="Add driver" description="Safety & fleet roles">
          <form onSubmit={onCreate} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Full name</Label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>License No</Label>
              <input className="input-field font-mono" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} required />
            </div>
            <div>
              <Label>License expiry</Label>
              <input type="date" className="input-field" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary h-[42px]">
              Add driver
            </button>
          </form>
        </Panel>
      )}

      <Panel className="animate-fade-up stagger-2">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No drivers" hint="Add drivers with valid licenses." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>License</th>
                  <th>Expiry</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 text-xs font-bold text-indigo-700">
                          {d.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-600">{d.licenseNo}</td>
                    <td className={expiryTone(d.licenseExpiry)}>
                      {new Date(d.licenseExpiry).toLocaleDateString()}
                    </td>
                    <td className="text-slate-500">{d.phone || "—"}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
