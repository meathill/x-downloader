import { betterAuth } from 'better-auth';

export const auth = (db: D1Database) =>
  betterAuth({
    database: db,
    emailAndPassword: {
      enabled: true,
    },
  });
