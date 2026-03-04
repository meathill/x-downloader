import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // In local dev, we use the specific port 3025
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3025',
});

export const { signIn, signUp, signOut, useSession } = authClient;
