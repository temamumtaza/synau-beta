import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Upsert user ke Convex users table via HTTP API.
 * Dipanggil saat signIn event (server-side).
 */
async function syncUserToConvex(user: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  provider: 'email' | 'google';
}) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl || !user.email) return null;

  const mutationUrl = convexUrl.replace('.cloud', '.site') + '/mutation';

  try {
    const res = await fetch(mutationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'users:upsert',
        args: {
          name: user.name ?? user.email.split('@')[0],
          email: user.email,
          image: user.image ?? undefined,
          provider: user.provider,
        },
        format: 'json',
      }),
    });

    if (!res.ok) {
      console.error('[auth] syncUserToConvex failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.value ?? null;
  } catch (err) {
    console.error('[auth] syncUserToConvex error:', err);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // TODO: validate against Convex users table dengan hashed password
        // Saat ini, reject all credential logins sampai password auth dibangun
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Sync user ke Convex saat login pertama / update info
      if (user.email) {
        await syncUserToConvex({
          name: user.name,
          email: user.email,
          image: user.image,
          provider: account?.provider === 'google' ? 'google' : 'email',
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      // Inject email sebagai identifier jika Convex user ID tersimpan di token
      if (token.convexUserId) {
        session.user.convexId = token.convexUserId as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
});
