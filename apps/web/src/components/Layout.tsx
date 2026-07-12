import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getStoredUser, hasRole, logout } from "../lib/auth";
import {
  IconAnalytics,
  IconChart,
  IconFuel,
  IconLogout,
  IconMenu,
  IconRoute,
  IconSettings,
  IconTruck,
  IconUsers,
  IconWrench,
} from "./Icons";

const allLinks = [
  { to: "/", label: "Dashboard", end: true, icon: IconChart, roles: null as string[] | null },
  {
    to: "/vehicles",
    label: "Vehicles",
    icon: IconTruck,
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  },
  {
    to: "/drivers",
    label: "Drivers",
    icon: IconUsers,
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  },
  {
    to: "/trips",
    label: "Trips",
    icon: IconRoute,
    roles: ["FLEET_MANAGER", "DISPATCHER"],
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    icon: IconWrench,
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER"],
  },
  {
    to: "/expenses",
    label: "Fuel & Expenses",
    icon: IconFuel,
    roles: ["FLEET_MANAGER", "FINANCIAL_ANALYST", "DISPATCHER"],
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: IconAnalytics,
    roles: ["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: IconSettings,
    roles: null as string[] | null,
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = getStoredUser();
  const navigate = useNavigate();

  const links = allLinks.filter((l) => !l.roles || l.roles.some((r) => hasRole(r)));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <IconTruck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white">TransitOps</div>
            <div className="text-[11px] text-slate-400 font-medium">Fleet Control Center</div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Operations
        </p>
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] ${isActive ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"}`}
                  />
                  {l.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 shrink-0 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 text-xs font-bold text-white">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
            <div className="truncate text-[11px] text-slate-400">
              {user?.role?.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-rose-500/20 hover:text-rose-200 hover:ring-rose-500/30"
        >
          <IconLogout className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const user = getStoredUser();

  return (
    /* Shell locks to viewport — only main content scrolls */
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#f4f6fb]">
      {/* Desktop sidebar: fixed viewport height, does not scroll with page */}
      <aside className="hidden md:flex h-dvh w-[260px] shrink-0 flex-col overflow-hidden bg-[#0b1220] text-white">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="sidebar-overlay md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar-drawer md:hidden flex h-dvh w-[260px] flex-col overflow-hidden bg-[#0b1220] text-white ${open ? "open" : ""}`}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>

      {/* Right column: header fixed in column, body scrolls */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 md:px-8">
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-medium">Welcome back</p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {user?.name}
              <span className="hidden sm:inline font-normal text-slate-400">
                {" "}
                · Real-time fleet operations
              </span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            System online
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
