import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";
import bcrypt from "bcryptjs";

// Usage: DATABASE_URL=... ADMIN_EMAIL=admin@example.com SITE_NAME="Meu Site" tsx src/db/setup.ts

const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!DATABASE_URL) {
  console.error("DATABASE_URL or DATABASE_URI is required");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@brasa.tech";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SITE_NAME = process.env.SITE_NAME || "Meu Site";

const sql = neon(DATABASE_URL);

async function setup() {
  console.log("Dropping existing tables...");
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  console.log("Schema reset.");

  console.log("Applying migration...");
  const migrationPath = resolve(process.cwd(), "drizzle/0000_breezy_beyonder.sql");
  const migrationSql = readFileSync(migrationPath, "utf-8");

  // Split by statement breakpoint and execute each
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log("Migration applied.");

  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Admin', ${ADMIN_EMAIL}, ${passwordHash}, 'admin')
    ON CONFLICT (email) DO NOTHING
  `;

  console.log("Seeding site settings...");
  await sql`
    INSERT INTO site_settings (id, site_name, site_description, footer_text, copyright_text, seo_title, seo_description)
    VALUES (
      1,
      ${SITE_NAME},
      ${SITE_NAME + ' — Gerenciado pelo Brasa CMS.'},
      ${SITE_NAME + ' — Todos os direitos reservados.'},
      ${new Date().getFullYear() + ' ' + SITE_NAME + '. Todos os direitos reservados.'},
      ${SITE_NAME},
      ${SITE_NAME + ' — Conteudo gerenciado pelo Brasa CMS.'}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  console.log(`Setup complete! Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

setup().catch(console.error);
