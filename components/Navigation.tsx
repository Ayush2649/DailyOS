"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
  CheckSquare, Dumbbell, Utensils, LogOut, User, ChevronDown,
  LayoutDashboard, Settings, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "@/components/ui/NotificationBell";
import TrackSheet from "@/components/navigation/TrackSheet";
import { OrbitMark } from "@/components/orbit/OrbitMark";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTrackSheet, setShowTrackSheet] = useState(false);
  const [dpError, setDpError] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const logoSrc = "/BrandLogo_Header.png";

  // Handle global satat:open-orbit event by navigating to /dashboard/orbit
  useEffect(() => {
    const handleOrbitTrigger = () => {
      if (pathname !== "/dashboard/orbit") {
        router.push("/dashboard/orbit");
      }
    };
    window.addEventListener("satat:open-orbit", handleOrbitTrigger);
    return () => window.removeEventListener("satat:open-orbit", handleOrbitTrigger);
  }, [pathname, router]);

  // Close profile menu on outside click
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [showProfileMenu]);

  // Determine current page title for mobile top bar
  const getMobileTitle = () => {
    if (pathname === "/dashboard") return "Home";
    if (pathname?.startsWith("/dashboard/tasks")) return "Plan";
    if (pathname?.startsWith("/dashboard/workout")) return "Train";
    if (pathname?.startsWith("/dashboard/diet")) return "Nutrition";
    if (pathname?.startsWith("/dashboard/orbit")) return "Orbit";
    if (pathname?.startsWith("/dashboard/settings")) return "You";
    return "SATAT";
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="app-shell-sidebar hidden lg:flex">
        {/* Logo */}
        <div className="app-shell-brand">
          <Image src={logoSrc} alt="SATAT" width={28} height={28} className="rounded-lg" />
          <span className="app-shell-brand-name font-bold tracking-tight">satat</span>
        </div>

        {/* Quick Track Action Button */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowTrackSheet(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "rgba(110, 139, 255, 0.12)",
              color: "var(--satat-brand, #6E8BFF)",
              border: "1px solid rgba(110, 139, 255, 0.25)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Track</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="app-shell-nav" aria-label="Primary navigation">
          <div className="app-shell-nav-list px-2 space-y-1">
            <Link
              href="/dashboard"
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname === "/dashboard" && "is-active")}
            >
              <LayoutDashboard className="app-shell-nav-icon" aria-hidden="true" />
              <span>Home</span>
            </Link>

            <Link
              href="/dashboard/tasks"
              aria-current={pathname?.startsWith("/dashboard/tasks") ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname?.startsWith("/dashboard/tasks") && "is-active")}
            >
              <CheckSquare className="app-shell-nav-icon" aria-hidden="true" />
              <span>Plan</span>
            </Link>

            <Link
              href="/dashboard/workout"
              aria-current={pathname?.startsWith("/dashboard/workout") ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname?.startsWith("/dashboard/workout") && "is-active")}
            >
              <Dumbbell className="app-shell-nav-icon" aria-hidden="true" />
              <span>Train</span>
            </Link>

            <Link
              href="/dashboard/diet"
              aria-current={pathname?.startsWith("/dashboard/diet") ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname?.startsWith("/dashboard/diet") && "is-active")}
            >
              <Utensils className="app-shell-nav-icon" aria-hidden="true" />
              <span>Nutrition</span>
            </Link>

            <Link
              href="/dashboard/orbit"
              aria-current={pathname?.startsWith("/dashboard/orbit") ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname?.startsWith("/dashboard/orbit") && "is-active")}
            >
              <OrbitMark size={18} className="app-shell-nav-icon" />
              <span>Orbit</span>
            </Link>

            <Link
              href="/dashboard/settings"
              aria-current={pathname?.startsWith("/dashboard/settings") ? "page" : undefined}
              className={cn("app-shell-nav-link", pathname?.startsWith("/dashboard/settings") && "is-active")}
            >
              <Settings className="app-shell-nav-icon" aria-hidden="true" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="app-shell-account-area">
            <div className="app-shell-account">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
                >
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="app-shell-account-name truncate">{session.user.name?.split(" ")[0]}</p>
                <p className="app-shell-account-email truncate">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
                aria-label="Sign out"
                className="btn-icon p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--satat-error, #EA7777)" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile top header (shown on all pages except Orbit, which provides its own unified header) ── */}
      {!pathname?.startsWith("/dashboard/orbit") && (
        <header className="app-mobile-header lg:hidden">
          <div className="app-mobile-context flex items-center gap-2">
            <Image src={logoSrc} alt="SATAT" width={24} height={24} className="rounded-md" />
            <span className="app-mobile-page-title text-sm font-semibold tracking-tight">
              {getMobileTitle()}
            </span>
          </div>
          <div className="app-mobile-actions flex items-center gap-2">
            <NotificationBell />
            {session?.user && (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setShowProfileMenu(v => !v)}
                  type="button"
                  title="Account menu"
                  aria-label="Open account menu"
                  aria-expanded={showProfileMenu}
                  className="app-mobile-profile-button"
                >
                  {session.user.image ? (
                    <Image src={session.user.image} alt="" width={24} height={24} className="rounded-full" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: "rgba(110, 139, 255, 0.12)", color: "var(--satat-brand, #6E8BFF)" }}
                    >
                      <User className="w-3 h-3" />
                    </div>
                  )}
                  <ChevronDown
                    className={cn("w-3 h-3 transition-transform duration-150", showProfileMenu && "rotate-180")}
                    style={{ color: "var(--text-muted)" }}
                  />
                </button>

                {/* Profile dropdown */}
                {showProfileMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50 animate-scale-in"
                    style={{
                      background: "var(--satat-surface, #0D0F11)",
                      border: "1px solid var(--satat-border, rgba(255,255,255,0.08))",
                      boxShadow: "0 16px 36px rgba(0,0,0,0.8)",
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))" }}>
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {session.user.name}
                      </p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {session.user.email}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings & Profile</span>
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-red-500/10"
                      style={{ color: "var(--satat-error, #EA7777)" }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* ── Mobile bottom nav (Target 5: Home, Plan, Track, Orbit, You) ── */}
      <nav className="app-mobile-bottom-nav lg:hidden" aria-label="Primary navigation">
        <div className="app-mobile-nav-grid">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            aria-label="Home"
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={cn("app-mobile-nav-slot", pathname === "/dashboard" && "is-active")}
          >
            <div className="app-mobile-nav-icon-container">
              <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="app-mobile-nav-label">Home</span>
          </Link>

          {/* 2. Plan */}
          <Link
            href="/dashboard/tasks"
            aria-label="Plan"
            aria-current={pathname?.startsWith("/dashboard/tasks") ? "page" : undefined}
            className={cn("app-mobile-nav-slot", pathname?.startsWith("/dashboard/tasks") && "is-active")}
          >
            <div className="app-mobile-nav-icon-container">
              <CheckSquare className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="app-mobile-nav-label">Plan</span>
          </Link>

          {/* 3. Track (Centered Floating Action Button) */}
          <div className="app-mobile-nav-slot">
            <button
              type="button"
              onClick={() => setShowTrackSheet(true)}
              aria-label="Quick track"
              className="app-mobile-track-fab"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" style={{ color: "#FFFFFF" }} />
            </button>
            <span className="app-mobile-nav-label">Track</span>
          </div>

          {/* 4. Orbit */}
          <Link
            href="/dashboard/orbit"
            aria-label="Orbit AI companion"
            aria-current={pathname?.startsWith("/dashboard/orbit") ? "page" : undefined}
            className={cn("app-mobile-nav-slot", pathname?.startsWith("/dashboard/orbit") && "is-active")}
          >
            <div className="app-mobile-nav-icon-container">
              <OrbitMark
                size={20}
                className={cn(
                  "transition-colors",
                  pathname?.startsWith("/dashboard/orbit") ? "text-brand" : "text-current"
                )}
              />
            </div>
            <span className="app-mobile-nav-label">Orbit</span>
          </Link>

          {/* 5. You (Profile DP or fallback avatar) */}
          <Link
            href="/dashboard/settings"
            aria-label="You (Settings & Profile)"
            aria-current={pathname?.startsWith("/dashboard/settings") ? "page" : undefined}
            className={cn("app-mobile-nav-slot", pathname?.startsWith("/dashboard/settings") && "is-active")}
          >
            <div className="app-mobile-nav-icon-container">
              {session?.user?.image && !dpError ? (
                <div
                  className={cn(
                    "w-[24px] h-[24px] rounded-full overflow-hidden shrink-0 border transition-all",
                    pathname?.startsWith("/dashboard/settings")
                      ? "border-brand ring-1.5 ring-brand/50"
                      : "border-white/20"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Profile photo"}
                    className="w-full h-full object-cover rounded-full"
                    onError={() => setDpError(true)}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                    pathname?.startsWith("/dashboard/settings")
                      ? "bg-brand text-black ring-1.5 ring-brand/50"
                      : "bg-white/10 text-white/80 border border-white/20"
                  )}
                >
                  {session?.user?.name ? (
                    session.user.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </div>
              )}
            </div>
            <span className="app-mobile-nav-label">You</span>
          </Link>
        </div>
      </nav>

      {/* Quick Track Sheet Modal */}
      <TrackSheet isOpen={showTrackSheet} onClose={() => setShowTrackSheet(false)} />
    </>
  );
}
