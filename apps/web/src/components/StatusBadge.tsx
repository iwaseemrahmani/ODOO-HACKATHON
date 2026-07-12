const colors: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-800",
  OnTrip: "bg-sky-100 text-sky-800",
  InShop: "bg-amber-100 text-amber-800",
  Retired: "bg-slate-200 text-slate-700",
  Suspended: "bg-rose-100 text-rose-800",
  Draft: "bg-slate-100 text-slate-700",
  Dispatched: "bg-indigo-100 text-indigo-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-700",
  Open: "bg-amber-100 text-amber-800",
  Closed: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
        colors[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
