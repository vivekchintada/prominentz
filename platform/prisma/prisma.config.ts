// prisma.config.ts – Prisma v7 configuration (datasource URL moved from schema)
// This file allows `prisma migrate` and the Prisma client to resolve the database connection.
// The client initialization (src/lib/prisma.ts) already creates a Pool using process.env.DATABASE_URL.
export default {
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },
};
