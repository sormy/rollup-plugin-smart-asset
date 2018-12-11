# Rollup Smart Asset Plugin

## About

Rollup plugin to rebase, inline or copy assets referenced from the code.

NOTE: only **copy** is implemented as of now.

Inspired by:

- https://github.com/sebastian-software/postcss-smart-asset
- https://github.com/rollup/rollup-plugin-url

`postcss-smart-asset` works well when you need to bundle assets referenced from css,
but doesn't work for JS assets.

`rollup-plugin-url` has fewer options than `postcss-smart-asset`, doesn't work
as rollup transform and has LGPL 3 license (as of 2018/12/04).

This plugin is targeting to do the same as `postcss-smart-asset` for JS but with MIT license.

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

- `publicPath`: reference file from JS using this path, relative to html page
  where asset is referenced
- `assetsPath`: copy assets to this directory, relative to rollup output
- `useHash`: use hash instead of filename, default to `false`
- `keepName`: use both hash and name (`[name]-[hash][ext]`) if `useHash` is true,
  default to `false`
- `hashOptions`: ...
- `extensions`: what file extensions to process, defaults to `.gif`, `.png`, `.jpg`

## TODO

- unit tests
- port remaining options from `postcss-smart-asset`
- test different rollup output options
- custom asset name
- fix source maps, binary files are included in source maps as of now

PRs are very welcome!

## License

MIT
