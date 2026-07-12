import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { hasRole } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, EmptyState, Label, LoadingBlock, PageHeader, Panel } from "../components/ui";
import { IconUsers } from "../components/Icons";

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

const STATUSES = ["Available", "OnTrip", "OffDuty", "Suspended"] as const;

function licenseValid(expiry: string) {
  const end = new Date(expiry);
  end.setHours(23, 59, 59, 999);
  return end >= new Date();
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
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ring-1 ${
        active
          ? "bg-indigo-600 text-white ring-indigo-600 shadow-sm"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function DriversPage() {
  const canCreate = hasRole("FLEET_MANAGER", "SAFETY_OFFICER", "DISPATCHER");
  const canUpdate = hasRole("FLEET_MANAGER", "SAFETY_OFFICER");

  const [items, setItems] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("C");
  const [licenseExpiry, setLicenseExpiry] = useState("2028-12-31");
  const [phone, setPhone] = useState("");
  const [safetyScore, setSafetyScore] = useState("100");

  const [filterStatus, setFilterStatus] = useState("");
  const [query, setQuery] = useState("");
  const [expiredOnly, setExpiredOnly] = useState(false);

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter((d) => d.status === "Available").length,
      onTrip: items.filter((d) => d.status === "OnTrip").length,
      offDuty: items.filter((d) => d.status === "OffDuty").length,
      suspended: items.filter((d) => d.status === "Suspended").length,
      expired: items.filter((d) => !licenseValid(d.licenseExpiry)).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (expiredOnly && licenseValid(d.licenseExpiry)) return false;
      if (q) {
        const hay = [d.name, d.licenseNo, d.licenseCategory, d.phone, d.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterStatus, query, expiredOnly]);

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
    setSuccess("");
    setSaving(true);
    try {
      await api("/api/drivers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          licenseNo: licenseNo.trim(),
          licenseCategory,
          licenseExpiry,
          phone: phone || null,
          safetyScore: Number(safetyScore),
        }),
      });
      setName("");
      setLicenseNo("");
      setPhone("");
      setSuccess("Driver added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function setDriverStatus(id: string, status: string) {
    setError("");
    setSuccess("");
    try {
      await api(`/api/drivers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setSuccess(`Driver set to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="License, expiry, safety score, Off Duty / Suspended — trip rules enforce valid Available drivers only."
      />
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              { label: "Total", value: stats.total },
              { label: "Available", value: stats.available },
              { label: "On trip", value: stats.onTrip },
              { label: "Off duty", value: stats.offDuty },
              { label: "Suspended", value: stats.suspended },
              { label: "License expired", value: stats.expired },
            ].map((c) => (
              <div key={c.label} className="card-elevated rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <IconUsers className="h-3.5 w-3.5" />
                  {c.label}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{c.value}</div>
              </div>
            ))}
          </div>

          {canCreate && (
            <Panel className="mb-6" title="Add driver" description="License number must be unique">
              <form
                onSubmit={onCreate}
                className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <Label>Name *</Label>
                  <input
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>License No *</Label>
                  <input
                    className="input-field font-mono"
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>License category</Label>
                  <input
                    className="input-field"
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>License expiry *</Label>
                  <input
                    type="date"
                    className="input-field"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Contact number</Label>
                  <input
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Safety score</Label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input-field"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary h-[42px]" disabled={saving}>
                  {saving ? "Saving…" : "Add driver"}
                </button>
              </form>
            </Panel>
          )}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              <Chip active={!filterStatus} onClick={() => setFilterStatus("")}>
                All
              </Chip>
              {STATUSES.map((s) => (
                <Chip
                  key={s}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                >
                  {s}
                </Chip>
              ))}
              <Chip active={expiredOnly} onClick={() => setExpiredOnly(!expiredOnly)}>
                Expired license
              </Chip>
            </div>
            <input
              className="input-field max-w-md"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, license, phone…"
            />
          </div>

          <Panel>
            {filtered.length === 0 ? (
              <EmptyState title={items.length === 0 ? "No drivers" : "No matches"} />
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
                      {canUpdate && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const valid = licenseValid(d.licenseExpiry);
                      return (
                        <tr key={d.id}>
                          <td className="font-semibold">{d.name}</td>
                          <td className="font-mono text-xs">{d.licenseNo}</td>
                          <td>{d.licenseCategory}</td>
                          <td>
                            <span className={valid ? "" : "text-rose-600 font-semibold"}>
                              {new Date(d.licenseExpiry).toLocaleDateString()}
                            </span>
                            {!valid && (
                              <span className="ml-1 text-[10px] font-bold uppercase text-rose-600">
                                expired
                              </span>
                            )}
                          </td>
                          <td>{d.phone || "—"}</td>
                          <td>
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                              {d.safetyScore}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                          {canUpdate && (
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {d.status !== "OnTrip" && d.status !== "Available" && (
                                  <button
                                    type="button"
                                    className="btn-ghost btn-success text-xs"
                                    onClick={() => setDriverStatus(d.id, "Available")}
                                  >
                                    Available
                                  </button>
                                )}
                                {d.status === "Available" && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-ghost text-xs"
                                      onClick={() => setDriverStatus(d.id, "OffDuty")}
                                    >
                                      Off duty
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-ghost btn-danger text-xs"
                                      onClick={() => setDriverStatus(d.id, "Suspended")}
                                    >
                                      Suspend
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
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
