import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  debug: process.env.NODE_ENV === "development",
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
        const pharmacies = await prisma.pharmacy.findMany({
          where: { email: { equals: email, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            isVerified: true,
            role: true,
          },
        });
        let pharmacy = null as (typeof pharmacies)[number] | null;
        for (const candidate of pharmacies) {
          if (!candidate.passwordHash) continue;
          const valid = await compare(credentials.password, candidate.passwordHash);
          if (valid) {
            pharmacy = candidate;
            break;
          }
        }
        if (!pharmacy) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[Auth] Credentials rejected", {
              reason: "no_matching_email_or_password",
              email,
              candidateCount: pharmacies.length,
            });
          }
          return null;
        }
        if (process.env.NODE_ENV === "development") {
          console.log("[Auth] Credentials accepted", {
            email,
            userId: pharmacy.id,
          });
        }
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
        // Always store a boolean so session never treats "missing" as verified (see pending vs dashboard layout).
        token.isVerified = Boolean((user as { isVerified?: boolean }).isVerified);
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
