import type { Express, Request, Response } from "express";
import * as db from "../db";
import { fetchMercadoPagoPreapproval, verifyMercadoPagoWebhookSignature } from "../services/billing-mercadopago.service";

function getMercadoPagoEventId(req: Request): string {
  const queryDataId = typeof req.query.data_id === "string" ? req.query.data_id : null;
  const queryId = typeof req.query.id === "string" ? req.query.id : null;
  const body = req.body as { id?: unknown; data?: { id?: unknown } };
  const bodyId = typeof body?.id === "string" ? body.id : null;
  const bodyDataId = typeof body?.data?.id === "string" ? body.data.id : null;

  return queryDataId || queryId || bodyDataId || bodyId || "";
}

function getMercadoPagoTopic(req: Request): string {
  const queryTopic = typeof req.query.topic === "string" ? req.query.topic : null;
  const queryType = typeof req.query.type === "string" ? req.query.type : null;
  const body = req.body as { type?: unknown; action?: unknown };
  const bodyType = typeof body?.type === "string" ? body.type : null;
  const bodyAction = typeof body?.action === "string" ? body.action : null;

  return queryTopic || queryType || bodyType || bodyAction || "unknown";
}

export function registerBillingWebhookRoutes(app: Express) {
  app.post("/api/billing/webhook/mercadopago", async (req: Request, res: Response) => {
    try {
      const signatureOk = verifyMercadoPagoWebhookSignature({
        authorizationHeader:
          (req.headers.authorization as string | undefined) ??
          (req.headers["x-signature"] as string | undefined),
      });

      if (!signatureOk) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      const eventId = getMercadoPagoEventId(req);
      const topic = getMercadoPagoTopic(req);
      if (!eventId) {
        res.status(400).json({ error: "missing event id" });
        return;
      }

      const dedupeKey = `mercadopago:${topic}:${eventId}`;
      const inserted = await db.markBillingWebhookEventProcessed({
        provider: "mercado_pago",
        eventId: dedupeKey,
        eventType: topic,
      });

      if (!inserted) {
        res.status(200).json({ ok: true, duplicated: true });
        return;
      }

      const preapproval = await fetchMercadoPagoPreapproval(eventId);
      if (!preapproval.userId || preapproval.plan === "free") {
        res.status(200).json({ ok: true, ignored: true });
        return;
      }

      await db.upsertSubscription({
        userId: preapproval.userId,
        plan: preapproval.plan,
        status: preapproval.status,
        expiresAt: preapproval.expiresAt,
        provider: "mercado_pago",
        providerSubscriptionId: preapproval.providerSubscriptionId,
        providerCustomerId: null,
        productId: null,
        entitlementId: null,
      });

      await db.syncUserPlanFromSubscriptions(preapproval.userId);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Billing] Mercado Pago webhook failed", error);
      res.status(500).json({ error: "webhook failed" });
    }
  });
}
