import Navigation from "@/components/Navigation";
import ProductTour from "@/components/ui/ProductTour";
import AriaChatbot from "@/components/ui/AriaChatbot";
import NotificationScheduler from "@/components/NotificationScheduler";
import PageBackground from "@/components/ui/PageBackground";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
