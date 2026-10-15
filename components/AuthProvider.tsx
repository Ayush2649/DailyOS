"use client";
import { SessionProvider } from "next-auth/react";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FirebaseAuthProvider>
        {children}
      </FirebaseAuthProvider>
    </SessionProvider>
  );
}
