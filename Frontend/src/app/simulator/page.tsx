'use client'

import EmergencyFundTool from "@/components/simulator/EmergencyFundTool";
import InflationTool from "@/components/simulator/InflationTool";
import RetirementTool from "@/components/simulator/RetirementTool";
import SettingsPanel from "@/components/ui/SettingsPanel";
import OnboardingModal from "@/components/ui/OnboardingModal";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChartLineUp, ShieldCheck, Coins, Sun, Moon, GearSix, SignOut } from "@phosphor-icons/react";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, logout } = useAuth();
  const { financeData, loading: financeLoading } = useFinance();
  const router = useRouter();

  useEffect(() => {
    if (!financeLoading && user && !financeData.onboardingDone) {
      setShowOnboarding(true);
    }
  }, [financeLoading, user, financeData.onboardingDone]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const toggleTheme = () => {
    handleThemeChange(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const tools = [
    { icon: <ChartLineUp weight="bold" size={20} />, label: "ค่าครองชีพ & เงินเฟ้อ",    component: <InflationTool /> },
    { icon: <ShieldCheck weight="bold" size={20} />, label: "เงินสำรองฉุกเฉิน",           component: <EmergencyFundTool /> },
    { icon: <Coins weight="bold" size={20} />, label: "วางแผนเกษียณ & ภาษี",        component: <RetirementTool /> },
  ];

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || "?";

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="nav">
        <div className="nav-logo">Fin<span>Shield</span></div>

        <div className="nav-tabs">
          {tools.map((tool, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`nav-tab ${activeTab === idx ? "active" : ""}`}
              style={{ gap: '6px' }}
            >
              {tool.icon} {tool.label}
            </button>
          ))}
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
            style={{ margin: 0 }}
          >
            <GearSix weight="bold" size={20} />
          </button>

          <button
            id="navbar-logout-btn"
            onClick={handleLogout}
            title="ออกจากระบบ"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
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
            <SignOut weight="bold" size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="main">
        {tools[activeTab].component}
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
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}
