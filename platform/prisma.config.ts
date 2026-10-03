import { defineConfig } from 'prisma/config'
import fs from 'fs'
import path from 'path'

// Helper to manually load DATABASE_URL from .env to bypass any CLI load order limitations
function getEnvVar(varName: string): string | undefined {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const regex = new RegExp(`^${varName}=["']?([^"'\\r\\n]+)["']?`, 'm')
      const match = content.match(regex)
      if (match) {
        return match[1]
      }
    }
  } catch (e) {
    // Fallback
  }
  return process.env[varName]
}

export default defineConfig({
  datasource: {
    url: getEnvVar('DIRECT_URL') ?? getEnvVar('DATABASE_URL') ?? 'postgresql://postgres:postgres@localhost:5432/resto_db',
  },
})
