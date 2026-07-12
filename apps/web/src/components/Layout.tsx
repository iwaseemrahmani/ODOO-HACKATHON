import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getStoredUser, hasRole, logout } from "../lib/auth";

const allLinks = [
  { to: "/", label: "Dashboard", end: true, roles: null as string[] | null },
  {
    to: "/vehicles",
    label: "Vehicles",
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  },
  {
    to: "/drivers",
    label: "Drivers",
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  },
  {
    to: "/trips",
    label: "Trips",
    roles: ["FLEET_MANAGER", "DISPATCHER"],
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    roles: ["FLEET_MANAGER"],
  },
  {
    to: "/expenses",
    label: "Fuel & Expenses",
    roles: ["FLEET_MANAGER", "FINANCIAL_ANALYST", "DISPATCHER"],
  },
];

export function Layout() {
  const user = getStoredUser();
  const navigate = useNavigate();

  const links = allLinks.filter(
    (l) => !l.roles || l.roles.some((r) => hasRole(r))
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="text-xl font-bold tracking-tight">TransitOps</div>
          <div className="text-xs text-slate-400 mt-1">Fleet & Transport ERP</div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs">
          <div className="text-slate-200 font-medium">{user?.name}</div>
          <div className="text-slate-400 mt-0.5">{user?.role?.replace(/_/g, " ")}</div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 text-rose-300 hover:text-rose-200 font-medium"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
