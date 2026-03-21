import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        // Select only fields needed for login so auth works even if newer DB columns
        // (e.g. stripeChargesEnabled, stripePayoutsEnabled) are not yet migrated.
        const pharmacy = await prisma.pharmacy.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            isVerified: true,
            role: true,
          },
        });
        if (!pharmacy || !pharmacy.passwordHash) return null;
        const valid = await compare(credentials.password, pharmacy.passwordHash);
        if (!valid) return null;
        return {
          id: pharmacy.id,
          email: pharmacy.email,
          name: pharmacy.name,
          isVerified: pharmacy.isVerified,
          role: pharmacy.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isVerified = (user as { isVerified?: boolean }).isVerified;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { isVerified?: boolean }).isVerified = token.isVerified as boolean;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
