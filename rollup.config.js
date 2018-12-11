import babel from "rollup-plugin-babel"

export default {
	input: "src/index.js",
  plugins: [ babel() ],
  external: [ "path", "asset-hash", "fs-extra" ],
	output: [
		{ file: "dist/rollup-plugin-smart-asset.cjs.js", format: "cjs" },
		{ file: "dist/rollup-plugin-smart-asset.es.js", format: "es" },
	]
}
