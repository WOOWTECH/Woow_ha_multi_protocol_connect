import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const protocols = ["knx", "dmx", "modbus"];

export default protocols.map((proto) => ({
  input: `src/panels/woow-${proto}-panel.js`,
  output: {
    file: `dist/woow-${proto}-panel.js`,
    format: "es",
    sourcemap: false,
  },
  plugins: [resolve(), terser()],
}));
