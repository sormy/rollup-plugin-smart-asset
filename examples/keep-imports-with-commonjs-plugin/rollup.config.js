import commonjs from "@rollup/plugin-commonjs";
import smartAsset from "../../dist/rollup-plugin-smart-asset.esm"

export default {
  input: "src.js",
  output: {
    format: "esm",
    file: "dist.js",
  },
  plugins: [
    commonjs({
      transformMixedEsModules: true,
      requireReturnsDefault: true,
    }),
    smartAsset({
      keepImport: true,
      extensions: [".svg", ".css"]
    })
  ],
};
