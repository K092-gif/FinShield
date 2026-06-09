'use client'

import EmergencyFundTool from "@/components/simulator/EmergencyFundTool";
import InflationTool from "@/components/simulator/InflationTool";
import RetirementTool from "@/components/simulator/RetirementTool";
import { useState, useEffect } from "react";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      return newTheme;
    });
  };

  const tools = [
    {
      icon: "📊",
      label: "ค่าครองชีพ & เงินเฟ้อ",
      component: <InflationTool />,
    },
    {
      icon: "🛡️",
      label: "เงินสำรองฉุกเฉิน",
      component: <EmergencyFundTool />,
    },
    {
      icon: "💰",
      label: "วางแผนเกษียณ & ภาษี",
      component: <RetirementTool />,
    },
  ];

  return (
    <>
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
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </nav>

      <div className="main">
        {tools[activeTab].component}
      </div>
    </>
  );
}
