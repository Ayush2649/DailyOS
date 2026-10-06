import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserKey } from "@/lib/auth/userKey";
import { adminDb } from "@/lib/firebaseAdmin";
import { PRELAUNCH_EXEMPT_USER_IDS } from "@/lib/onboarding/constants";
import Navigation from "@/components/Navigation";
import ProductTour from "@/components/ui/ProductTour";
import AriaChatbot from "@/components/ui/AriaChatbot";
import NotificationScheduler from "@/components/NotificationScheduler";
import PageBackground from "@/components/ui/PageBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = getUserKey(session);

  if (userId) {
    const isExempt = PRELAUNCH_EXEMPT_USER_IDS.includes(userId);
    const isSessionOnboarded = (session?.user as any)?.onboarded === true;

    if (!isExempt && !isSessionOnboarded) {
      try {
        const snap = await adminDb.collection("userProfiles").doc(userId).get();
        const isProfileCompleted = snap.exists && typeof snap.data()?.completedAt === "number";

        if (!isProfileCompleted) {
          redirect("/onboarding");
        }
      } catch (err: any) {
        // If error is NEXT_REDIRECT, let Next.js throw it
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        console.warn("[dashboard/layout] Could not verify onboarding status:", err?.message);
      }
    }
  }
  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "var(--surface-1)" }}>
      <PageBackground />
      <NotificationScheduler />
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        <Navigation />
        <main className="app-shell-main">
          <div className="app-shell-content">
            {children}
          </div>
        </main>
      </div>
      <ProductTour />
      <AriaChatbot />
    </div>
  );
}
