#!/usr/bin/env tsx
/**
 * Brasa CMS — Manifest Extractor
 *
 * Scans sections/ directory for exported `schema` definitions
 * and generates the manifest.json automatically.
 *
 * Usage:
 *   npx tsx packages/brasa-core/src/extract-manifest.ts ./sections ./manifest.json
 *
 * Or in package.json:
 *   "manifest:gen": "tsx packages/brasa-core/src/extract-manifest.ts ./sections ./manifest.json"
 */

import { readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { resolve, relative, basename, extname, join } from "path";
import type { BrasaManifest, SectionSchema } from "./manifest";
import type { SectionDefinition } from "./section-schema";

const args = process.argv.slice(2);
const sectionsDir = resolve(args[0] || "./sections");
const outputPath = resolve(args[1] || "./manifest.json");

if (!existsSync(sectionsDir)) {
  console.error(`Sections directory not found: ${sectionsDir}`);
  process.exit(1);
}

function findSectionFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Look for index.tsx or [DirName].tsx inside
      const indexFile = join(fullPath, "index.tsx");
      const namedFile = join(fullPath, `${entry}.tsx`);
      if (existsSync(indexFile)) files.push(indexFile);
      else if (existsSync(namedFile)) files.push(namedFile);
      // Also recurse
      files.push(...findSectionFiles(fullPath));
    } else if (
      (entry.endsWith(".tsx") || entry.endsWith(".ts")) &&
      !entry.startsWith("_") &&
      !entry.includes(".test.") &&
      !entry.includes(".spec.")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function extractSchema(filePath: string): Promise<SectionDefinition | null> {
  try {
    // Dynamic import the module
    const mod = await import(filePath);

    if (mod.schema && typeof mod.schema === "object" && mod.schema.key) {
      return mod.schema as SectionDefinition;
    }

    return null;
  } catch (err) {
    console.warn(`  ⚠ Could not extract schema from ${relative(process.cwd(), filePath)}: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`\n  Brasa CMS — Extracting manifest`);
  console.log(`  Sections: ${sectionsDir}`);
  console.log(`  Output:   ${outputPath}\n`);

  const files = findSectionFiles(sectionsDir);
  console.log(`  Found ${files.length} section files\n`);

  const sections: SectionSchema[] = [];

  for (const file of files) {
    const definition = await extractSchema(file);
    if (definition) {
      const relativePath = relative(sectionsDir, file);
      const sectionPath = `sections/${relativePath.replace(extname(relativePath), "")}`;

      const schema: SectionSchema = {
        key: definition.key,
        title: definition.title,
        description: definition.description,
        group: definition.group,
        path: sectionPath,
        props: definition.props,
      };

      sections.push(schema);
      console.log(`  ✓ ${definition.key} (${definition.group || "Outros"})`);
    }
  }

  // Sort by group then title
  sections.sort((a, b) => {
    const groupCmp = (a.group || "z").localeCompare(b.group || "z");
    if (groupCmp !== 0) return groupCmp;
    return a.title.localeCompare(b.title);
  });

  const manifest: BrasaManifest = {
    generatedAt: new Date().toISOString(),
    sections,
  };

  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\n  ✓ Manifest generated: ${sections.length} sections`);
  console.log(`  → ${outputPath}\n`);
}

main().catch((err) => {
  console.error("Extract failed:", err);
  process.exit(1);
});
