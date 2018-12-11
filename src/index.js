import { join, extname, dirname, parse } from "path"

import { copy } from "fs-extra"
import { getHash } from "asset-hash"

function getPublicPathPrefix(publicPath) {
  if (publicPath === "" || publicPath === false || publicPath === undefined || publicPath === null) {
    return ""
  }
  return publicPath.substr(-1) === "/" ? publicPath : publicPath + "/"
}

export default (initialOptions = {}) => {
  const defaultOptions = {
    publicPath: false,  // relative to html page where asset is referenced
    assetsPath: false,  // relative to rollup output
    useHash: false,
    keepName: false,
    hashOptions: {},
    extensions: [".gif", ".png", ".jpg"]
  }

  const options = Object.assign({}, defaultOptions, initialOptions)

  let assets = []

  return {
    name: "smart-asset",

    async transform(source, id) {
      const moduleExt = extname(id)
      const matchesExt = options.extensions.indexOf(moduleExt) !== -1

      if (matchesExt) {
        const modulePath = parse(id)

        let assetName
        if (options.useHash) {
          const assetHash = await getHash(id, options.hashOptions)
          assetName = options.keepName
            ? modulePath.name + "-" + assetHash + modulePath.ext
            : assetHash + modulePath.ext
        } else {
          assetName = modulePath.name + modulePath.ext
        }

        assets.push({ assetName: assetName, fileName: id })

        const assetUrl = getPublicPathPrefix(options.publicPath) + assetName

        return {
          code: `export default ${JSON.stringify(assetUrl)}`,
          map: null,
        }
      }
    },

    async generateBundle(outputOptions, bundle, isWrite) {
      if (isWrite) {
        const assetsRootPath = join(dirname(outputOptions.file), options.assetsPath)

        for (const asset of assets) {
          const assetPath = join(assetsRootPath, asset.assetName)
          await copy(asset.fileName, assetPath)
        }

        assets = []
      }
    },
  }
}
