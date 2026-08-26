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

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const tools = [
    { href: "/simulator/overview", icon: <i className="fi fi-sr-apps layout-nav-icon"></i>, label: "แดชบอร์ดภาพรวม" },
    { href: "/simulator/wealth-plan", icon: <i className="fi fi-sr-wallet layout-nav-icon"></i>, label: "เป้าหมายการเงิน" },
    { href: "/simulator/tax", icon: <i className="fi fi-sr-shield-plus layout-nav-icon"></i>, label: "ภาษี" },
    { href: "/simulator/diary", icon: <i className="fi fi-sr-book layout-nav-icon"></i>, label: "ไดอารี่เกษียณ" },
  ];

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="nav">
        <div className="nav-logo layout-nav-logo-wrap">
          <img src="/finshield_logo.svg" alt="FinShield Logo" className="layout-nav-logo" />
          <div>Fin<span>Shield</span></div>
        </div>

        <div className="nav-tabs">
          {tools.map((tool) => {
            const isActive = pathname === tool.href || pathname.startsWith(tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`nav-tab ${isActive ? "active" : ""} layout-nav-link`}
              >
                {tool.icon}
                <span className="layout-nav-label">{tool.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right-side actions */}
        <div className="layout-header-right">
          {/* Settings button */}
          <button
            id="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="btn btn-outline layout-settings-btn"
          >
            <i className="fi fi-sr-settings layout-settings-icon"></i>
          </button>

          <button
            id="navbar-logout-btn"
            onClick={handleLogout}
            title="ออกจากระบบ"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "0 12px", height: "36px", borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-sub)",
              color: "var(--text-muted)",
              fontFamily: "'Google Sans Flex','Kanit',sans-serif",
              fontSize: "12px", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--red)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-sub)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            <i className="fi fi-rr-sign-out-alt layout-logout-icon"></i>
            <span className="layout-logout-label">ออกจากระบบ</span>
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

      {/* ── Chat Assistant ── */}
      <ChatAssistant />
    </>
  );
}
