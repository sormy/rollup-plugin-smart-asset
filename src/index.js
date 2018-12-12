import { join, extname, dirname, parse } from "path"

import { copy } from "fs-extra"
import { getHash } from "asset-hash"

function moduleMatchesExtensions(fileName, extensions) {
  const ext = extname(fileName)
  return extensions.indexOf(ext) !== -1
}

function getPublicPathPrefix(publicPath) {
  return publicPath
    ? (publicPath.substr(-1) === "/" ? publicPath : publicPath + "/")
    : ""
}

async function getAssetName(fileName, options) {
  const modulePath = parse(fileName)

  if (options.nameFormat) {
    const hash = await getHash(fileName, options.hashOptions)

    return options.nameFormat
      .replace(/\[name\]/g, modulePath.name)
      .replace(/\[ext\]/g, modulePath.ext)
      .replace(/\[hash\]/g, hash)
  }

  if (options.useHash) {
    const hash = await getHash(fileName, options.hashOptions)

    return options.keepName
      ? modulePath.name + "_" + hash + modulePath.ext
      : hash + modulePath.ext
  }

  return modulePath.name + modulePath.ext
}

export default (initialOptions = {}) => {
  const defaultOptions = {
    publicPath: false,  // relative to html page where asset is referenced
    assetsPath: false,  // relative to rollup output
    useHash: false,     // alias for nameFormat: [hash][ext]
    keepName: false,    // alias for nameFormat: [name]_[hash][ext] (requires useHash)
    nameFormat: false,  // valid patterns: [name] | [ext] | [hash]
    hashOptions: {},    // any valid asset-hash options
    extensions: [       // list of extensions to process by this plugin
      ".svg",
      ".gif",
      ".png",
      ".jpg",
    ],
  }

  const options = Object.assign({}, defaultOptions, initialOptions)

  let assets = []

  return {
    name: "smart-asset",

    async transform(source, id) {
      if (moduleMatchesExtensions(id, options.extensions)) {
        const assetName = await getAssetName(id, options)

        assets.push({ assetName: assetName, fileName: id })

        const assetUrl = getPublicPathPrefix(options.publicPath) + assetName
        const code = `export default ${JSON.stringify(assetUrl)}`

        return { code }
      }
    },

    async generateBundle(outputOptions, bundle, isWrite) {
      if (isWrite) {
        const assetsRootPath = join(dirname(outputOptions.file), options.assetsPath || "")

        for (const asset of assets) {
          const assetPath = join(assetsRootPath, asset.assetName)
          await copy(asset.fileName, assetPath)
        }

        assets = []
      }
    },
  }
}
