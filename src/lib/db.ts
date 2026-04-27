import { Prisma, PrismaClient } from "@prisma/client";

const prismaLog: Prisma.LogLevel[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = process.env.DATABASE_URL
  ? {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: prismaLog,
    }
  : {
      log: prismaLog,
    };

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Force Prisma to use the runtime DATABASE_URL instead of build-time cached one
export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
