import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { users, siteSettings, subscriptions } from "./schema";

// Usage: DATABASE_URL=... ADMIN_EMAIL=admin@example.com SITE_NAME="Meu Site" tsx src/db/seed.ts

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@brasa.tech";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SITE_NAME = process.env.SITE_NAME || "Meu Site";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // Hash the default admin password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Insert admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (adminUser) {
    console.log(`Admin user created: ${adminUser.email}`);
  } else {
    console.log("Admin user already exists, skipped.");
  }

  // Insert default site settings
  const [settings] = await db
    .insert(siteSettings)
    .values({
      siteName: SITE_NAME,
      siteDescription: `Site gerenciado pelo Brasa CMS.`,
      footerText: `${SITE_NAME} — Todos os direitos reservados.`,
      copyrightText: `${new Date().getFullYear()} ${SITE_NAME}. Todos os direitos reservados.`,
      newsletterTitle: "Receba nossas novidades",
      newsletterDescription:
        "Cadastre-se para receber conteudos diretamente no seu e-mail.",
      newsletterConsent:
        "Ao se inscrever, voce concorda em receber nossos e-mails. Pode cancelar a qualquer momento.",
      seoTitle: SITE_NAME,
      seoDescription: `${SITE_NAME} — Conteudo gerenciado pelo Brasa CMS.`,
    })
    .returning();

  if (settings) {
    console.log(`Site settings created (id: ${settings.id})`);
  }

  // Insert default subscription (30 days trial)
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 30);

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      tenantId: 1,
      status: "active",
      nextDueDate: nextDueDate.toISOString(),
      graceDays: 7,
    })
    .onConflictDoNothing({ target: subscriptions.tenantId })
    .returning();

  if (subscription) {
    console.log(`Subscription created (id: ${subscription.id})`);
  } else {
    console.log("Subscription already exists, skipped.");
  }

  console.log("Seed completed successfully.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
