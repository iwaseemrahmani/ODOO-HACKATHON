import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isLoggedIn, login } from "../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("dispatch@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn()) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">TransitOps</h1>
          <p className="text-slate-500 text-sm mt-1">Fleet & Transport Operations</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 font-semibold disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-slate-500 mt-5 leading-relaxed">
          Demo: dispatch@demo.com · fleet@demo.com · safety@demo.com · finance@demo.com
          <br />
          Password: <span className="font-mono">password123</span>
        </p>
      </form>
    </div>
  );
}
