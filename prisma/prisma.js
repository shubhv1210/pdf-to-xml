import { PrismaClient } from '@prisma/client';

// Hard-coded pooler URL as a fallback
const POOLER_URL = "postgres://postgres.gfebfnogkhikipszbszu:kirtan134@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";

const globalForPrisma = global

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || POOLER_URL
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 