import { promisify } from "util"
import { stat, readFile, copyFileSync } from "fs"
import { join, extname, dirname, parse, relative } from "path"

import { sync as mkdirpSync } from "mkdirp"
import { getHash } from "asset-hash"
import { getType } from "mime"
import MagicString from "magic-string"

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

function getImportPathPrefix(assetsPath) {
  return "." + (assetsPath ? "/" + assetsPath : "") + "/"
}

async function getAssetName(fileName, options) {
  const modulePath = parse(fileName)

  if (options.nameFormat) {
    const hash = /\[hash\]/.test(options.nameFormat)
      ? await getHash(fileName, options.hashOptions)
      : ""

    return options.nameFormat
      .replace(/\[name\]/g, modulePath.name)
      .replace(/\[ext\]/g, modulePath.ext)
      .replace(/\[hash\]/g, hash)
  }

  if (options.useHash) {
    const hash = await getHash(fileName, options.hashOptions)

    return options.keepName
      ? modulePath.name + "~" + hash + modulePath.ext
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
    url: "rebase",      // choose mode: "rebase" | "inline" | "copy"
    rebasePath: ".",    // rebase all asset urls to this directory
    maxSize: 14,        // max size in kbytes that will be inlined, fallback is copy
    publicPath: null,   // relative to html page where asset is referenced
    assetsPath: null,   // relative to rollup output
    useHash: false,     // alias for nameFormat: [hash][ext]
    keepName: false,    // alias for nameFormat: [name]_[hash][ext] (requires useHash)
    nameFormat: null,   // valid patterns: [name] | [ext] | [hash]
    hashOptions: {},    // any valid asset-hash options
    keepImport: false,  // keeps import to let another bundler to process the import
    sourceMap: false,   // add source map if transform() hook is invoked
    extensions: [       // list of extensions to process by this plugin
      ".svg",
      ".gif",
      ".png",
      ".jpg",
    ],
  }

  const options = Object.assign({}, defaultOptions, initialOptions)

  const idComment = "/* loaded by smart-asset */"

  let assetsToCopy = []

  const plugin = {
    name: "smart-asset",

    async load(id) {
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
          value = options.keepImport
            ? getImportPathPrefix(options.assetsPath) + assetName
            : getPublicPathPrefix(options.publicPath) + assetName
        } else if (mode === "rebase") {
          const assetName = relative(options.rebasePath, id)
          value = options.keepImport
            ? "./" + assetName
            : getPublicPathPrefix(options.publicPath) + assetName
        } else {
          this.warn(`Invalid mode: ${mode}`)
          return
        }

        const code = options.keepImport && (mode === "copy" || mode === "rebase")
          ? `${idComment}\nexport default require(${JSON.stringify(value)})`
          : `${idComment}\nexport default ${JSON.stringify(value)}`

        return code
      }
    },

    // some plugins could load asset content before this plugin's load() hook
    // will never be executed, but transform() hook works even in that case
    async transform(code, id) {
      const alreadyProcessed = code.startsWith(idComment)

      if (!alreadyProcessed) {
        const newCode = await plugin.load.call(this, id)

        if (newCode) {
          if (options.sourceMap) {
            const magicString = new MagicString(code)
            magicString.overwrite(0, code.length - 1, newCode)
            return {
              code: magicString.toString(),
              map: magicString.generateMap({ hires: true }),
            }
          } else {
            return {
              code: newCode,
              map: { mappings: "" },
            }
          }
        }
      }
    },

    generateBundle(outputOptions, bundle, isWrite) {
      if (isWrite && assetsToCopy.length) {
        const assetsRootPath = join(dirname(outputOptions.file), options.assetsPath || "")

        let dirInitialized = false

        for (const asset of assetsToCopy) {
          const assetPath = join(assetsRootPath, asset.assetName)

          // since all assets are going to the same directory it is enough to
          // create directory only once and free IOPS for more valuable things
          try {
            if (!dirInitialized) {
              mkdirpSync(dirname(assetPath))
              dirInitialized = true
            }
          } catch (e) {
            this.warn(`Unable to create directory: ${dirname(assetPath)}`)
          }

          try {
            copyFileSync(asset.fileName, assetPath)
          } catch (e) {
            this.warn(`Unable to copy asset: ${asset.fileName}`)
          }
        }

        assetsToCopy = []
      }
    },
  }

  return plugin
}
