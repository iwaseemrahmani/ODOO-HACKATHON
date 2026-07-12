import { useEffect, useState } from "react";
import { getStoredUser } from "../lib/auth";
import { getStoredTheme, setTheme, THEME_CHANGE_EVENT, type ThemeMode } from "../lib/theme";
import { IconMoon, IconSun } from "../components/Icons";
import { Alert, PageHeader, Panel } from "../components/ui";

type NotificationSetting = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export function SettingsPage() {
  const user = getStoredUser();
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    const onTheme = (e: Event) => {
      const mode = (e as CustomEvent<ThemeMode>).detail;
      if (mode === "light" || mode === "dark") setThemeState(mode);
      else setThemeState(getStoredTheme());
    };
    window.addEventListener(THEME_CHANGE_EVENT, onTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onTheme);
  }, []);

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { key: "maintenance", label: "Maintenance alerts", description: "When a vehicle enters or leaves the shop", enabled: true },
    { key: "trips", label: "Trip updates", description: "Dispatch, completion, and delay notifications", enabled: true },
    { key: "expenses", label: "Expense approvals", description: "When new expenses require review", enabled: false },
    { key: "drivers", label: "Driver changes", description: "License expiry, status changes, onboarding", enabled: true },
  ]);

  const [preferences, setPreferences] = useState({
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    currency: "INR",
    language: "English",
  });

  const [saved, setSaved] = useState(false);

  function toggleNotification(key: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n)),
    );
  }

  function handlePreferenceChange(field: string, value: string) {
    setPreferences((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, preferences, and system configuration." />

      {saved && <Alert type="success">Settings saved successfully.</Alert>}

      <div className="space-y-6">
        <Panel className="animate-fade-up" title="Appearance" description="Theme and display">
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">Color theme</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Switch between light and dark. Preference is saved on this device.
                </div>
              </div>
              <div
                className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/80"
                role="group"
                aria-label="Theme"
              >
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    theme === "light"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <IconSun className="w-4 h-4" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                    theme === "dark"
                      ? "bg-slate-800 text-white shadow-sm ring-1 ring-white/10"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <IconMoon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              Current mode: <span className="font-semibold text-slate-600 capitalize">{theme}</span>
              {" · "}
              You can also toggle from the sun/moon button in the top bar.
            </p>
          </div>
        </Panel>

        <Panel className="animate-fade-up stagger-1" title="Profile" description="Your account information">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                {user?.name?.charAt(0) || "U"}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name</div>
                <div className="text-sm font-medium text-slate-900">{user?.name || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</div>
                <div className="text-sm font-medium text-slate-900">{user?.email || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Role</div>
                <div className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/15">
                  {user?.role?.replace(/_/g, " ") || "—"}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="animate-fade-up stagger-2" title="Preferences" description="Regional and display settings">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Timezone
              </label>
              <select
                className="input-field"
                value={preferences.timezone}
                onChange={(e) => handlePreferenceChange("timezone", e.target.value)}
              >
                <option>Asia/Kolkata</option>
                <option>Asia/Dubai</option>
                <option>UTC</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Date format
              </label>
              <select
                className="input-field"
                value={preferences.dateFormat}
                onChange={(e) => handlePreferenceChange("dateFormat", e.target.value)}
              >
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Currency
              </label>
              <select
                className="input-field"
                value={preferences.currency}
                onChange={(e) => handlePreferenceChange("currency", e.target.value)}
              >
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>AED</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Language
              </label>
              <select
                className="input-field"
                value={preferences.language}
                onChange={(e) => handlePreferenceChange("language", e.target.value)}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Tamil</option>
              </select>
            </div>
          </div>
          <div className="border-t border-slate-100 px-5 py-4 flex justify-end">
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save preferences
            </button>
          </div>
        </Panel>

        <Panel className="animate-fade-up stagger-3" title="Notifications" description="Control which alerts you receive">
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium text-slate-900">{n.label}</div>
                  <div className="text-xs text-slate-500">{n.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={n.enabled}
                  onClick={() => toggleNotification(n.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    n.enabled ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      n.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="animate-fade-up stagger-4" title="System" description="Configuration options">
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">API endpoint</div>
                <div className="text-xs text-slate-500">Current backend URL used for all requests</div>
              </div>
              <code className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-mono text-slate-700">
                {import.meta.env.VITE_API_URL || "http://localhost:4000"}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">Session</div>
                <div className="text-xs text-slate-500">You are logged in and authenticated</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">App version</div>
                <div className="text-xs text-slate-500">TransitOps fleet control center</div>
              </div>
              <code className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-mono text-slate-700">
                v1.0.0
              </code>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
