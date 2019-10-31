import { promisify } from "util"
import { stat, readFile, copyFileSync } from "fs"
import { join, extname, dirname, parse, relative } from "path"

import { sync as mkdirpSync } from "mkdirp"
import { getType } from "mime"
import MagicString from "magic-string"

import { hashFile } from "./hashFile"

const statAsync = promisify(stat)
const readFileAsync = promisify(readFile)

function moduleMatchesExtList(fileName, extensions) {
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

async function getAssetName(fileName, opts) {
  const modulePath = parse(fileName)

  const hash = (opts.nameFormat && /\[hash\]/.test(opts.nameFormat)) || opts.useHash
    ? await hashFile(fileName, opts.hashOptions.hash, opts.hashOptions.encoding,
      opts.hashOptions.maxLength)
    : ""

  if (opts.nameFormat) {
    return opts.nameFormat
      .replace(/\[name\]/g, modulePath.name)
      .replace(/\[ext\]/g, modulePath.ext)
      .replace(/\[hash\]/g, hash)
  }

  if (opts.useHash) {
    return opts.keepName
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

async function readFileAsDataURL(fileName) {
  const content = await readFileAsync(fileName)
  const base64 = content.toString("base64")
  const mime = getType(fileName)
  return `data:${mime};base64,${base64}`
}

export default (initialOptions = {}) => {
  const defaultOptions = {
    url: "rebase",        // mode: "rebase" | "inline" | "copy"
    rebasePath: ".",      // rebase all asset urls to this directory
    maxSize: 14,          // max size in kbytes that will be inlined, fallback is copy
    publicPath: null,     // relative to html page where asset is referenced
    assetsPath: null,     // relative to rollup output
    useHash: false,       // alias for nameFormat: [hash][ext]
    keepName: false,      // alias for nameFormat: [name]~[hash][ext] (requires useHash)
    nameFormat: null,     // valid patterns: [name] | [ext] | [hash]
    hashOptions: {        // hash options:
      hash: "sha1",       // "sha1", "md5", "metrohash128", "xxhash64" etc or Hash-like class
      encoding: "base52", // "hex", "base64", "base62", "base58", "base52" etc
      maxLength: 8        // truncate final digest to specific length
    },
    keepImport: false,    // keeps import to let another bundler to process the import
    sourceMap: false,     // add source map if transform() hook is invoked
    extensions: [         // list of extensions to process by this plugin
      ".svg",
      ".gif",
      ".png",
      ".jpg"
    ]
  }

  const options = {
    ...defaultOptions,
    ...initialOptions,
    hashOptions: {
      ...defaultOptions.hashOptions,
      ...initialOptions.hashOptions
    }
  }

  const idComment = "/* loaded by smart-asset */"

  const assetsToCopy = []

  const plugin = {
    name: "smart-asset",

    async load(id) {
      if (moduleMatchesExtList(id, options.extensions)) {
        const mode = await detectOpMode(id, options)

        let value

        if (mode === "inline") {
          value = await readFileAsDataURL(id)
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
              map: magicString.generateMap({ hires: true })
            }
          } else {
            return {
              code: newCode,
              map: { mappings: "" }
            }
          }
        }
      }
    },

    generateBundle(outputOptions, bundle, isWrite) {
      if (isWrite && assetsToCopy.length) {
        const outputDir = outputOptions.dir ? outputOptions.dir : dirname(outputOptions.file)
        const assetsRootPath = join(outputDir, options.assetsPath || "")

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

        assetsToCopy.length = 0
      }
    }
  }

  return plugin
}
