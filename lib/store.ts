import fs from "fs"
import path from "path"

// On Vercel the app root is read-only — use /tmp instead
const DATA_DIR = process.env.VERCEL
  ? "/tmp/homepage-data"
  : path.join(process.cwd(), "data")

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function readJSON<T>(filename: string, defaultVal: T): T {
  ensureDir()
  const file = path.join(DATA_DIR, filename)
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T
  } catch {
    return defaultVal
  }
}

export function writeJSON(filename: string, data: unknown): void {
  ensureDir()
  const file = path.join(DATA_DIR, filename)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8")
}
