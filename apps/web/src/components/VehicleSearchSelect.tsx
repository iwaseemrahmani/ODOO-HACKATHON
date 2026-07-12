import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Label } from "./ui";

export type VehicleOption = {
  id: string;
  registrationNo: string;
  model?: string;
  type?: string;
  region?: string;
  status?: string;
  odometer?: number;
};

type Props = {
  vehicles: VehicleOption[];
  value: string;
  onChange: (vehicleId: string) => void;
  label?: string;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  compact?: boolean;
};

function matchesQuery(v: VehicleOption, q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = [v.registrationNo, v.model, v.type, v.region, v.status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export function VehicleSearchSelect({
  vehicles,
  value,
  onChange,
  label = "Vehicle",
  required = false,
  allowEmpty = false,
  emptyLabel = "No vehicle (general expense)",
  disabled = false,
  hint,
  placeholder = "Search reg. no, model, type, region…",
  compact = false,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selected = vehicles.find((v) => v.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return vehicles;
    return vehicles.filter((v) => matchesQuery(v, q));
  }, [vehicles, query]);

  const options = useMemo(() => {
    const list: { id: string; label: string; sub?: string }[] = [];
    if (allowEmpty) {
      list.push({ id: "", label: emptyLabel, sub: "Show all / clear selection" });
    }
    for (const v of filtered) {
      list.push({
        id: v.id,
        label: v.registrationNo,
        sub: [v.model, v.type, v.region, v.status].filter(Boolean).join(" · "),
      });
    }
    return list;
  }, [allowEmpty, emptyLabel, filtered]);

  function updateMenuPosition() {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuMax = 256;
    const openUp = spaceBelow < 180 && rect.top > spaceBelow;
    setMenuPos({
      top: openUp ? rect.top - Math.min(menuMax, 240) - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    window.addEventListener("resize", onScroll);
    // capture scroll from any parent (main content scroller)
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, options.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) pick(opt.id);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  const displayClosed = selected
    ? `${selected.registrationNo}${selected.model ? ` · ${selected.model}` : ""}`
    : allowEmpty
      ? emptyLabel
      : "";

  const menu =
    open && !disabled && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            className="fixed z-[9999] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-black/10"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: Math.max(menuPos.width, 200),
            }}
          >
            {options.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400">
                No matches{query ? ` for “${query}”` : ""}
              </li>
            )}
            {options.map((opt, i) => (
              <li key={opt.id || "__empty"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.id === value}
                  className={`flex w-full flex-col px-3 py-2.5 text-left transition ${
                    i === highlight || opt.id === value ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // prevent input blur before click
                    e.preventDefault();
                    pick(opt.id);
                  }}
                >
                  <span
                    className={`text-sm font-semibold ${
                      opt.id ? "font-mono text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="mt-0.5 text-[11px] text-slate-500">{opt.sub}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative w-full">
      {label ? (
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
      ) : null}
      <div ref={inputWrapRef} className="relative w-full">
        {/* Fixed-width icon rail so typed text never sits under the icon */}
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex w-11 items-center justify-center border-r border-slate-100 text-slate-400"
          aria-hidden
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className={`input-field w-full !pl-12 ${value ? "!pr-14" : "!pr-3"} ${compact ? "!py-2.5" : ""}`}
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : displayClosed}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            requestAnimationFrame(updateMenuPosition);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {value && !disabled && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              pick("");
              inputRef.current?.focus();
            }}
          >
            Clear
          </button>
        )}
      </div>
      {hint && !compact && <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{hint}</p>}
      {menu}
    </div>
  );
}
