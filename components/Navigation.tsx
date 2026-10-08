"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
  CheckSquare,
  Dumbbell,
  Utensils,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "@/components/ui/NotificationBell";
import TrackSheet from "@/components/navigation/TrackSheet";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Home",
    exact: true,
  },
  {
    href: "/dashboard/tasks",
    icon: CheckSquare,
    label: "Plan",
  },
  {
    href: "/dashboard/workout",
    icon: Dumbbell,
    label: "Train",
  },
  {
    href: "/dashboard/diet",
    icon: Utensils,
    label: "Nutrition",
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Settings",
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTrackSheet, setShowTrackSheet] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  const logoSrc = "/BrandLogo_Header.png";

  const triggerOrbit = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("satat:open-orbit"));
    }
  };

  // Close profile menu on outside click
  useEffect(() => {
    if (!showProfileMenu) return;

    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    const t = setTimeout(
      () => document.addEventListener("mousedown", handler),
      50
    );

    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [showProfileMenu]);

  // Determine current page title for mobile top bar
  const getMobileTitle = () => {
    if (pathname === "/dashboard") return "Home";
    if (pathname?.startsWith("/dashboard/tasks")) return "Plan";
    if (pathname?.startsWith("/dashboard/workout")) return "Train";
    if (pathname?.startsWith("/dashboard/diet")) return "Nutrition";
    if (pathname?.startsWith("/dashboard/settings")) return "You";

    return "SATAT";
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="app-shell-sidebar hidden lg:flex">
        {/* Logo */}
        <div className="app-shell-brand">
          <Image
            src={logoSrc}
            alt="SATAT"
            width={28}
            height={28}
            className="rounded-lg"
          />

          <span className="app-shell-brand-name font-bold tracking-tight">
            satat
          </span>
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
            {navItems.map(({ href, icon: Icon, label, exact }) => {
              const active =
                exact
                  ? pathname === href
                  : pathname?.startsWith(href) ?? false;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "app-shell-nav-link",
                    active && "is-active"
                  )}
                >
                  <Icon
                    className="app-shell-nav-icon"
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* Orbit */}
            <button
              type="button"
              onClick={triggerOrbit}
              className="app-shell-nav-link w-full text-left"
            >
              <Sparkles
                className="app-shell-nav-icon"
                style={{
                  color: "var(--satat-brand, #6E8BFF)",
                }}
                aria-hidden="true"
              />

              <span>Orbit AI</span>
            </button>
          </div>
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="app-shell-account-area">
            <div className="app-shell-account">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: "rgba(110, 139, 255, 0.12)",
                    color: "var(--satat-brand, #6E8BFF)",
                  }}
                >
                  <User className="w-4 h-4" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="app-shell-account-name truncate">
                  {session.user.name?.split(" ")[0]}
                </p>

                <p className="app-shell-account-email truncate">
                  {session.user.email}
                </p>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
                aria-label="Sign out"
                className="btn-icon p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{
                  color: "var(--satat-error, #EA7777)",
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile top header ── */}
      <header className="app-mobile-header lg:hidden">
        <div className="app-mobile-context flex items-center gap-2">
          <Image
            src={logoSrc}
            alt="SATAT"
            width={24}
            height={24}
            className="rounded-md"
          />

          <span className="app-mobile-page-title text-sm font-semibold tracking-tight">
            {getMobileTitle()}
          </span>
        </div>

        <div className="app-mobile-actions flex items-center gap-2">
          <NotificationBell />

          {session?.user && (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                type="button"
                title="Account menu"
                aria-label="Open account menu"
                aria-expanded={showProfileMenu}
                className="app-mobile-profile-button"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                    style={{
                      background: "rgba(110, 139, 255, 0.12)",
                      color: "var(--satat-brand, #6E8BFF)",
                    }}
                  >
                    <User className="w-3 h-3" />
                  </div>
                )}

                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform duration-150",
                    showProfileMenu && "rotate-180"
                  )}
                  style={{
                    color: "var(--text-muted)",
                  }}
                />
              </button>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50 animate-scale-in"
                  style={{
                    background: "var(--satat-surface, #0D0F11)",
                    border:
                      "1px solid var(--satat-border, rgba(255,255,255,0.08))",
                    boxShadow: "0 16px 36px rgba(0,0,0,0.8)",
                  }}
                >
                  {/* User info */}
                  <div
                    className="px-4 py-3"
                    style={{
                      borderBottom:
                        "1px solid var(--satat-border-subtle, rgba(255,255,255,0.05))",
                    }}
                  >
                    <p
                      className="text-xs font-semibold truncate"
                      style={{
                        color: "var(--text-primary)",
                      }}
                    >
                      {session.user.name}
                    </p>

                    <p
                      className="text-[11px] truncate mt-0.5"
                      style={{
                        color: "var(--text-muted)",
                      }}
                    >
                      {session.user.email}
                    </p>
                  </div>

                  {/* Settings */}
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings & Profile</span>
                  </Link>

                  {/* Sign out */}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-red-500/10"
                    style={{
                      color: "var(--satat-error, #EA7777)",
                    }}
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

      {/* ── Mobile bottom nav ── */}
      <nav
        className="app-mobile-bottom-nav lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="app-mobile-nav-list">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            aria-current={
              pathname === "/dashboard" ? "page" : undefined
            }
            className={cn(
              "app-mobile-nav-link",
              pathname === "/dashboard" && "is-active"
            )}
          >
            <LayoutDashboard
              className="app-mobile-nav-icon"
              aria-hidden="true"
            />
            <span className="app-mobile-nav-label">Home</span>
          </Link>

          {/* 2. Plan */}
          <Link
            href="/dashboard/tasks"
            aria-current={
              pathname?.startsWith("/dashboard/tasks")
                ? "page"
                : undefined
            }
            className={cn(
              "app-mobile-nav-link",
              pathname?.startsWith("/dashboard/tasks") && "is-active"
            )}
          >
            <CheckSquare
              className="app-mobile-nav-icon"
              aria-hidden="true"
            />
            <span className="app-mobile-nav-label">Plan</span>
          </Link>

          {/* 3. Track */}
          <button
            type="button"
            onClick={() => setShowTrackSheet(true)}
            aria-label="Quick track"
            className="app-mobile-nav-link"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{
                background: "rgba(110, 139, 255, 0.15)",
                color: "var(--satat-brand, #6E8BFF)",
                border: "1px solid rgba(110, 139, 255, 0.3)",
              }}
            >
              <Plus className="w-4 h-4" />
            </div>

            <span className="app-mobile-nav-label">Track</span>
          </button>

          {/* 4. Orbit */}
          <button
            type="button"
            onClick={triggerOrbit}
            aria-label="Ask Orbit AI"
            className="app-mobile-nav-link"
          >
            <Sparkles
              className="app-mobile-nav-icon"
              aria-hidden="true"
            />
            <span className="app-mobile-nav-label">Orbit</span>
          </button>

          {/* 5. You */}
          <Link
            href="/dashboard/settings"
            aria-current={
              pathname?.startsWith("/dashboard/settings")
                ? "page"
                : undefined
            }
            className={cn(
              "app-mobile-nav-link",
              pathname?.startsWith("/dashboard/settings") &&
                "is-active"
            )}
          >
            <User
              className="app-mobile-nav-icon"
              aria-hidden="true"
            />
            <span className="app-mobile-nav-label">You</span>
          </Link>
        </div>
      </nav>

      {/* Quick Track Sheet Modal */}
      <TrackSheet
        isOpen={showTrackSheet}
        onClose={() => setShowTrackSheet(false)}
      />
    </>
  );
}