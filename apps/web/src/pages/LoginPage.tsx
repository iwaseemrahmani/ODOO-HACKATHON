import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn, login } from "../lib/auth";
import { IconSpark, IconTruck } from "../components/Icons";
import { Alert, Label } from "../components/ui";

const demos = [
  { email: "dispatch@demo.com", role: "Dispatcher" },
  { email: "fleet@demo.com", role: "Fleet Manager" },
  { email: "safety@demo.com", role: "Safety" },
  { email: "finance@demo.com", role: "Finance" },
];

function safeReturnPath(from: unknown): string {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) {
    return "/";
  }
  if (from === "/login") return "/";
  return from;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnPath(
    (location.state as { from?: string } | null)?.from
  );
  const [email, setEmail] = useState("dispatch@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn()) return <Navigate to={returnTo} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-scroll bg-mesh flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative flex flex-1 flex-col justify-between p-8 lg:p-12 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-indigo-500 blur-[100px]" />
          <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-sky-500 blur-[120px]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <IconTruck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">TransitOps</div>
            <div className="text-xs text-slate-400">Fleet & Transport ERP</div>
          </div>
        </div>

        <div className="relative max-w-lg mt-12 lg:mt-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/15 mb-5">
            <IconSpark className="w-3.5 h-3.5" />
            Operations, compliance & cost — one platform
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
            Move your fleet with{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              clarity
            </span>
          </h1>
          <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
            Dispatch trips, enforce capacity and license rules, track maintenance and fuel —
            designed for logistics teams that outgrew spreadsheets.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { n: "Rules", d: "Backend enforced" },
              { n: "RBAC", d: "4 role profiles" },
              { n: "Live", d: "KPI dashboard" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur"
              >
                <div className="text-sm font-semibold text-white">{s.n}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-slate-500 mt-10 lg:mt-0">
          TransitOps · Hackathon build · Secure JWT access
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[420px] rounded-3xl bg-white p-8 shadow-2xl shadow-black/20 ring-1 ring-black/5 animate-fade-up"
        >
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Use a demo account or your team credentials
          </p>

          {error && <Alert type="error">{error}</Alert>}

          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-6 py-3">
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing in…
              </>
            ) : (
              "Continue to dashboard"
            )}
          </button>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Quick demo fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demos.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("password123");
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                >
                  <div className="text-xs font-semibold text-slate-800">{d.role}</div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">{d.email}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Password for all demos:{" "}
              <span className="font-mono font-medium text-slate-600">password123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
