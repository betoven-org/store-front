import { execSync } from "child_process";

execSync(
  "npx esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.js --external:prompts --external:picocolors",
  { stdio: "inherit" }
);
