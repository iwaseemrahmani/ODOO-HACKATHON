import type { ReactNode } from "react";
import { IconAlert, IconCheck } from "./Icons";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500 max-w-xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className={`card-elevated rounded-2xl overflow-hidden ${className}`}>
      {(title || description) && (
        <div className="px-5 py-4 border-b border-slate-100">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Alert({
  type = "error",
  children,
}: {
  type?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const map = {
    error: "bg-rose-50 text-rose-800 border-rose-100",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100",
    info: "bg-sky-50 text-sky-800 border-sky-100",
  };
  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${map[type]}`}
    >
      {type === "error" ? (
        <IconAlert className="w-4 h-4 mt-0.5 shrink-0" />
      ) : type === "success" ? (
        <IconCheck className="w-4 h-4 mt-0.5 shrink-0" />
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
      <span className="h-5 w-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      Loading…
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
      {children}
    </label>
  );
}
