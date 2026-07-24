#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_prompts = __toESM(require("prompts"));
var import_picocolors = __toESM(require("picocolors"));
var import_path = require("path");
var import_fs = require("fs");
var TEMPLATES = [
  { title: "Blog", value: "blog", description: "Blog com posts, categorias e SEO" }
];
async function main() {
  const argProject = process.argv[2];
  console.log();
  console.log(`  ${import_picocolors.default.bold(import_picocolors.default.magenta("Brasa CMS"))} \u2014 Create a new storefront`);
  console.log();
  const response = await (0, import_prompts.default)(
    [
      {
        type: argProject ? null : "text",
        name: "projectName",
        message: "Nome do projeto:",
        initial: "meu-site",
        validate: (v) => /^[a-z0-9-]+$/.test(v) || "Use apenas letras minusculas, numeros e hifens"
      },
      {
        type: "select",
        name: "template",
        message: "Template:",
        choices: TEMPLATES.map((t) => ({
          title: t.title,
          value: t.value,
          description: t.description
        }))
      },
      {
        type: "text",
        name: "cmsUrl",
        message: "URL do CMS (ou Enter pra local):",
        initial: "http://localhost:3000"
      }
    ],
    {
      onCancel: () => {
        console.log(import_picocolors.default.red("\n  Cancelado.\n"));
        process.exit(0);
      }
    }
  );
  const projectName = argProject || response.projectName;
  const template = response.template;
  const cmsUrl = response.cmsUrl;
  const targetDir = (0, import_path.resolve)(process.cwd(), projectName);
  if ((0, import_fs.existsSync)(targetDir)) {
    console.log(import_picocolors.default.red(`
  Diretorio "${projectName}" ja existe.
`));
    process.exit(1);
  }
  const templateDir = (0, import_path.resolve)(__dirname, "..", "templates", template);
  if (!(0, import_fs.existsSync)(templateDir)) {
    console.log(import_picocolors.default.red(`
  Template "${template}" nao encontrado.
`));
    process.exit(1);
  }
  console.log();
  console.log(`  ${import_picocolors.default.cyan("Criando")} ${projectName}...`);
  (0, import_fs.mkdirSync)(targetDir, { recursive: true });
  (0, import_fs.cpSync)(templateDir, targetDir, { recursive: true });
  const pkgPath = (0, import_path.join)(targetDir, "package.json");
  if ((0, import_fs.existsSync)(pkgPath)) {
    let pkg = (0, import_fs.readFileSync)(pkgPath, "utf-8");
    pkg = pkg.replace(/"name":\s*"[^"]*"/, `"name": "${projectName}"`);
    (0, import_fs.writeFileSync)(pkgPath, pkg);
  }
  const envContent = [
    `CMS_URL=${cmsUrl}`,
    `CMS_API_KEY=`,
    `# Preenchido automaticamente ao conectar com o CMS`
  ].join("\n");
  (0, import_fs.writeFileSync)((0, import_path.join)(targetDir, ".env.local"), envContent + "\n");
  const gitignore = [
    "node_modules",
    ".next",
    ".env.local",
    "dist"
  ].join("\n");
  (0, import_fs.writeFileSync)((0, import_path.join)(targetDir, ".gitignore"), gitignore + "\n");
  console.log(`  ${import_picocolors.default.green("Pronto!")}`);
  console.log();
  console.log(`  ${import_picocolors.default.bold("Proximo passo:")}`);
  console.log();
  console.log(`    cd ${projectName}`);
  console.log(`    pnpm install`);
  console.log(`    pnpm dev`);
  console.log();
  console.log(`  ${import_picocolors.default.dim("Storefront")} \u2192 http://localhost:3001`);
  console.log(`  ${import_picocolors.default.dim("CMS Admin")}  \u2192 http://localhost:3000`);
  console.log();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
