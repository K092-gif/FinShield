"use client";
import '../ui/InflationTool.css';

import React, { useState, useEffect, useTransition } from "react";
import PageSkeleton from "@/components/simulator/PageSkeleton";
import { useFinance } from "@/contexts/FinanceContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import AiAdvisor from "./AiAdvisor";

interface ExpenseData {
  travel: number;
  food: number;
  rent: number;
  goods: number;
  other: number;
  debt: number;
}

interface InflationResult {
  timeline: number;
  currentMonthlyExpense: number;
  futureMonthlyExpense: number;
  monthlyDifference: number;
  annualFutureExpense: number;
  inflationRate: number;
  cumulativeInflation: number;
  currentSalary: number;
  futureSalary: number;
  realPurchasingPower: number;
  salaryDiffReal: number;
}

export default function InflationTool() {
  const { financeData, loading: financeLoading } = useFinance();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const stepParam = searchParams.get('step');
  const page = stepParam ? parseInt(stepParam, 10) : 0;
  
  const [isPending, startTransition] = useTransition();

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', newPage.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };
  const [timeline, setTimeline] = useState(10);
  const [expenses, setExpenses] = useState<ExpenseData>({
    travel: 5000,
    food: 8000,
    rent: 12000,
    goods: 4000,
    other: 5000,
    debt: 0,
  });
  const [salary, setSalary] = useState(40000);
  const [salaryGrowth, setSalaryGrowth] = useState(5);
  const [investmentAmount, setInvestmentAmount] = useState(500000);
  const [result, setResult] = useState<InflationResult | null>(null);

  // Sync from Context
  useEffect(() => {
    if (financeLoading) return;
    setExpenses({
      food:   financeData.expenses.food,
      rent:   financeData.expenses.rent,
      travel: financeData.expenses.transport,
      goods:  financeData.expenses.necessities,
      other:  financeData.expenses.other,
      debt:   financeData.expenses.debt || 0,
    });
    if (financeData.assets.monthlyIncome) {
      setSalary(financeData.assets.monthlyIncome);
    }
  }, [financeData, financeLoading]);

  const currentTotalExpenseWithoutDebt = expenses.travel + expenses.food + expenses.rent + expenses.goods + expenses.other;
  const currentTotalExpense = currentTotalExpenseWithoutDebt + expenses.debt;
  const inflationRate = 0.03;

  const calculateInflation = () => {
    const cumulativeInflation = Math.pow(1 + inflationRate, timeline) - 1;
    const futureExpense = (currentTotalExpenseWithoutDebt * (1 + cumulativeInflation)) + expenses.debt;
    const difference = futureExpense - currentTotalExpense;
    const annualFutureExpense = futureExpense * 12;
    const futureSalary = salary * Math.pow(1 + salaryGrowth / 100, timeline);
    const realPurchasingPower = futureSalary / Math.pow(1 + inflationRate, timeline);
    const salaryDiffReal = realPurchasingPower - salary;

    setResult({
      timeline,
      currentMonthlyExpense: Math.round(currentTotalExpense),
      futureMonthlyExpense: Math.round(futureExpense),
      monthlyDifference: Math.round(difference),
      annualFutureExpense: Math.round(annualFutureExpense),
      inflationRate: inflationRate * 100,
      cumulativeInflation: Math.round(cumulativeInflation * 10000) / 100,
      currentSalary: salary,
      futureSalary: Math.round(futureSalary),
      realPurchasingPower: Math.round(realPurchasingPower),
      salaryDiffReal: Math.round(salaryDiffReal),
    });
  };

  useEffect(() => {
    calculateInflation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, currentTotalExpense, salary, salaryGrowth]);

  const handleExpenseChange = (key: keyof ExpenseData, value: number) => {
    setExpenses((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="tool-screen active">
      <div className="inf-top-nav">
        <div className="page-nav" style={{ marginBottom: 0 }}>
          <button className={`page-btn ${page === 0 ? "active" : ""}`} onClick={() => setPage(0)}>
            <span className="num">1</span>รายได้ & เงินเฟ้อ
          </button>
          <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
            <span className="num">2</span>AI แนะนำพอร์ต
          </button>
        </div>
        
        {page === 0 && (
          <div className="inf-page-actions">
            <button className="btn btn-primary" onClick={() => setPage(1)}>ต่อไป: AI แนะนำพอร์ต →</button>
          </div>
        )}
        {page === 1 && (
          <div className="inf-page-actions">
            <button className="btn btn-secondary" onClick={() => setPage(0)}>← กลับ</button>
          </div>
        )}
      </div>

      {isPending ? (
        <PageSkeleton />
      ) : (
        <>
          {/* PAGE 0 — Income & Inflation (kept as-is) */}
          {page === 0 && (
            <div className="tool-page active">
              <div className="tool-header">
                <div className="tool-title">Purchasing Power & <span>Inflation</span></div>
                <div className="tool-sub">เปรียบเทียบการเติบโตของรายได้กับเงินเฟ้อ (3% ต่อปี) เพื่อดูว่า "พลังซื้อจริง" ของคุณเพิ่มขึ้นหรือลดลง</div>
              </div>
              <div className="grid2">
                <div>
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-time-fast" style={{ fontSize: '18px' }}></i> จำลองอนาคตในอีก (ปี)
                    </div>
                    <div className="timeline-slider" style={{ padding: '10px 0 20px' }}>
                      <input type="range" className="slider" min="1" max="10" value={timeline} onChange={(e) => setTimeline(parseInt(e.target.value, 10))} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        <span>1 ปี</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px', background: 'var(--bg-sub)', padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--border)' }}>{timeline} ปี</span>
                        <span>10 ปี</span>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-chart-line-up" style={{ fontSize: '18px' }}></i> ข้อมูลรายได้พนักงานประจำ
                    </div>
                    <div className="grid2">
                      <div className="form-group">
                        <label className="form-label">เงินเดือนปัจจุบัน</label>
                        <div className="form-input-prefix"><span>฿</span>
                          <input type="number" className="form-input" value={salary === 0 ? '' : salary} onChange={(e) => setSalary(e.target.value === '' ? 0 : Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">คาดการณ์เงินเดือนขึ้น/ปี</label>
                        <div className="form-input-prefix"><span>%</span>
                          <input type="number" className="form-input" value={salaryGrowth === 0 ? '' : salaryGrowth} onChange={(e) => setSalaryGrowth(e.target.value === '' ? 0 : Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-tag" style={{ fontSize: '18px' }}></i> ค่าใช้จ่ายรายเดือน (บาท)
                    </div>
                    {[
                      { key: "travel" as const, label: "ค่าเดินทาง", icon: <i className="fi fi-sr-car" style={{ fontSize: '16px' }}></i> },
                      { key: "food" as const, label: "ค่าอาหาร", icon: <i className="fi fi-sr-restaurant" style={{ fontSize: '16px' }}></i> },
                      { key: "rent" as const, label: "ค่าที่พักอาศัย", icon: <i className="fi fi-sr-home" style={{ fontSize: '16px' }}></i> },
                      { key: "goods" as const, label: "ค่าของใช้จำเป็น", icon: <i className="fi fi-sr-shopping-cart" style={{ fontSize: '16px' }}></i> },
                      { key: "other" as const, label: "ค่าอื่นๆ", icon: <i className="fi fi-sr-plane" style={{ fontSize: '16px' }}></i> },
                      { key: "debt" as const, label: "ภาระหนี้สินที่ต้องจ่าย/เดือน", icon: <i className="fi fi-sr-bank" style={{ fontSize: '16px' }}></i> },
                    ].map(({ key, label, icon }) => (
                      <div className="form-group" key={key}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{icon} {label}</label>
                        <div className="form-input-prefix"><span>฿</span>
                          <input type="number" className="form-input" value={expenses[key] === 0 ? '' : expenses[key]} onChange={(e) => handleExpenseChange(key, e.target.value === '' ? 0 : Number(e.target.value))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fi fi-sr-chart-histogram" style={{ fontSize: '18px' }}></i> Salary vs. Inflation ({timeline} ปี)
                    </div>
                    {result && (
                      <div style={{ marginTop: '16px' }}>
                        <div className="stat-row"><span className="stat-label">เงินเดือนปัจจุบัน</span><span className="stat-val">฿{result.currentSalary.toLocaleString()}</span></div>
                        <div className="stat-row"><span className="stat-label">เงินเดือนในอนาคต (ตัวเลข)</span><span className="stat-val green">฿{result.futureSalary.toLocaleString()}</span></div>
                        <div className="divider"></div>
                        <div className="stat-row"><span className="stat-label">ค่าใช้จ่ายรวมปัจจุบัน</span><span className="stat-val">฿{result.currentMonthlyExpense.toLocaleString()}</span></div>
                        <div className="stat-row"><span className="stat-label">ค่าใช้จ่ายในอนาคต (เฟ้อ {result.inflationRate}%)</span><span className="stat-val red">฿{result.futureMonthlyExpense.toLocaleString()}</span></div>
                        <div className="stat-row"><span className="stat-label">ส่วนต่างค่าครองชีพที่เพิ่มขึ้น</span><span className="stat-val red">+฿{result.monthlyDifference.toLocaleString()}/เดือน</span></div>
                        <div className="divider"></div>
                        
                        <div style={{ padding: '16px', background: result.salaryDiffReal >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', borderRadius: '12px', border: `1px solid ${result.salaryDiffReal >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: result.salaryDiffReal >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {result.salaryDiffReal >= 0 ? <i className="fi fi-sr-check-circle" style={{ fontSize: '18px' }}></i> : <i className="fi fi-sr-exclamation" style={{ fontSize: '18px' }}></i>}
                            {result.salaryDiffReal >= 0 ? "เงินเดือนชนะเงินเฟ้อ!" : "เงินเดือนแพ้เงินเฟ้อ!"}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>พลังซื้อจริงของเงินเดือน (Real Value)</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: result.salaryDiffReal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                              ฿{result.realPurchasingPower.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            {result.salaryDiffReal >= 0 
                              ? `เมื่อปรับเงินเฟ้อแล้ว คุณมีกำลังซื้อเพิ่มขึ้น ฿${result.salaryDiffReal.toLocaleString()}/เดือน` 
                              : `เมื่อปรับเงินเฟ้อแล้ว กำลังซื้อของคุณหายไป ฿${Math.abs(result.salaryDiffReal).toLocaleString()}/เดือน`
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="btn btn-primary btn-full" onClick={() => setPage(1)}
                    style={{ marginTop: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: 800, borderRadius: '12px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
                    ต่อไป: AI แนะนำพอร์ตสู้เงินเฟ้อ →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 1 — AI Portfolio Advisor */}
          {page === 1 && (
            <div className="tool-page active">
              <div className="tool-header">
                <div className="tool-title">AI <span>Portfolio Advisor</span></div>
                <div className="tool-sub">ให้ AI วิเคราะห์และแนะนำพอร์ตลงทุนที่เหมาะกับคุณ ทั้งสินทรัพย์ไทยและต่างประเทศ เพื่อเอาชนะเงินเฟ้อ</div>
              </div>

              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-coins" style={{ fontSize: '18px' }}></i> เงินลงทุนตั้งต้น
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div className="form-input-prefix"><span>฿</span>
                    <input type="number" className="form-input" value={investmentAmount === 0 ? '' : investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value === '' ? 0 : Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <AiAdvisor
                goal="inflation"
                context={{
                  investmentAmount,
                  timeline,
                  monthlySalary: salary,
                  monthlyExpense: currentTotalExpense,
                  inflationRate: 3,
                  riskTolerance: "medium",
                }}
                contextItems={[
                  { label: "เงินลงทุน", value: `฿${investmentAmount.toLocaleString()}` },
                  { label: "ระยะเวลา", value: `${timeline} ปี` },
                  { label: "เงินเดือน", value: `฿${salary.toLocaleString()}` },
                  { label: "ค่าใช้จ่าย/เดือน", value: `฿${currentTotalExpense.toLocaleString()}` },
                  { label: "ค่าครองชีพที่เพิ่มขึ้น", value: `+฿${result?.monthlyDifference.toLocaleString() || '0'}/เดือน` },
                  { label: "อัตราเงินเฟ้อ", value: "3% ต่อปี" },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
