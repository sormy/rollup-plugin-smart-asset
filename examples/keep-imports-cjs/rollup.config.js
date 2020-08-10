import smartAsset from "../../dist/rollup-plugin-smart-asset.esm"

export default {
  input: "src/index.js",
  plugins: [
    smartAsset({
      url: "copy",
      keepImport: true,
      useHash: false,
      keepName: true,
      extensions: [".txt"]
    })
  ],
  output: {
    dir: "dist",
    format: "cjs"
  }
}
