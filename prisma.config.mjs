import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

export default {
  earlyAccess: true,
  migrate: {
    adapter: async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      return new PrismaPg(pool)
    },
  },
}
