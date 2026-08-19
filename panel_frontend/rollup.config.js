import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

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

export default [mergedBundle];
