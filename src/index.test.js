jest.mock("fs-extra", () => ({ copy: jest.fn() }))
jest.mock("asset-hash", () => ({ getHash: jest.fn() }))

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

test("transform() returns asset name as exports", async () => {
  const options = { extensions: [".png"] }
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(result).toEqual({ code: "export default \"test.png\"" })
})

test("transform() uses publicPath (no ending slash)", async () => {
  const options = { extensions: [".png"], publicPath: "assets" }
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(result).toEqual({ code: "export default \"assets/test.png\"" })
})

test("transform() uses publicPath (with ending slash)", async () => {
  const options = { extensions: [".png"], publicPath: "assets/" }
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(result).toEqual({ code: "export default \"assets/test.png\"" })
})

test("transform() uses useHash", async () => {
  const options = { extensions: [".png"], useHash: true }
  getHashMock.mockReturnValueOnce("0123456789")
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"0123456789.png\"" })
})

test("transform() uses keepName", async () => {
  const options = { extensions: [".png"], useHash: true, keepName: true }
  getHashMock.mockReturnValueOnce("0123456789")
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"test_0123456789.png\"" })
})

test("transform() uses nameFormat", async () => {
  const options = { extensions: [".png"], nameFormat: "[name][ext]?[hash]" }
  getHashMock.mockReturnValueOnce("0123456789")
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(getHashMock).toBeCalledWith("test.png", {})
  expect(result).toEqual({ code: "export default \"test.png?0123456789\"" })
})

test("transform() uses hashOptions", async () => {
  const hashOptions = { hash: "sha1", encoding: "hex", maxLength: 32 }
  const options = { extensions: [".png"], useHash: true, hashOptions }
  getHashMock.mockReturnValueOnce("0123456789")
  const result = await smartAsset(options).transform(undefined, "test.png")
  expect(getHashMock).toBeCalledWith("test.png", hashOptions)
  expect(result).toEqual({ code: "export default \"0123456789.png\"" })
})

test("generateBundle() copies assets", async () => {
  const options = { extensions: [".png"] }
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

test("generateBundle() uses assetsPath", async () => {
  const options = { extensions: [".png"], assetsPath: "assets" }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.transform(undefined, "test1.png")
  await plugin.generateBundle(outputOptions, {}, true)

  expect(copyMock).toBeCalledWith("test1.png", "dist/assets/test1.png")
})

test("generateBundle() doesn't copy if isWrite is false", async () => {
  const options = { extensions: [".png"] }
  const outputOptions = { file: "dist/bundle.js" }

  const plugin = smartAsset(options)

  await plugin.transform(undefined, "test1.png")
  await plugin.generateBundle(outputOptions, {}, false)

  expect(copyMock).toBeCalledTimes(0)
})


