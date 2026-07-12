import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";

type Driver = {
  id: string;
  name: string;
  licenseNo: string;
  licenseCategory: string;
  licenseExpiry: string;
  phone: string | null;
  safetyScore: number;
  status: string;
};

export function DriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("C");
  const [licenseExpiry, setLicenseExpiry] = useState("2028-12-31");
  const [phone, setPhone] = useState("");
  const [safetyScore, setSafetyScore] = useState("100");
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
        body: JSON.stringify({
          name,
          licenseNo,
          licenseCategory,
          licenseExpiry,
          phone: phone || null,
          safetyScore: Number(safetyScore),
        }),
      });
      setName("");
      setLicenseNo("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="License category, expiry, contact, safety score, and status (incl. Off Duty)."
      />
      {error && <Alert type="error">{error}</Alert>}

      {canCreate && (
        <Panel className="mb-6 animate-fade-up" title="Add driver">
          <form
            onSubmit={onCreate}
            className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end"
          >
            <div>
              <Label>Name</Label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>License No</Label>
              <input className="input-field font-mono" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} required />
            </div>
            <div>
              <Label>License category</Label>
              <input className="input-field" value={licenseCategory} onChange={(e) => setLicenseCategory(e.target.value)} required />
            </div>
            <div>
              <Label>License expiry</Label>
              <input type="date" className="input-field" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} required />
            </div>
            <div>
              <Label>Contact number</Label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Safety score</Label>
              <input type="number" min={0} max={100} className="input-field" value={safetyScore} onChange={(e) => setSafetyScore(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary h-[42px]">
              Add driver
            </button>
          </form>
        </Panel>
      )}

      <Panel>
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title="No drivers" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License</th>
                  <th>Category</th>
                  <th>Expiry</th>
                  <th>Phone</th>
                  <th>Safety</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="font-semibold">{d.name}</td>
                    <td className="font-mono text-xs">{d.licenseNo}</td>
                    <td>{d.licenseCategory}</td>
                    <td>{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                    <td>{d.phone || "—"}</td>
                    <td>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                        {d.safetyScore}
                      </span>
                    </td>
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
