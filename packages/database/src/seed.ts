// ─────────────────────────────────────────────────────────────────────────────
// packages/database/src/seed.ts
// Datos iniciales: plan de prueba + primer tenant (salón demo)
// Ejecutar: npm run db:seed
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding EmiTech...");

  // Planes
  const planBasic = await prisma.plan.upsert({
    where: { slug: "basic" },
    update: {},
    create: { name: "Básico", slug: "basic", price: 79900, currency: "COP",
      maxStaff: 2, maxServices: 8, features: ["Bot WhatsApp", "Panel web", "Hasta 2 estilistas"] },
  });
  const planPro = await prisma.plan.upsert({
    where: { slug: "pro" },
    update: {},
    create: { name: "Pro", slug: "pro", price: 149900, currency: "COP",
      maxStaff: 10, maxServices: 30, features: ["Todo en Básico", "Hasta 10 estilistas", "Recordatorios automáticos", "Estadísticas avanzadas"] },
  });

  // Tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { slug: "geminis-demo" },
    update: {},
    create: {
      name: "Geminis Salón",
      slug: "geminis-demo",
      phone: "573001234567",
      city: "Bogotá",
      timezone: "America/Bogota",
    },
  });

  // BotConfig
  await prisma.botConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      welcomeMessage: "✨ ¡Hola! Bienvenida a *Geminis Salón* 💅\n¿Qué servicio deseas agendar?",
      closedMessage: "⛔ En este momento Geminis no está disponible. Te escribimos pronto 🌸",
      confirmMessage: "✅ ¡Tu cita fue registrada! En breve la administradora te confirma. 🌸\n\nEscribe *menu* si necesitas algo más.",
      isOpen: true,
      requiresConfirm: true,
    },
  });

  // Servicios
  const servicios = [
    { name: "Laminado de Cejas", emoji: "🔥", duration: 60, price: 80000, order: 1 },
    { name: "Depilación de Cejas", emoji: "✨", duration: 30, price: 35000, order: 2 },
    { name: "Extensión de Pestañas", emoji: "👁️", duration: 90, price: 150000, order: 3 },
    { name: "Manicure", emoji: "💅", duration: 45, price: 50000, order: 4 },
  ];
  for (const s of servicios) {
    await prisma.service.upsert({
      where: { id: `${tenant.id}-${s.name}` },
      update: {},
      create: { ...s, tenantId: tenant.id, currency: "COP" },
    }).catch(() =>
      prisma.service.create({ data: { ...s, tenantId: tenant.id, currency: "COP" } }).catch(() => {})
    );
  }

  // Horarios (lunes a sábado)
  const horarios = [
    { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 6, openTime: "09:00", closeTime: "14:00", isOpen: true },
  ];
  await prisma.workingHours.deleteMany({ where: { tenantId: tenant.id, staffId: null } });
  await prisma.workingHours.createMany({ data: horarios.map(h => ({ ...h, tenantId: tenant.id })) });

  // Staff
  const admin = await prisma.staff.upsert({
    where: { id: `${tenant.id}-andrea` },
    update: {},
    create: { name: "Andrea López", tenantId: tenant.id },
  }).catch(() => prisma.staff.create({ data: { name: "Andrea López", tenantId: tenant.id } }));

  // Usuario admin
  const hash = await bcrypt.hash("emitech2024", 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@geminis.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@geminis.com",
      passwordHash: hash,
      name: "Administradora Geminis",
      role: "OWNER",
    },
  });

  // Usuario SuperAdmin EmiTech
  const hashSuper = await bcrypt.hash("emitech-admin-2024", 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "superadmin@emitech.co" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "superadmin@emitech.co",
      passwordHash: hashSuper,
      name: "EmiTech Admin",
      role: "SUPERADMIN",
    },
  });

  // Suscripción trial
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planId: planBasic.id,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  });

  console.log("✅ Seed completo!");
  console.log("   📧 Admin salón: admin@geminis.com / emitech2024");
  console.log("   🛡️  SuperAdmin:  superadmin@emitech.co / emitech-admin-2024");
  console.log("   🏠 Salón demo:  Geminis Salón (slug: geminis-demo)");
}

main().finally(() => prisma.$disconnect());
