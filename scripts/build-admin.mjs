    import { readFileSync, writeFileSync, readdirSync } from "node:fs";
    import { join } from "node:path";
    import { fileURLToPath } from "node:url";
    import { dirname, resolve } from "node:path";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const root = resolve(__dirname, "..");
    const partsDir = join(root, "web/assets/js/admin/parts");
    const output = join(root, "web/assets/js/admin.js");

    const files = readdirSync(partsDir)
      .filter((file) => file.endsWith(".js"))
      .sort((a, b) => a.localeCompare(b));

    const banner = `// AUTO-GERADO por scripts/build-admin.mjs
// Edite os arquivos em web/assets/js/admin/parts/ e rode: npm run build:admin

`;
    const content = files
      .map((file) => `// ===== ${file} =====
` + readFileSync(join(partsDir, file), "utf8").trim())
      .join("");

    writeFileSync(output, banner + content + "", "utf8");
    console.log(`Admin JS gerado com ${files.length} partes: ${output}`);
