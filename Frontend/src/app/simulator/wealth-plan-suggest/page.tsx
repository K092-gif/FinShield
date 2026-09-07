"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AiAdvisor from "@/components/simulator/AiAdvisor";

function WealthPlanSuggestContent() {
  const searchParams = useSearchParams();

  // Parse context from searchParams
  const reserveMonths = parseInt(searchParams.get("reserveMonths") || "0");
  const scenario = searchParams.get("scenario") || "";
  const severity = searchParams.get("severity") || "";
  const inflationRate = parseFloat(searchParams.get("inflationRate") || "0");
  const salary = parseFloat(searchParams.get("salary") || "0");
  const totalExpense = parseFloat(searchParams.get("totalExpense") || "0");
  const totalCapital = parseFloat(searchParams.get("totalCapital") || "0");
  const dcaAmount = parseFloat(searchParams.get("dcaAmount") || "0");
  const monthlyDca = parseFloat(searchParams.get("monthlyDca") || "0");
  const dcaDay = parseInt(searchParams.get("dcaDay") || "1");
  
  const emergencyFund = reserveMonths > 0 ? reserveMonths * totalExpense : 0;
  const initialInvestment = Math.max(0, totalCapital - emergencyFund);
  const totalInvestmentWithDca = initialInvestment + dcaAmount;

  // Build the context items for display
  const contextItems = [];
  if (totalCapital > 0) contextItems.push({ label: "เงินเก็บทั้งหมด", value: `฿${totalCapital.toLocaleString()}` });
  if (reserveMonths > 0) contextItems.push({ label: "เป้าหมายสำรอง", value: `${reserveMonths} เดือน (฿${emergencyFund.toLocaleString()})` });
  if (initialInvestment > 0) contextItems.push({ label: "เงินตั้งต้นลงทุน", value: `฿${initialInvestment.toLocaleString()}` });
  if (dcaAmount > 0) {
    contextItems.push({ label: "เงิน DCA สะสม", value: `+฿${dcaAmount.toLocaleString()}` });
    contextItems.push({ label: "เงินลงทุนรวม (รวม DCA)", value: `฿${totalInvestmentWithDca.toLocaleString()}` });
  }
  if (monthlyDca > 0) {
    contextItems.push({ label: "DCA รายเดือน", value: `฿${monthlyDca.toLocaleString()}/ด. (ทุกวันที่ ${dcaDay})` });
  }
  if (scenario) {
    const scText = scenario === "job_loss" ? "ตกงาน" : scenario === "illness" ? "เจ็บป่วย" : scenario === "accident" ? "อุบัติเหตุ" : scenario;
    contextItems.push({ label: "วิกฤตที่กังวล", value: `${scText} (${severity})` });
  }
  if (inflationRate > 0) contextItems.push({ label: "เงินเฟ้อ", value: `${inflationRate}% ต่อปี` });
  if (salary > 0) contextItems.push({ label: "รายได้ประจำ", value: `฿${salary.toLocaleString()}/ด.` });

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
            AI <span className="font-medium text-[#747878] dark:text-gray-400">แนะนำพอร์ต (Integrated Wealth Plan)</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 m-0">
            ระบบได้นำข้อมูลที่คุณกรอกมาวิเคราะห์เพื่อจัดสัดส่วนพอร์ตที่เหมาะสมที่สุด
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-[#f4eedb] dark:bg-gray-800 p-1.5 rounded-full border border-[#e0dac7] dark:border-gray-700">
          <button 
            className="flex-1 sm:flex-initial px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold text-[#747878] hover:text-[#1e1c10] bg-transparent border-0 cursor-pointer transition-all flex items-center justify-center gap-2"
            onClick={() => {
              window.location.href = `/simulator/wealth-plan`;
            }}
          >
            Wealth Plan
          </button>
          <button className="flex-1 sm:flex-initial px-5 sm:px-6 py-2 rounded-full bg-[#fed330] text-[#1e1c10] font-bold shadow-sm border-0 cursor-pointer transition-all flex items-center justify-center gap-2">
            AI แนะนำพอร์ต
          </button>
        </div>
      </div>

      <AiAdvisor
        goal="wealth_plan"
        context={{
          currentSavings: totalCapital || undefined,
          investmentAmount: totalInvestmentWithDca > 0 ? totalInvestmentWithDca : (initialInvestment || undefined),
          emergencyFund: emergencyFund || undefined,
          scenarioType: scenario || undefined,
          severity: severity || undefined,
          inflationRate: inflationRate || undefined,
          monthlySalary: salary || undefined,
          monthlyExpense: totalExpense || undefined,
          riskTolerance: "medium", // Default assumption
          dcaAmount: dcaAmount > 0 ? dcaAmount : undefined,
          monthlyDca: monthlyDca > 0 ? monthlyDca : undefined,
          dcaDay: dcaDay || 1,
        }}
        contextItems={contextItems.length > 0 ? contextItems : undefined}
        autoStart={true}
      />
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
