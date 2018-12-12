# Rollup Smart Asset Plugin

## Overview

Rollup plugin to rebase, inline or copy assets referenced from the code.

Inspired by:

- <https://github.com/sebastian-software/postcss-smart-asset>
- <https://github.com/rollup/rollup-plugin-url>

`postcss-smart-asset` works well when you need to bundle assets referenced from css,
but doesn't work for JS assets.

`rollup-plugin-url` has fewer options than `postcss-smart-asset`, doesn't work
as rollup transform and has LGPL 3 license (as of 2018/12/04).

This plugin is doing the same as `rollup-plugin-url` in the way
`postcss-smart-asset` works for imports from JavaScript with MIT license.

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
  ]
}
```

## Configuration

General options:

- `url`: Mode: `rebase` (default), `inline` or `copy`.
- `extensions`: What file extensions to process, defaults to
  `[".svg", ".gif", ".png", ".jpg"]`

`rebase` options:

- `publicPath`: Reference file from JS using this path, relative to html page
  where asset is referenced. Could be relative, absolute or CDN.
- `rebasePath`: Rebase all asset urls to this directory, defaults to current directory.

`inline` options:

- `maxSize`: Max file size to inline, fallback is `copy` mode, defaults to `14` kbytes.

`copy` options:

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

## TODO

- port remaining options from `postcss-smart-asset` and `rollup-plugin-url`
- test different rollup output options
- fix source maps?

PRs are very welcome!

## License

MIT
