"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AiAdvisor from "@/components/simulator/AiAdvisor";
import "@/components/ui/RetirementTool.css";

function WealthPlanSuggestContent() {
  const searchParams = useSearchParams();

  // Parse context from searchParams
  const reserveMonths = parseInt(searchParams.get("reserveMonths") || "0");
  const scenario = searchParams.get("scenario") || "";
  const severity = searchParams.get("severity") || "";
  const inflationRate = parseFloat(searchParams.get("inflationRate") || "0");
  const salary = parseFloat(searchParams.get("salary") || "0");
  const totalExpense = parseFloat(searchParams.get("totalExpense") || "0");
  
  const emergencyFund = reserveMonths > 0 ? reserveMonths * totalExpense : 0;

  // Build the context items for display
  const contextItems = [];
  if (reserveMonths > 0) contextItems.push({ label: "เป้าหมายสำรอง", value: `${reserveMonths} เดือน (฿${emergencyFund.toLocaleString()})` });
  if (scenario) {
    const scText = scenario === "job_loss" ? "ตกงาน" : scenario === "illness" ? "เจ็บป่วย" : scenario === "accident" ? "อุบัติเหตุ" : scenario;
    contextItems.push({ label: "วิกฤตที่กังวล", value: `${scText} (${severity})` });
  }
  if (inflationRate > 0) contextItems.push({ label: "เงินเฟ้อ", value: `${inflationRate}% ต่อปี` });
  if (salary > 0) contextItems.push({ label: "รายได้ประจำ", value: `฿${salary.toLocaleString()}/ด.` });

  return (
    <div className="tool-screen active">
      <div className="tool-page active" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="tool-header" style={{ marginBottom: '24px' }}>
          <div className="tool-title" style={{ fontSize: '28px' }}>
            <i className="fi fi-sr-magic-wand" style={{ marginRight: '12px' }}></i> 
            AI แนะนำพอร์ต <span>(Integrated Wealth Plan)</span>
          </div>
          <div className="tool-sub" style={{ fontSize: '15px' }}>
            ระบบได้นำข้อมูลที่คุณกรอกมาวิเคราะห์เพื่อจัดสัดส่วนพอร์ตที่เหมาะสมที่สุด
          </div>
        </div>

      <AiAdvisor
        goal="wealth_plan"
        context={{
          emergencyFund: emergencyFund || undefined,
          scenarioType: scenario || undefined,
          severity: severity || undefined,
          inflationRate: inflationRate || undefined,
          monthlySalary: salary || undefined,
          monthlyExpense: totalExpense || undefined,
          riskTolerance: "medium", // Default assumption
        }}
        contextItems={contextItems.length > 0 ? contextItems : undefined}
      />
      </div>
    </div>
  );
}

export default function WealthPlanSuggestPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูล...</div>}>
      <WealthPlanSuggestContent />
    </Suspense>
  );
}
