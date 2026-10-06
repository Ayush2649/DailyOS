import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { PRELAUNCH_EXEMPT_USER_IDS } from "@/lib/onboarding/constants";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, trigger, session }) {
      if (account) {
        token.id = token.sub;
      }
      if (token.sub && PRELAUNCH_EXEMPT_USER_IDS.includes(token.sub)) {
        token.onboarded = true;
      }
      if (trigger === "update" && session?.onboarded !== undefined) {
        token.onboarded = session.onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub ?? token.id;
        (session.user as any).onboarded = token.onboarded ?? false;
      }
      return session;
    },
  },
};
