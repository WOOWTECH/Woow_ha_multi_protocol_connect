import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// The merged, tabbed shell → the single woow_multi_protocol integration.
const bundles = [
  {
    src: "dist/woow-multi-protocol-panel.js",
    dest: "../custom_components/woow_multi_protocol/frontend/woow-multi-protocol-panel.js",
  },
];

// Legacy per-protocol bundles → the standalone integrations (still shipped
// until those are retired).
for (const proto of ["knx", "dmx", "modbus"]) {
  bundles.push({
    src: `dist/woow-${proto}-panel.js`,
    dest: `../custom_components/woow_${proto}/frontend/woow-${proto}-panel.js`,
  });
}

for (const { src, dest } of bundles) {
  const srcPath = resolve(root, src);
  const destPath = resolve(root, dest);

  if (!existsSync(srcPath)) {
    console.error(`Missing: ${srcPath}`);
    process.exit(1);
  }

  copyFileSync(srcPath, destPath);
  console.log(`Deployed: ${dest}`);
}

console.log("All panels deployed.");
