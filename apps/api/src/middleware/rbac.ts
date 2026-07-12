import type { Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import type { AuthedRequest } from "./auth";

/** Allow only listed roles. Call after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Requires role: ${roles.join(" | ")}`,
      });
    }
    next();
  };
}
