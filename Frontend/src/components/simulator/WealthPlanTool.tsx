"use client";
import "../ui/WealthPlanTool.css";
import "../ui/EmergencyFundTool.css";
import "../ui/InflationTool.css";
import React from "react";

import { useWealthPlanState } from "./wealth-plan/useWealthPlanState";
import WealthPlanForm from "./wealth-plan/WealthPlanForm";
import DashboardView from "./wealth-plan/DashboardView";
import PortfolioModal from "./wealth-plan/PortfolioModal";

export default function WealthPlanTool() {
  const { state, actions } = useWealthPlanState();

  return (
    <div className="wealth-plan-container pb-20">
      {state.page === 0 && <WealthPlanForm state={state} actions={actions} />}
      {state.page === 1 && <DashboardView state={state} actions={actions} />}
      
      <PortfolioModal state={state} actions={actions} />
    </div>
  );
}
