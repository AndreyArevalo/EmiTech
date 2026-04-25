// ─────────────────────────────────────────────────────────────────────────────
// modules/billing/billing.service.ts
// Lógica de checkout y webhooks para Wompi (Colombia)
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@emitech/database";

// ─── Wompi (Colombia) ─────────────────────────────────────────────────────────
export async function createWompiCheckoutUrl(params: {
  tenantId: string;
  planId: string;
  planName: string;
  price: number; // en COP
  email: string;
  redirectUrl: string;
}) {
  const { tenantId, planId, planName, price, email, redirectUrl } = params;
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Wompi keys no configuradas");

  // Crear transacción en Wompi
  // Wompi cobra en centavos de COP
  const amountInCents = Math.round(price * 100);

  const reference = `emitech-${tenantId.slice(0, 8)}-${Date.now()}`;

  // Generar firma HMAC SHA256
  const crypto = await import("crypto");
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || "";
  const signatureStr = `${reference}${amountInCents}COP${integritySecret}`;
  const signature = crypto
    .createHash("sha256")
    .update(signatureStr)
    .digest("hex");

  // URL de checkout embebido Wompi
  const checkoutUrl =
    `https://checkout.wompi.co/p/?` +
    `public-key=${publicKey}` +
    `&currency=COP` +
    `&amount-in-cents=${amountInCents}` +
    `&reference=${reference}` +
    `&signature:integrity=${signature}` +
    `&redirect-url=${encodeURIComponent(redirectUrl)}` +
    `&customer-data:email=${encodeURIComponent(email)}`;

  // Guardar referencia en DB para cuando llegue el webhook
  await prisma.subscription.upsert({
    where: { tenantId },
    update: { wompiSubId: reference },
    create: {
      tenantId,
      planId,
      status: "TRIAL",
      wompiSubId: reference,
    },
  });

  return { checkoutUrl, reference };
}

// ─── Activar suscripción tras pago exitoso ────────────────────────────────────
export async function activateSubscription(tenantId: string, planId: string) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mes

  await prisma.subscription.upsert({
    where: { tenantId },
    update: {
      planId,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: null,
    },
    create: {
      tenantId,
      planId,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Asegurar que el tenant esté activo
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { active: true },
  });

  console.log(`[BILLING] ✅ Suscripción activada — tenant ${tenantId}, plan ${planId}`);
}

// ─── Suspender suscripción (pago fallido / vencido) ──────────────────────────
export async function suspendSubscription(tenantId: string) {
  await prisma.subscription.update({
    where: { tenantId },
    data: { status: "PAST_DUE" },
  });
  console.log(`[BILLING] ⚠️ Suscripción suspendida — tenant ${tenantId}`);
}
