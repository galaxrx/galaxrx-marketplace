import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    isVerified?: boolean;
    role?: string;
  }
  interface Session {
    user: User & {
      id: string;
      isVerified?: boolean;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isVerified?: boolean;
    role?: string;
  }
}
