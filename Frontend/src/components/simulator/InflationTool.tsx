"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import PortfolioBuilder from "@/components/ui/PortfolioBuilder";
import { Timer, Tag, ChartLineUp, Lightbulb, Warning, Car, ForkKnife, House, ShoppingCart, Airplane } from "@phosphor-icons/react";

interface ExpenseData {
  travel: number;
  food: number;
  rent: number;
  goods: number;
  other: number;
}

interface InflationResult {
  timeline: number;
  currentMonthlyExpense: number;
  futureMonthlyExpense: number;
  monthlyDifference: number;
  annualFutureExpense: number;
  inflationRate: number;
  cumulativeInflation: number;
}

export default function InflationTool() {
  const { financeData, loading: financeLoading } = useFinance();

  const [page, setPage] = useState(0);
  const [timeline, setTimeline] = useState(10);
  const [expenses, setExpenses] = useState<ExpenseData>({
    travel: 5000,
    food: 8000,
    rent: 12000,
    goods: 4000,
    other: 5000,
  });
  const [result, setResult] = useState<InflationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Sync from Firestore when data loads ──
  useEffect(() => {
    if (financeLoading) return;
    setExpenses({
      food:   financeData.expenses.food,
      rent:   financeData.expenses.rent,
      travel: financeData.expenses.transport,
      goods:  financeData.expenses.necessities,
      other:  financeData.expenses.other,
    });
  }, [financeData, financeLoading]); // re-run when financeData updates

  const currentTotal =
    expenses.travel + expenses.food + expenses.rent + expenses.goods + expenses.other;

  const handleExpenseChange = (key: keyof ExpenseData, value: number) => {
    setExpenses((prev) => ({ ...prev, [key]: value }));
  };

  const calculateInflation = async () => {
    setLoading(true);
    try {
      // Fallback: Perform calculation locally
      const inflationRate = 0.03;
      const cumulativeInflation = Math.pow(1 + inflationRate, timeline) - 1;
      const futureExpense = currentTotal * (1 + cumulativeInflation);
      const difference = futureExpense - currentTotal;
      const annualFutureExpense = futureExpense * 12;

      setResult({
        timeline,
        currentMonthlyExpense: Math.round(currentTotal),
        futureMonthlyExpense: Math.round(futureExpense),
        monthlyDifference: Math.round(difference),
        annualFutureExpense: Math.round(annualFutureExpense),
        inflationRate: inflationRate * 100,
        cumulativeInflation: Math.round(cumulativeInflation * 10000) / 100,
      });
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการคำนวณ");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    calculateInflation();
  }, [timeline, currentTotal]);

  return (
    <div className="tool-screen active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-nav" style={{ marginBottom: 0 }}>
          <button className={`page-btn ${page === 0 ? "active" : ""}`} onClick={() => setPage(0)}>
            <span className="num">1</span>ค่าครองชีพ
          </button>
          <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
            <span className="num">2</span>จัดพอร์ต
          </button>
          <button className={`page-btn ${page === 2 ? "active" : ""}`} onClick={() => setPage(2)}>
            <span className="num">3</span>ผลลัพธ์
          </button>
        </div>
        
        {page === 0 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setPage(1)}>ต่อไป: จัดพอร์ต →</button>
          </div>
        )}
        {page === 1 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(0)}>← กลับ</button>
            <button className="btn btn-primary" onClick={() => setPage(2)}>ดูผลลัพธ์ →</button>
          </div>
        )}
        {page === 2 && (
          <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(1)}>← กลับไปแก้ไขพอร์ต</button>
          </div>
        )}
      </div>

      {page === 0 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Timeline & <span>ค่าครองชีพรายเดือน</span></div>
            <div className="tool-sub">ตั้งต้นระบุค่าใช้จ่ายปัจจุบัน เพื่อดูผลกระทบจากเงินเฟ้อในอนาคต</div>
          </div>
          <div className="grid2">
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Timer size={18} weight="bold" /> เลือกช่วงเวลาจำลอง
                </div>
                <div className="timeline-slider" style={{ padding: '10px 0 20px' }}>
                  <input
                    type="range"
                    className="slider"
                    min="1"
                    max="10"
                    value={timeline}
                    onChange={(e) => setTimeline(parseInt(e.target.value, 10))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>1 ปี</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px', background: 'var(--bg-sub)', padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--border)' }}>{timeline} ปี</span>
                    <span>10 ปี</span>
                  </div>
                </div>
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--bg-sub)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)' }}>
                  เงินเฟ้อสะสม <span style={{ color: 'var(--gold)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                    {result?.cumulativeInflation?.toFixed(1) ?? "0.0"}%
                  </span> ใน <strong>{timeline} ปี</strong> (อัตรา 3% ต่อปี)
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={18} weight="bold" /> ค่าใช้จ่ายรายเดือน (บาท)
                </div>
                {[
                  { key: "travel" as const, label: "ค่าเดินทาง", icon: <Car size={16} weight="bold" /> },
                  { key: "food" as const, label: "ค่าอาหาร", icon: <ForkKnife size={16} weight="bold" /> },
                  { key: "rent" as const, label: "ค่าที่พักอาศัย", icon: <House size={16} weight="bold" /> },
                  { key: "goods" as const, label: "ค่าของใช้จำเป็น", icon: <ShoppingCart size={16} weight="bold" /> },
                  { key: "other" as const, label: "ค่าอื่นๆ", icon: <Airplane size={16} weight="bold" /> },
                ].map(({ key, label, icon }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {icon} {label}
                    </label>
                    <div className="form-input-prefix">
                      <span>฿</span>
                      <input
                        type="number"
                        className="form-input"
                        value={expenses[key] === 0 ? '' : expenses[key]}
                        onChange={(e) => handleExpenseChange(key, e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChartLineUp size={18} weight="bold" /> ผลกระทบจากเงินเฟ้อ (ต่อเดือน)
                </div>
                {result && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                    {[
                      { key: "travel" as const, label: "ค่าเดินทาง", icon: <Car size={16} weight="bold" /> },
                      { key: "food" as const, label: "ค่าอาหาร", icon: <ForkKnife size={16} weight="bold" /> },
                      { key: "rent" as const, label: "ค่าที่พักอาศัย", icon: <House size={16} weight="bold" /> },
                      { key: "goods" as const, label: "ค่าของใช้จำเป็น", icon: <ShoppingCart size={16} weight="bold" /> },
                      { key: "other" as const, label: "ค่าอื่นๆ", icon: <Airplane size={16} weight="bold" /> },
                    ].map(({ key, label, icon }) => {
                      const currentVal = expenses[key] || 0;
                      const futureVal = currentVal * (1 + (result.cumulativeInflation / 100));
                      const diff = futureVal - currentVal;
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', paddingBottom: '14px', borderBottom: '1px dashed var(--border)' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {icon} {label}
                          </span>
                          <div style={{ fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>฿{Math.round(currentVal).toLocaleString()}</span>
                            <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>→</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 800 }}>฿{Math.round(futureVal).toLocaleString()}</span>
                            <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 700 }}>(+{Math.round(diff).toLocaleString()})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={18} weight="bold" /> สรุปเงินที่หายไป
                </div>
                {result && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายปัจจุบัน/เดือน</span>
                      <span className="stat-val">฿{result.currentMonthlyExpense.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายอนาคต/เดือน</span>
                      <span className="stat-val">฿{result.futureMonthlyExpense.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">ส่วนต่างต่อเดือน</span>
                      <span className="stat-val red">+฿{result.monthlyDifference.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายต่อปี (อนาคต)</span>
                      <span className="stat-val gold">฿{result.annualFutureExpense.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setPage(1)}
                style={{ 
                  marginTop: '24px', 
                  padding: '14px 20px', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  borderRadius: '12px', 
                  boxShadow: '0 8px 24px rgba(37,99,235,0.25)' 
                }}
              >
                ต่อไป: จัดพอร์ตป้องกัน →
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 1 && (
        <div className="tool-page active">
          <div className="tool-action-bar">
            <div className="tool-header">
              <div className="tool-title">Investment Buffer <span>Sandbox</span></div>
              <div className="tool-sub">กระจายสัดส่วนสินทรัพย์ป้องกันเงินเฟ้อ — รวมให้ครบ 100%</div>
            </div>
          </div>

          <PortfolioBuilder />
        </div>
      )}

      {page === 2 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Purchasing Power <span>Dashboard</span></div>
            <div className="tool-sub">เปรียบเทียบ 5 มิติ — พลังซื้อของคุณในอนาคต พร้อมคำแนะนำจาก AI</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <ChartLineUp size={48} weight="duotone" style={{ margin: '0 auto 12px', color: 'var(--accent-blue)' }} />
            <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>กำลังพัฒนาระบบประมวลผลกราฟเปรียบเทียบ...</div>
          </div>
        </div>
      )}
    </div>
  );
}
