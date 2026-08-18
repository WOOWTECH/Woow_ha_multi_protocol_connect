import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

// Legacy per-protocol bundles (still consumed by the standalone woow_knx /
// woow_dmx / woow_modbus integrations until they are retired).
const protocols = ["knx", "dmx", "modbus"];

const legacyBundles = protocols.map((proto) => ({
  input: `src/panels/woow-${proto}-panel.js`,
  output: {
    file: `dist/woow-${proto}-panel.js`,
    format: "es",
    sourcemap: false,
  },
  plugins: [resolve(), terser()],
}));

// The merged, tabbed shell deployed into the single woow_multi_protocol
// integration. Bundles all three protocol panels behind one custom element.
const mergedBundle = {
  input: "src/woow-multi-protocol-panel.js",
  output: {
    file: "dist/woow-multi-protocol-panel.js",
    format: "es",
    sourcemap: false,
  },
  plugins: [resolve(), terser()],
};

export default [...legacyBundles, mergedBundle];
