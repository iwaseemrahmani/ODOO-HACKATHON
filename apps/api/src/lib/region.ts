import { prisma } from "./prisma";

/** Resolve region name to id (create Region row if needed). */
export async function resolveRegionId(name?: string | null): Promise<string | null> {
  if (!name || !String(name).trim()) return null;
  const n = String(name).trim();
  const region = await prisma.region.upsert({
    where: { name: n },
    update: {},
    create: { name: n },
  });
  return region.id;
}

export function mapVehicleType(raw?: string): "Truck" | "Van" | "MiniTruck" | "Trailer" {
  const t = (raw || "Van").trim();
  if (t === "Truck" || t === "Van" || t === "MiniTruck" || t === "Trailer") return t;
  if (t === "Bus" || t === "MiniTruck") return "MiniTruck";
  if (t === "Car") return "Van";
  return "Van";
}

export function mapExpenseCategory(
  raw?: string
): "Fuel" | "Maintenance" | "Toll" | "DriverAllowance" | "Fine" | "Repair" | "Other" {
  const t = (raw || "Other").trim();
  const map: Record<string, "Fuel" | "Maintenance" | "Toll" | "DriverAllowance" | "Fine" | "Repair" | "Other"> = {
    Fuel: "Fuel",
    Maintenance: "Maintenance",
    Toll: "Toll",
    DriverAllowance: "DriverAllowance",
    Fine: "Fine",
    Repair: "Repair",
    Other: "Other",
    Parking: "Other",
    Insurance: "Other",
  };
  return map[t] || "Other";
}
