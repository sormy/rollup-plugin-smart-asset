jest.mock("fs-extra", () => ({ copy: jest.fn() }))
jest.mock("asset-hash", () => ({ getHash: jest.fn() }))
jest.mock("fs", () => ({ readFile: jest.fn(), stat: jest.fn() }))

import { readFile as readFileMock, stat as statMock } from "fs"
import { copy as copyMock } from "fs-extra"
import { getHash as getHashMock } from "asset-hash"

import smartAsset from "."

test("plugin has valid name", async () => {
  const plugin = smartAsset()
  expect(plugin.name).toBe("smart-asset")
})

test("transform() runs for selected extensions", async () => {
  const options = { extensions: [".png", ".gif"] }

  const jsResult = await smartAsset(options).transform(undefined, "test.js")
  expect(jsResult).toBe(undefined)

  const pngResult = await smartAsset(options).transform(undefined, "test.png")
  expect(pngResult).not.toBe(undefined)

  const oggResult = await smartAsset(options).transform(undefined, "test.gif")
  expect(oggResult).not.toBe(undefined)
})

test("transform(), rebase mode, returns rebased url as exports", async () => {
  const options = { url: "rebase", extensions: [".png"] }
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(result).toEqual({ code: "export default \"test.png\"" })
})

test("transform(), rebase mode, uses rebasePath", async () => {
  const options = { url: "rebase", extensions: [".png"], rebasePath: "node_modules" }
  const result = await smartAsset(options).transform(undefined, "node_modules/test/assets/test.png")
  expect(result).toEqual({ code: "export default \"test/assets/test.png\"" })
})

test("transform(), rebase mode, uses publicPath", async () => {
  const options = { url: "rebase", extensions: [".png"], rebasePath: "node_modules", publicPath: "/vendor" }
  const result = await smartAsset(options).transform(undefined, "node_modules/test/assets/test.png")
  expect(result).toEqual({ code: "export default \"/vendor/test/assets/test.png\"" })
})

test("transform(), inline mode, returns inlined url as exports", async () => {
  statMock.mockImplementation((path, callback) => callback(null, { size: 1024 }))
  readFileMock.mockImplementation((path, callback) => callback(null, Buffer.from("text")))

  const options = { url: "inline", extensions: [".txt"] }
  const result = await smartAsset(options).transform(undefined, "test.txt")

  expect(statMock).toBeCalledWith("test.txt", expect.anything())
  expect(readFileMock).toBeCalledWith("test.txt", expect.anything())
  expect(result).toEqual({ code: "export default \"data:text/plain;base64,dGV4dA==\"" })
})

test("transform(), inline mode, fallback to copy if maxSize exceeded", async () => {
  statMock.mockImplementation((path, callback) => callback(null, { size: 1025 }))
  readFileMock.mockImplementation((path, callback) => callback(null, Buffer.from("text")))

  const options = { url: "inline", extensions: [".txt"], maxSize: 1 }
  const result = await smartAsset(options).transform(undefined, "test.txt")

  expect(statMock).toBeCalledWith("test.txt", expect.anything())
  expect(result).toEqual({ code: "export default \"test.txt\"" })
})

test("transform(), copy mode, returns asset name as exports", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(result).toEqual({ code: "export default \"test.png\"" })
})

test("transform(), copy mode, uses publicPath (no ending slash)", async () => {
  const options = { url: "copy", extensions: [".png"], publicPath: "assets" }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(result).toEqual({ code: "export default \"assets/test.png\"" })
})

test("transform(), copy mode, uses publicPath (with ending slash)", async () => {
  const options = { url: "copy", extensions: [".png"], publicPath: "assets/" }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(result).toEqual({ code: "export default \"assets/test.png\"" })
})

test("transform(), copy mode, uses useHash", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], useHash: true }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"0123456789.png\"" })
})

test("transform(), copy mode, uses keepName", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], useHash: true, keepName: true }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"test_0123456789.png\"" })
})

test("transform(), copy mode, uses nameFormat", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const options = { url: "copy", extensions: [".png"], nameFormat: "[name][ext]?[hash]" }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"test.png?0123456789\"" })
})

test("transform(), copy mode, uses hashOptions", async () => {
  getHashMock.mockReturnValueOnce("0123456789")

  const hashOptions = { hash: "sha1", encoding: "hex", maxLength: 32 }
  const options = { url: "copy", extensions: [".png"], useHash: true, hashOptions }
  const result = await smartAsset(options).transform(undefined, "test.png")

  expect(getHashMock).toBeCalledWith("test.png", hashOptions)
  expect(result).toEqual({ code: "export default \"0123456789.png\"" })
})

test("generateBundle(), copy mode, copies assets", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.transform(undefined, "test1.png")
  await plugin.transform(undefined, "test2.png")
  await plugin.generateBundle(outputOptions, {}, true)
  await plugin.generateBundle(outputOptions, {}, true) // should be ignored

  expect(copyMock).toBeCalledTimes(2)
  expect(copyMock).nthCalledWith(1, "test1.png", "dist/test1.png")
  expect(copyMock).nthCalledWith(2, "test2.png", "dist/test2.png")
})

test("generateBundle(), copy mode, uses assetsPath", async () => {
  const options = { url: "copy", extensions: [".png"], assetsPath: "assets" }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.transform(undefined, "test1.png")
  await plugin.generateBundle(outputOptions, {}, true)

  expect(copyMock).toBeCalledWith("test1.png", "dist/assets/test1.png")
})

test("generateBundle(), copy mode, doesn't copy if isWrite is false", async () => {
  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.transform(undefined, "test1.png")
  await plugin.generateBundle(outputOptions, {}, false)

  expect(copyMock).toBeCalledTimes(0)
})

test("generateBundle(), copy mode, warn on copy error", async () => {
  copyMock.mockReturnValueOnce(Promise.reject("error"))

  const options = { url: "copy", extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  plugin.warn = jest.fn()

  await plugin.transform(undefined, "test1.png")
  await plugin.generateBundle(outputOptions, {}, true)

  expect(plugin.warn).toBeCalled()
})
