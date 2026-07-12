const styles: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  OnTrip: "bg-sky-50 text-sky-700 ring-sky-600/15",
  InShop: "bg-amber-50 text-amber-800 ring-amber-600/15",
  Retired: "bg-slate-100 text-slate-600 ring-slate-500/10",
  Suspended: "bg-rose-50 text-rose-700 ring-rose-600/15",
  Draft: "bg-slate-100 text-slate-600 ring-slate-500/10",
  Dispatched: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/15",
  Open: "bg-amber-50 text-amber-800 ring-amber-600/15",
  Closed: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-slate-100 text-slate-600 ring-slate-500/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Available" || status === "Completed"
            ? "bg-emerald-500"
            : status === "OnTrip" || status === "Dispatched"
              ? "bg-sky-500"
              : status === "InShop" || status === "Open" || status === "Draft"
                ? "bg-amber-500"
                : status === "Suspended" || status === "Cancelled"
                  ? "bg-rose-500"
                  : "bg-slate-400"
        }`}
      />
      {status}
    </span>
  );
}
