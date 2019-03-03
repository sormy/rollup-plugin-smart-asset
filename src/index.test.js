jest.mock("fs", () => ({ readFile: jest.fn(), stat: jest.fn(), copyFileSync: jest.fn() }))
jest.mock("mkdirp", () => jest.fn())
jest.mock("asset-hash", () => ({ getHash: jest.fn() }))

import {
  readFile as readFileMock,
  stat as statMock,
  copyFileSync as copyFileSyncMock,
} from "fs"

import { getHash as getHashMock } from "asset-hash"

import mkdirpMock from "mkdirp"

import smartAsset from "."

const idComment = "/* loaded by smart-asset */"

test("plugin has valid name", async () => {
  const plugin = await smartAsset()
  expect(plugin.name).toBe("smart-asset")
})

test("load() runs for selected extensions", async () => {
  const options = { extensions: [".png", ".gif"] }

  const jsResult = await smartAsset(options).load("test.js")
  expect(jsResult).toBe(undefined)

  const pngResult = await smartAsset(options).load("test.png")
  expect(pngResult).not.toBe(undefined)

  const oggResult = await smartAsset(options).load("test.gif")
  expect(oggResult).not.toBe(undefined)
})

test("load(), rebase mode, returns rebased url as exports", async () => {
  const options = { url: "rebase", extensions: [".png"] }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default "test.png"`)
})

test("load(), rebase mode with keepImport, returns rebased url as exports", async () => {
  const options = { url: "rebase", keepImport: true, extensions: [".png"] }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default require("./test.png")`)
})

test("load(), rebase mode, uses rebasePath", async () => {
  const options = { url: "rebase", extensions: [".png"], rebasePath: "node_modules" }
  const result = await smartAsset(options).load("node_modules/test/assets/test.png")

  expect(result).toEqual(`${idComment}\nexport default "test/assets/test.png"`)
})

test("load(), rebase mode with keepImport, uses rebasePath", async () => {
  const options = { url: "rebase", keepImport: true, extensions: [".png"], rebasePath: "node_modules" }
  const result = await smartAsset(options).load("node_modules/test/assets/test.png")

  expect(result).toEqual(`${idComment}\nexport default require("./test/assets/test.png")`)
})
test("load(), rebase mode, uses publicPath", async () => {
  const options = { url: "rebase", extensions: [".png"], rebasePath: "node_modules", publicPath: "/vendor" }
  const result = await smartAsset(options).load("node_modules/test/assets/test.png")

  expect(result).toEqual(`${idComment}\nexport default "/vendor/test/assets/test.png"`)
})

test("load(), inline mode, returns inlined url as exports", async () => {
  statMock.mockImplementation((path, callback) => callback(null, { size: 1024 }))
  readFileMock.mockImplementation((path, callback) => callback(null, Buffer.from("text")))

  const options = { url: "inline", extensions: [".txt"] }
  const result = await smartAsset(options).load("test.txt")

  expect(statMock).toBeCalledWith("test.txt", expect.anything())
  expect(readFileMock).toBeCalledWith("test.txt", expect.anything())
  expect(result).toEqual(`${idComment}\nexport default "data:text/plain;base64,dGV4dA=="`)
})

test("load(), inline mode, fallback to copy if maxSize exceeded", async () => {
  statMock.mockImplementation((path, callback) => callback(null, { size: 1025 }))
  readFileMock.mockImplementation((path, callback) => callback(null, Buffer.from("text")))

  const options = { url: "inline", extensions: [".txt"], maxSize: 1 }
  const result = await smartAsset(options).load("test.txt")

  expect(statMock).toBeCalledWith("test.txt", expect.anything())
  expect(result).toEqual(`${idComment}\nexport default "test.txt"`)
})

test("load(), copy mode, returns asset name as exports", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default "test.png"`)
})

test("load(), copy mode with keepImport, returns asset name as exports", async () => {
  const options = { url: "copy", keepImport: true, extensions: [".png"] }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default require("./test.png")`)
})

test("load(), copy mode with keepImport with assetsPath, returns asset name as exports", async () => {
  const options = { url: "copy", keepImport: true, extensions: [".png"], assetsPath: "assets" }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default require("./assets/test.png")`)
})

test("load(), copy mode, uses publicPath (no ending slash)", async () => {
  const options = { url: "copy", extensions: [".png"], publicPath: "assets" }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default "assets/test.png"`)
})

