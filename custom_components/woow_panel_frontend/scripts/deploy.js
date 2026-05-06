import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const protocols = ["knx", "dmx", "modbus"];

for (const proto of protocols) {
  const src = resolve(root, `dist/woow-${proto}-panel.js`);
  const dest = resolve(root, `../woow_${proto}/frontend/woow-${proto}-panel.js`);

  if (!existsSync(src)) {
    console.error(`Missing: ${src}`);
    process.exit(1);
  }

  copyFileSync(src, dest);
  console.log(`Deployed: woow-${proto}-panel.js`);
}

console.log("All panels deployed.");
