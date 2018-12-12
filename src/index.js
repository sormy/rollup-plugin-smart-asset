import { promisify } from "util"
import { stat, readFile } from "fs"
import { join, extname, dirname, parse, relative } from "path"

import { copy } from "fs-extra"
import { getHash } from "asset-hash"
import { getType } from "mime"

const statAsync = promisify(stat)
const readFileAsync = promisify(readFile)

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

async function detectOpMode(fileName, options) {
  if (options.url === "inline" && options.maxSize) {
    const stat = await statAsync(fileName)
    return stat.size <= options.maxSize * 1024 ? "inline" : "copy"
  }
  return options.url
}

export default (initialOptions = {}) => {
  const defaultOptions = {
    // choose mode
    url: "rebase",      // "rebase" | "inline" | "copy"

    // rebase mode
    rebasePath: ".",    // rebase all asset urls to this directory

    // inline mode
    maxSize: 14,        // max size in kbytes that will be inlined, fallback is copy

    // copy mode
    publicPath: false,  // relative to html page where asset is referenced
    assetsPath: false,  // relative to rollup output
    useHash: false,     // alias for nameFormat: [hash][ext]
    keepName: false,    // alias for nameFormat: [name]_[hash][ext] (requires useHash)
    nameFormat: false,  // valid patterns: [name] | [ext] | [hash]
    hashOptions: {},    // any valid asset-hash options

    // all modes
    extensions: [       // list of extensions to process by this plugin
      ".svg",
      ".gif",
      ".png",
      ".jpg",
    ],
  }

  const options = Object.assign({}, defaultOptions, initialOptions)

  let assetsToCopy = []

  return {
    name: "smart-asset",

    async transform(source, id) {
      if (moduleMatchesExtensions(id, options.extensions)) {
        const mode = await detectOpMode(id, options)

        let value

        if (mode === "inline") {
          const content = await readFileAsync(id)
          const base64 = content.toString("base64")
          const mime = getType(id)
          value = `data:${mime};base64,${base64}`
        } else if (mode === "copy") {
          const assetName = await getAssetName(id, options)
          assetsToCopy.push({ assetName: assetName, fileName: id })
          value = getPublicPathPrefix(options.publicPath) + assetName
        } else { // rebase
          value = relative(options.rebasePath, id)
        }

        const code = `export default ${JSON.stringify(value)}`

        return { code }
      }
    },

    async generateBundle(outputOptions, bundle, isWrite) {
      if (isWrite && assetsToCopy.length) {
        const assetsRootPath = join(dirname(outputOptions.file), options.assetsPath || "")

        for (const asset of assetsToCopy) {
          const assetPath = join(assetsRootPath, asset.assetName)
          try {
            await copy(asset.fileName, assetPath)
          } catch (e) {
            this.warn(`Unable to copy asset: ${asset.fileName}`)
          }
        }

        assetsToCopy = []
      }
    },
  }
}
