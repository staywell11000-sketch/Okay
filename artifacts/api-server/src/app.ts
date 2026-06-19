import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// ── Startup env var checks ────────────────────────────────
const requiredWhatsAppVars = ["WHATSAPP_WEBHOOK_VERIFY_TOKEN", "FACEBOOK_APP_SECRET"];
for (const v of requiredWhatsAppVars) {
  if (!process.env[v]) {
    logger.warn(`Missing env var: ${v} — WhatsApp webhook functionality will be degraded. Set it in your environment secrets.`);
  }
}

const httpLogger = pinoHttp();

app.use(
  httpLogger({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({
  limit: "15mb",
  verify: (req: any, _res: Response, buf: Buffer) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api", router);

export default app;
