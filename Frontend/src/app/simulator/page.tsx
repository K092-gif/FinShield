'use client'

import EmergencyFundTool from "@/components/simulator/EmergencyFundTool";
import InflationTool from "@/components/simulator/InflationTool";
import RetirementTool from "@/components/simulator/RetirementTool";
import SettingsPanel from "@/components/ui/SettingsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showSettings, setShowSettings] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

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
    { icon: "📊", label: "ค่าครองชีพ & เงินเฟ้อ",    component: <InflationTool /> },
    { icon: "🛡️", label: "เงินสำรองฉุกเฉิน",           component: <EmergencyFundTool /> },
    { icon: "💰", label: "วางแผนเกษียณ & ภาษี",        component: <RetirementTool /> },
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
            >
              {tool.icon} {tool.label}
            </button>
          ))}
        </div>

        {/* Right-side actions */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Theme toggle */}
          <button
            id="theme-toggle-btn"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            style={{ margin: 0 }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Settings button */}
          <button
            id="settings-btn"
            className="theme-toggle-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            title="ตั้งค่า"
            style={{ margin: 0 }}
          >
            ⚙️
          </button>

          {/* Logout button */}
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
            {/* Avatar circle */}
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%",
              background: user?.photoURL ? "transparent" : "var(--accent-blue)",
              overflow: "hidden", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 700, color: "#fff",
            }}>
              {user?.photoURL
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                : initials}
            </div>
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
    </>
  );
}