test("load(), copy mode, uses publicPath (with ending slash)", async () => {
  const options = { url: "copy", extensions: [".png"], publicPath: "assets/" }
  const result = await smartAsset(options).load("test.png")

  expect(result).toEqual(`${idComment}\nexport default "assets/test.png"`)
})

test("load(), copy mode, uses useHash", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], useHash: true }
  const result = await smartAsset(options).load("test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual(`${idComment}\nexport default "0123456789.png"`)
})

test("load(), copy mode, uses keepName", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], useHash: true, keepName: true }
  const result = await smartAsset(options).load("test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual(`${idComment}\nexport default "test~0123456789.png"`)
})

test("load(), copy mode, uses nameFormat without hash", async () => {
  const options = { url: "copy", extensions: [".png"], nameFormat: "[name][ext]" }
  const result = await smartAsset(options).load("test.png")

  expect(getHashMock).not.toBeCalled()
  expect(result).toEqual(`${idComment}\nexport default "test.png"`)
})

test("load(), copy mode, uses nameFormat with hash", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], nameFormat: "[name][ext]?[hash]" }
  const result = await smartAsset(options).load("test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual(`${idComment}\nexport default "test.png?0123456789"`)
})

test("load(), copy mode, uses hashOptions", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const hashOptions = { hash: "sha1", encoding: "hex", maxLength: 32 }
  const options = { url: "copy", extensions: [".png"], useHash: true, hashOptions }
  const result = await smartAsset(options).load("test.png")

  expect(getHashMock).toBeCalledWith("test.png", hashOptions)
  expect(result).toEqual(`${idComment}\nexport default "0123456789.png"`)
})

test("load(), unknown mode, gracefully fails", async () => {
  const options = { url: "unknown", extensions: [".png"] }
  const plugin = smartAsset(options)
  plugin.warn = jest.fn()
  const result = await plugin.load("test.png")

  expect(result).toEqual(undefined)
  expect(plugin.warn).toBeCalled()
})

test("transform() calls load()", async () => {
  const options = { url: "rebase", extensions: [".png"] }
  const plugin = smartAsset(options)
  const loadMock = jest.fn(() => "stub")
  plugin.load = loadMock
  const result = await plugin.transform("anything", "test.png")

  expect(result.code).toEqual("stub")
  expect(loadMock).toBeCalledWith("test.png")
})

test("transform() doesn't call load() if content was loaded by this plugin", async () => {
  const options = { url: "rebase", extensions: [".png"] }
  const plugin = smartAsset(options)
  const loadMock = jest.fn()
  plugin.load = loadMock
  const result = await plugin.transform("/* loaded by smart-asset */ anything", "test.png")

  expect(result).toEqual(undefined)
  expect(loadMock).not.toBeCalled()
})

test("generateBundle(), copy mode, copies assets", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.load("test1.png")
  await plugin.load("test2.png")
  plugin.generateBundle(outputOptions, {}, true)
  plugin.generateBundle(outputOptions, {}, true) // should be ignored

  expect(mkdirpMock).toBeCalledTimes(1)
  expect(mkdirpMock).toBeCalledWith("dist")

  expect(copyFileSyncMock).toBeCalledTimes(2)
  expect(copyFileSyncMock).nthCalledWith(1, "test1.png", "dist/test1.png")
  expect(copyFileSyncMock).nthCalledWith(2, "test2.png", "dist/test2.png")
})

test("generateBundle(), copy mode, uses assetsPath", async () => {
  const options = { url: "copy", extensions: [".png"], assetsPath: "assets" }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.load("test1.png")
  plugin.generateBundle(outputOptions, {}, true)

  expect(copyFileSyncMock).toBeCalledWith("test1.png", "dist/assets/test1.png")
})

test("generateBundle(), copy mode, doesn't copy if isWrite is false", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.load("test1.png")
  plugin.generateBundle(outputOptions, {}, false)

  expect(copyFileSyncMock).toBeCalledTimes(0)
})

test("generateBundle(), copy mode, warn on copy error", async () => {
  copyFileSyncMock.mockImplementation(() => { throw new Error() })

  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  plugin.warn = jest.fn()

  await plugin.load("test1.png")
  plugin.generateBundle(outputOptions, {}, true)

  expect(plugin.warn).toBeCalled()
})

test("generateBundle(), copy mode, warn on directory creation error", async () => {
  mkdirpMock.mockImplementation(() => { throw new Error() })

  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  plugin.warn = jest.fn()

  await plugin.load("test1.png")
  plugin.generateBundle(outputOptions, {}, true)

  expect(plugin.warn).toBeCalled()
})
