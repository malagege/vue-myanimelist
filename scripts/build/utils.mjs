import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function saveJSON (name, data) {
    mkdirSync(join(__dirname, '../../public/src/assets/json/'), { recursive: true })
    let result = writeFileSync(join(__dirname, `../../public/src/assets/json/${name}.json`), JSON.stringify(data))
    mkdirSync(join(__dirname, '../../src/assets/json/'), { recursive: true })
    writeFileSync(join(__dirname, `../../src/assets/json/${name}.json`), JSON.stringify(data))
    return result
  }