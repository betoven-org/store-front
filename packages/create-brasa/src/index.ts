#!/usr/bin/env node

import prompts from "prompts";
import pc from "picocolors";
import { resolve, join, basename } from "path";
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";

const TEMPLATES = [
  { title: "Blog", value: "blog", description: "Blog com posts, categorias e SEO" },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["value"];

async function main() {
  const argProject = process.argv[2];

  console.log();
  console.log(`  ${pc.bold(pc.magenta("Brasa CMS"))} — Create a new storefront`);
  console.log();

  const response = await prompts(
    [
      {
        type: argProject ? null : "text",
        name: "projectName",
        message: "Nome do projeto:",
        initial: "meu-site",
        validate: (v: string) =>
          /^[a-z0-9-]+$/.test(v) || "Use apenas letras minusculas, numeros e hifens",
      },
      {
        type: "select",
        name: "template",
        message: "Template:",
        choices: TEMPLATES.map((t) => ({
          title: t.title,
          value: t.value,
          description: t.description,
        })),
      },
      {
        type: "text",
        name: "cmsUrl",
        message: "URL do CMS (ou Enter pra local):",
        initial: "http://localhost:3000",
      },
    ],
    {
      onCancel: () => {
        console.log(pc.red("\n  Cancelado.\n"));
        process.exit(0);
      },
    }
  );

  const projectName = argProject || response.projectName;
  const template: TemplateId = response.template;
  const cmsUrl: string = response.cmsUrl;
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.log(pc.red(`\n  Diretorio "${projectName}" ja existe.\n`));
    process.exit(1);
  }

  // Copy template
  const templateDir = resolve(__dirname, "..", "templates", template);
  if (!existsSync(templateDir)) {
    console.log(pc.red(`\n  Template "${template}" nao encontrado.\n`));
    process.exit(1);
  }

  console.log();
  console.log(`  ${pc.cyan("Criando")} ${projectName}...`);

  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });

  // Update package.json with project name
  const pkgPath = join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    let pkg = readFileSync(pkgPath, "utf-8");
    pkg = pkg.replace(/"name":\s*"[^"]*"/, `"name": "${projectName}"`);
    writeFileSync(pkgPath, pkg);
  }

  // Create .env.local
  const envContent = [
    `CMS_URL=${cmsUrl}`,
    `CMS_API_KEY=`,
    `# Preenchido automaticamente ao conectar com o CMS`,
  ].join("\n");
  writeFileSync(join(targetDir, ".env.local"), envContent + "\n");

  // Create .gitignore
  const gitignore = [
    "node_modules",
    ".next",
    ".env.local",
    "dist",
  ].join("\n");
  writeFileSync(join(targetDir, ".gitignore"), gitignore + "\n");

  console.log(`  ${pc.green("Pronto!")}`);
  console.log();
  console.log(`  ${pc.bold("Proximo passo:")}`);
  console.log();
  console.log(`    cd ${projectName}`);
  console.log(`    pnpm install`);
  console.log(`    pnpm dev`);
  console.log();
  console.log(`  ${pc.dim("Storefront")} → http://localhost:3001`);
  console.log(`  ${pc.dim("CMS Admin")}  → http://localhost:3000`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
