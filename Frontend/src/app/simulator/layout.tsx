'use client'

import SettingsPanel from "@/components/simulator/SettingsPanel";
import PageSkeleton from "@/components/simulator/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import ChatAssistant from "@/components/simulator/ChatAssistant";
import "./layout.css";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSettings, setShowSettings] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  // Authentication guard: redirect to /login if user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, authLoading, router, pathname]);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    handleThemeChange(nextTheme);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const tools = [
    { href: "/simulator/overview", icon: <i className="fi fi-rr-apps"></i>, label: "แดชบอร์ดภาพรวม" },
    { href: "/simulator/wealth-plan", icon: <i className="fi fi-rr-chart-line-up"></i>, label: "เป้าหมายการเงิน" },
    { href: "/simulator/tax", icon: <i className="fi fi-rr-receipt"></i>, label: "ภาษี" },
    { href: "/simulator/diary", icon: <i className="fi fi-rr-book-alt"></i>, label: "ไดอารี่เกษียณ" },
  ];

  if (authLoading || !user) {
    return <PageSkeleton />;
  }

  return (
    <>
      {/* ── Top Bar (Serene Pulse / Reference Layout) ── */}
      <nav className="nav">
        {/* Brand Logo on Left */}
        <Link href="/simulator/overview" className="nav-logo flex items-center gap-2.5">
          <img src="/finshield_logo.svg" alt="FinShield Logo" className="w-8 h-8 object-contain rounded-full shadow-sm" />
          <div className="font-extrabold tracking-tight text-xl text-[var(--text-main)]">
            FinShield
          </div>
        </Link>

        {/* Centered Navigation Tabs */}
        <div className="nav-tabs">
          {tools.map((tool) => {
            const isActive = pathname === tool.href || pathname.startsWith(tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`nav-tab ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon-wrap">{tool.icon}</span>
                <span className="nav-label-wrap">{tool.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right-side actions: Theme Toggle + Logout Button */}
        <div className="layout-header-right flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-full bg-[var(--bg-input)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all cursor-pointer border-0 text-sm"
            title={theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'}
          >
            <i className={`fi ${theme === 'light' ? 'fi-rr-moon' : 'fi-rr-sun'} text-sm`}></i>
          </button>

          {/* Settings trigger */}
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="w-9 h-9 rounded-full bg-[var(--bg-input)] text-[var(--text-main)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-all cursor-pointer border-0 text-sm"
            title="การตั้งค่า"
          >
            <i className="fi fi-rr-settings text-sm"></i>
          </button>

          {/* Logout Button matching the top bar in screenshot */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-full border border-transparent transition-all cursor-pointer"
            title="ออกจากระบบ"
          >
            <i className="fi fi-rr-sign-out-alt text-xs"></i>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="main">
        {financeLoading ? <PageSkeleton /> : children}
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <SettingsPanel
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Floating Chat Assistant ── */}
      <ChatAssistant />
    </>
  );
}
