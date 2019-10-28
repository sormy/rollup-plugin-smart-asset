import { createHash } from "crypto"
import { promisify } from "util"
import { readFile } from "fs"

const readFileAsync = promisify(readFile)

export async function getHash(filename) {
  const content = await readFileAsync(filename)
  return hash(content)
}

function hash(buffer) {
  return createHash("sha1")
    .update(buffer)
    .digest("hex")
}
