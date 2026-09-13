import { defineConfig } from 'prisma/config'
import fs from 'fs'
import path from 'path'

// Helper to manually load DATABASE_URL from .env to bypass any CLI load order limitations
function getDatabaseUrl(): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m)
      if (match) {
        return match[1]
      }
    }
  } catch (e) {
    // Fallback
  }
  return process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/resto_db'
}

export default defineConfig({
  datasource: {
    url: getDatabaseUrl(),
  },
})
