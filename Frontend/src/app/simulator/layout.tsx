'use client'

import SettingsPanel from "@/components/simulator/SettingsPanel";
import OnboardingModal from "@/components/simulator/OnboardingModal";
import PageSkeleton from "@/components/simulator/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";


export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !financeLoading && user) {
      if (!financeData.onboardingDone) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    }
  }, [authLoading, financeLoading, user, financeData.onboardingDone]);

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
    { href: "/simulator/inflation", icon: <i className="fi fi-sr-stats" style={{ fontSize: '18px', display: 'flex' }}></i>, label: "ค่าครองชีพ & เงินเฟ้อ" },
    { href: "/simulator/emergency", icon: <i className="fi fi-sr-shield-check" style={{ fontSize: '18px', display: 'flex' }}></i>, label: "เงินสำรองฉุกเฉิน" },
    { href: "/simulator/retirement", icon: <i className="fi fi-sr-coins" style={{ fontSize: '18px', display: 'flex' }}></i>, label: "วางแผนเกษียณ & ภาษี" },
    { href: "/simulator/overview", icon: <i className="fi fi-sr-apps" style={{ fontSize: '18px', display: 'flex' }}></i>, label: "ภาพรวม & เปรียบเทียบ" },
  ];

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="nav">
        <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/finshield_logo.svg" alt="FinShield Logo" style={{ width: '28px', height: '28px' }} />
          <div>Fin<span>Shield</span></div>
        </div>

        <div className="nav-tabs">
          {tools.map((tool) => {
            const isActive = pathname === tool.href || pathname.startsWith(tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`nav-tab ${isActive ? "active" : ""}`}
                style={{ gap: '6px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                {tool.icon}
                <span style={{ display: 'flex', alignItems: 'center', paddingTop: '2px' }}>{tool.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right-side actions */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Settings button */}
          <button
            id="settings-btn"
            className="theme-toggle-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            title="ตั้งค่า"
            style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <i className="fi fi-sr-settings" style={{ fontSize: '20px', display: 'flex' }}></i>
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
            <i className="fi fi-rr-sign-out-alt" style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex' }}></i>
            <span style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1px' }}>ออกจากระบบ</span>
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

      {/* ── Onboarding Modal (first-time users) ── */}
      {(showOnboarding && !financeLoading) && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}
