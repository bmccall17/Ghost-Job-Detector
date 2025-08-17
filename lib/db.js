// Database connection utility (JavaScript version for API compatibility)
import { PrismaClient } from '@prisma/client';

let prisma;

if (globalThis.prisma) {
  prisma = globalThis.prisma;
} else {
  prisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
  }
}

export { prisma };