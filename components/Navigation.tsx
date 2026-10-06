"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { CheckSquare, Dumbbell, Utensils, LogOut, User, Sun, Moon, ChevronDown, LayoutDashboard, Settings } from "lucide-react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "@/components/ui/NotificationBell";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Today", exact: true },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/workout", icon: Dumbbell, label: "Train" },
  { href: "/dashboard/diet", icon: Utensils, label: "Nutrition" },
  { href: "/dashboard/settings", icon: Settings, label: "More" },
];

function ThemeToggle({ iconSize = "w-4 h-4" }: { iconSize?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
      style={{ color: "var(--text-3)" }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
    >
      {isDark
        ? <Sun className={iconSize} />
        : <Moon className={iconSize} />}
    </button>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/BrandLogo_Header_DarkMode.png"
    : "/BrandLogo_Header.png";
  const activeNavItem = navItems.find(({ href, exact }) => exact ? pathname === href : pathname?.startsWith(href));

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

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="app-shell-sidebar hidden lg:flex">
        {/* Logo */}
        <div className="app-shell-brand">
          <Image src={logoSrc} alt="satat" width={30} height={30} className="rounded-lg" />
          <span className="app-shell-brand-name">satat</span>
        </div>
        <div className="app-shell-tools" aria-label="App controls">
          <NotificationBell />
          <ThemeToggle />
          <ThemeSwitcher />
        </div>

        {/* Nav links */}
        <nav className="app-shell-nav" aria-label="Primary navigation">
          <div className="app-shell-nav-list">
          {navItems.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                aria-current={active ? "page" : undefined}
                className={cn("app-shell-nav-link", active && "is-active")}
              >
                <Icon className="app-shell-nav-icon" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
          </div>
        </nav>

        {/* User section */}
        {session?.user && (
          <div className="app-shell-account-area">
            <div className="app-shell-account">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="app-shell-account-name">{session.user.name?.split(" ")[0]}</p>
                <p className="app-shell-account-email">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
                aria-label="Sign out"
                className="btn-icon"
                style={{ color: "var(--danger)" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile top header ── */}
      <header className="app-mobile-header lg:hidden">
        <div className="app-mobile-context">
          <Image src={logoSrc} alt="satat" width={26} height={26} className="rounded-md" />
          <span className="app-mobile-page-title">{activeNavItem?.label ?? "satat"}</span>
        </div>
        <div className="app-mobile-actions">
          <NotificationBell />
          <ThemeToggle iconSize="w-3.5 h-3.5" />
          <ThemeSwitcher />
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
                  <Image src={session.user.image} alt="" width={26} height={26} className="rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", showProfileMenu && "rotate-180")} style={{ color: "var(--text-3)" }} />
              </button>

              {/* Profile dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg overflow-hidden z-50 animate-scale-in"
                  style={{
                    background: "var(--surface-base)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-dialog)",
                  }}>
                  {/* User info */}
                  <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-1)" }}>{session.user.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-3)" }}>{session.user.email}</p>
                  </div>
                  {/* Sign out */}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex min-h-11 items-center gap-3 px-4 text-sm font-medium transition-colors hover:bg-danger-soft"
                    style={{ color: "var(--danger)" }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="app-mobile-bottom-nav lg:hidden" aria-label="Primary navigation">
        <div className="app-mobile-nav-list">
          {navItems.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                aria-current={active ? "page" : undefined}
                className={cn("app-mobile-nav-link", active && "is-active")}>
                <Icon className="app-mobile-nav-icon" aria-hidden="true" />
                <span className="app-mobile-nav-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
