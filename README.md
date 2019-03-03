# Rollup Smart Asset Plugin

## Overview

Rollup plugin to rebase, inline or copy assets referenced from the JavaScript code.

Inspired by:

- <https://github.com/sebastian-software/postcss-smart-asset>
- <https://github.com/rollup/rollup-plugin-url>

## Alternatives

`postcss-smart-asset` works well when you need to bundle assets referenced from
CSS, but doesn't work for assets imported from JavaScript.

`rollup-plugin-url` has fewer options, doesn't work if asset is already loaded
by another plugin (by sourcemaps, for example) and, what is most important, has
non permissive license (as of 2018-03-02). This plugin has also `keepImport`
feature that is not available in `rollup-plugin-url`.

## Usage

```js
import smartAsset from 'rollup-plugin-smart-asset'

const smartAssetOpts = { ... }

export default {
  input: 'src/index.tsx',
  output: {
    file: 'dist/index.js',
    format: 'iife'
  },
  plugins: [
    ...
    smartAsset(smartAssetOpts)
    ...
  ]
}
```

## Configuration

For libraries it is recommended to use `inline` or `copy` mode with `keepImport`
option to delegate bundling to consumer's package bundler. Asset hasing is not
needed for this case and it is safe to set `useHash: false` and `keepName: true`.

For applications it is also recommended to use `inline` or `copy` mode with
enabled by default hashing.

Default settings are set to be the same as in `postcss-smart-asset` to have one
config for both of them.

Main options:

- `url`: Mode: `rebase` (default), `inline` and `copy`
- `extensions`: What file extensions to process, defaults to
  `[".svg", ".gif", ".png", ".jpg"]`

## Mode: rebase

Rebase asset references to be relative to specific directory.

Output:

```js
// without keepImport
export default "public_path_to_asset"
// with keepImport
export default require("relate_path_to_asset_from_bundle")
```

Options:

- `publicPath`: Reference file from JS using this path, relative to html page
  where asset is referenced. Could be relative, absolute or CDN.
- `rebasePath`: Rebase all asset urls to this directory, defaults to current directory.
- `keepImport`: Keep import, so consumer of your package could define their own
  bundle configuration.

## Mode: inline

Inline assets as base64 urls directly in source code.

Keep in mind, all options for `copy` mode will be used if falled back to `copy` mode.

Output:

```js
export default "data:{mimeType};base64,{data}"
```

Options:

- `maxSize`: Max file size to inline, fallback is `copy` mode, defaults to `14` kbytes.

## Mode: copy

Copy asset to target directory and rebase original references to point to it
depending on provided configuration.

Output:

```js
// without keepImport
export default "public_path_to_asset"
// with keepImport
export default require("relate_path_to_asset_from_bundle")
// + file is copied to target directory
```

Options:

- `publicPath`: Reference file from JS using this path, relative to html page
  where asset is referenced. Could be relative, absolute or CDN.
- `assetsPath`: Copy assets to this directory, relative to rollup output.
- `useHash`: Use `[hash][ext]` instead of default `[name][ext]`
- `keepName`: Use both hash and name `[name]-[hash][ext]` if `useHash` is `true`
- `nameFormat`: Use custom name format using these patterns `[name]`, `[ext]`,
  `[hash]`.
- `hashOptions`: See more: <https://github.com/sebastian-software/asset-hash>
  - `hash`: Any valid hashing algorithm e.g. `metrohash128` (default), `metrohash64`,
    `xxhash64`, `xxhash32`, `sha1`, `md5`, ...
  - `encoding`: Any valid encoding for built-in digests `hex`, `base64`, `base62`, ...
  - `maxLength`: Maximum length of returned digest. Keep in mind that reducing it
    increases collison probability.
- `keepImport`: Keep import, so consumer of your package could define their own
  bundle configuration.

## TODO

- port remaining options from `postcss-smart-asset` and `rollup-plugin-url`
- test different rollup output options
- fix sourcemaps in the case when plugin executed in `transform()` hook

## Contribution

PRs are very welcome!

## License

MIT
