/**
 * Brasa CMS — Create Tenant CLI
 *
 * Cria um novo tenant com site_settings, paginas, usuario admin e guias.
 *
 * Uso: pnpm tenant:create
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as readline from "readline";
import * as crypto from "crypto";

// Carregar env
const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!DATABASE_URL) {
  console.error("DATABASE_URL ou DATABASE_URI nao encontrada. Configure o .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

async function main() {
  console.log("");
  console.log(`${CYAN}${BOLD}  Brasa CMS${RESET} ${DIM}— Criar Novo Tenant${RESET}`);
  console.log("");

  // Coletar dados
  const name = await ask(`${CYAN}Nome do site:${RESET} `);
  const slug = await ask(`${CYAN}Slug (ex: farmacia-x):${RESET} `);
  const domain = await ask(`${CYAN}Dominio (ex: www.farmacia-x.com.br, deixe vazio pra depois):${RESET} `);
  const subdomain = await ask(`${CYAN}Subdominio (ex: farmacia-x, deixe vazio pra depois):${RESET} `);
  const adminName = await ask(`${CYAN}Nome do admin:${RESET} `);
  const adminEmail = await ask(`${CYAN}Email do admin:${RESET} `);
  const adminPassword = await ask(`${CYAN}Senha do admin:${RESET} `);
  const whatsapp = await ask(`${CYAN}WhatsApp (ex: 5511999999999, deixe vazio):${RESET} `);

  if (!name || !slug || !adminEmail || !adminPassword) {
    console.error("\nNome, slug, email e senha sao obrigatorios.");
    process.exit(1);
  }

  console.log(`\n${YELLOW}Criando tenant "${name}" (${slug})...${RESET}\n`);

  try {
    // 1. Criar tenant
    const [tenant] = await sql`
      INSERT INTO tenants (slug, name, domain, subdomain)
      VALUES (${slug}, ${name}, ${domain || null}, ${subdomain || null})
      RETURNING id, slug, name
    `;
    const tenantId = tenant.id;
    console.log(`  ${GREEN}Tenant criado${RESET} ${DIM}(id: ${tenantId})${RESET}`);

    // 2. Hash password
    // Usar crypto nativo em vez de bcryptjs (que precisa de import ESM)
    const bcryptjs = await import("bcryptjs");
    const passwordHash = await bcryptjs.hash(adminPassword, 12);

    // 3. Criar usuario admin
    await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role)
      VALUES (${tenantId}, ${adminName || "Admin"}, ${adminEmail}, ${passwordHash}, 'admin')
    `;
    console.log(`  ${GREEN}Usuario admin criado${RESET} ${DIM}(${adminEmail})${RESET}`);

    // 4. Criar site_settings
    await sql`
      INSERT INTO site_settings (tenant_id, site_name, whatsapp)
      VALUES (${tenantId}, ${name}, ${whatsapp || null})
    `;
    console.log(`  ${GREEN}Site settings criado${RESET}`);

    // 5. Criar paginas default
    const defaultSections = JSON.stringify([
      { id: "hero-1", component: "HeroPost", props: { mode: "featured", showCategory: true, showAuthor: true, showReadingTime: true, sideCount: "4" } },
      { id: "categories", component: "CategoryBar", props: { showAll: true, limit: 10 } },
      { id: "grid-sidebar", component: "PostGridWithSidebar", props: { gridTitle: "Mais Recentes", gridMode: "recent", gridLimit: 4, gridColumns: "2", gridShowCategory: true, gridViewAllHref: "/blog", sidebarTitle: "Tendencias", sidebarMode: "trending", sidebarLimit: 5 } },
      { id: "grid-picks", component: "PostGrid", props: { title: "Escolhas do Editor", mode: "editor-picks", limit: 6, columns: "3", showCategory: true } },
    ]);

    await sql`
      INSERT INTO pages (tenant_id, slug, title, sections) VALUES
      (${tenantId}, 'home', 'Home', ${defaultSections}::jsonb),
      (${tenantId}, 'politica-de-privacidade', 'Politica de Privacidade', null),
      (${tenantId}, 'blog', 'Blog', null)
    `;
    console.log(`  ${GREEN}Paginas criadas${RESET} ${DIM}(home, politica-de-privacidade, blog)${RESET}`);

    // 6. Criar subscription ativa
    const nextDue = new Date(Date.now() + 7 * 86400000).toISOString();
    await sql`
      INSERT INTO subscriptions (tenant_id, status, next_due_date)
      VALUES (${tenantId}, 'active', ${nextDue})
    `;
    console.log(`  ${GREEN}Subscription criada${RESET} ${DIM}(trial 7 dias)${RESET}`);

    // 7. Seed guias
    await sql`
      INSERT INTO cms_guides (tenant_id, slug, title, sort_order, content)
      SELECT ${tenantId}, slug, title, sort_order, content
      FROM cms_guides WHERE tenant_id = 1
    `;
    console.log(`  ${GREEN}Guias copiados do tenant default${RESET}`);

    console.log(`\n${GREEN}${BOLD}Tenant "${name}" criado com sucesso!${RESET}\n`);
    console.log(`${DIM}Proximos passos:${RESET}`);
    console.log(`  1. Configure o dominio: ${domain || "(definir depois)"}`);
    console.log(`  2. Acesse o admin: /admin/login`);
    console.log(`  3. Email: ${adminEmail}`);
    console.log(`  4. Comece a criar conteudo\n`);

  } catch (err: any) {
    if (err.message?.includes("duplicate key")) {
      console.error(`\n${YELLOW}Slug "${slug}" ja existe. Use outro slug.${RESET}`);
    } else {
      console.error("\nErro:", err.message || err);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
