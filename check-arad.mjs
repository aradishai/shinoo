import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })
const user = await db.user.findFirst({ where: { username: 'ערד' }, select: { id: true, username: true, coins: true, et120Stock: true } })
console.log(JSON.stringify(user, null, 2))
await pool.end()
