import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

if (process.env.VERCEL && !fs.existsSync('/tmp/dev.db')) {
  const bundledDb = path.join(process.cwd(), 'prisma', 'dev.db');
  if (fs.existsSync(bundledDb)) {
    fs.copyFileSync(bundledDb, '/tmp/dev.db');
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.VERCEL
      ? { db: { url: 'file:/tmp/dev.db' } }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
