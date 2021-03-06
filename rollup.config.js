import babel from "@rollup/plugin-babel"

export default {
  input: "src/smartAsset.js",
  plugins: [
    babel({
      babelHelpers: "bundled"
    })
  ],
  external: [
    "util",
    "fs",
    "path",
    "crypto",
    "mkdirp",
    "mime",
    "magic-string",
    "big.js",
    "rollup-pluginutils"
  ],
  output: [
    {
      file: "dist/rollup-plugin-smart-asset.cjs.js",
      format: "cjs",
      exports: "auto"
    },
    {
      file: "dist/rollup-plugin-smart-asset.esm.js",
      format: "esm",
      exports: "auto"
    }
  ]
}
