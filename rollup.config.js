import babel from "rollup-plugin-babel"

export default {
  input: "src/index.js",
  plugins: [ babel() ],
  external: [ "util", "fs", "path", "mkdirp", "asset-hash", "mime", "magic-string" ],
  output: [
    { file: "dist/rollup-plugin-smart-asset.cjs.js", format: "cjs" },
    { file: "dist/rollup-plugin-smart-asset.esm.js", format: "esm" },
  ],
}
