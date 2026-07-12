import "./env";
import express from "express";
import cors from "cors";
import { env } from "./env";

import { authRouter } from "./routes/auth.routes";
import { vehiclesRouter } from "./routes/vehicles.routes";
import { driversRouter } from "./routes/drivers.routes";
import {
  tripsRouter,
  maintenanceRouter,
  fuelRouter,
  expensesRouter,
} from "./routes/trips.routes";
import { dashboardRouter } from "./routes/dashboard.routes";

const app = express();

const origins = env.corsOrigin.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "TransitOps API",
    version: "1.0.0",
    health: "/api/health",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "transitops-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/fuel", fuelRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/dashboard", dashboardRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.port, () => {
  console.log(`TransitOps API → http://localhost:${env.port}`);
});
