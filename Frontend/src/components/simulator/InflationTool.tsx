"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";

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
  }, [financeLoading]); // run once when finance data finishes loading

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
                <div className="card-title">⏱ เลือกช่วงเวลาจำลอง</div>
                <div className="timeline-pills">
                  {[3, 5, 10, 20].map((year) => (
                    <button
                      key={year}
                      onClick={() => setTimeline(year)}
                      className={`t-pill ${timeline === year ? "active" : ""}`}
                    >
                      {year} ปี
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--bg-sub)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)' }}>
                  เงินเฟ้อสะสม <span style={{ color: 'var(--gold)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                    {result?.cumulativeInflation?.toFixed(1) ?? "0.0"}%
                  </span> ใน <strong>{timeline} ปี</strong> (อัตรา 3% ต่อปี)
                </div>
              </div>

              <div className="card">
                <div className="card-title">🏷 ค่าใช้จ่ายรายเดือน (บาท)</div>
                {[
                  { key: "travel" as const, label: "🚗 ค่าเดินทาง" },
                  { key: "food" as const, label: "🍜 ค่าอาหาร" },
                  { key: "rent" as const, label: "🏠 ค่าที่พักอาศัย" },
                  { key: "goods" as const, label: "🛒 ค่าของใช้จำเป็น" },
                  { key: "other" as const, label: "✈️ ค่าอื่นๆ" },
                ].map(({ key, label }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <div className="form-input-prefix">
                      <span>฿</span>
                      <input
                        type="number"
                        className="form-input"
                        value={expenses[key]}
                        onChange={(e) => handleExpenseChange(key, Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">📊 ผลกระทบจากเงินเฟ้อ (ต่อเดือน)</div>
                {result && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายปัจจุบัน/เดือน</span>
                      <span className="stat-val">฿{result.currentMonthlyExpense.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายอนาคต/เดือน</span>
                      <span className="stat-val gold">฿{result.futureMonthlyExpense.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-title">💡 สรุปเงินที่หายไป</div>
                {result && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">ส่วนต่างต่อเดือน</span>
                      <span className="stat-val red">+฿{result.monthlyDifference.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">รายจ่ายต่อปี (อนาคต)</span>
                      <span className="stat-val cyan">฿{result.annualFutureExpense.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div style={{ marginTop: '16px' }}>
                  <button className="btn btn-primary btn-full" onClick={() => setPage(1)}>ต่อไป: จัดพอร์ตป้องกัน →</button>
                </div>
              </div>
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

          <div className="progress-wrap">
            <div className="progress-label"><span>สัดส่วนที่จัดแล้ว</span><span>0%</span></div>
            <div className="progress-track"><div className="progress-fill ok" style={{ width: '0%' }}></div></div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '24px' }}>🚧</span>
            <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>กำลังเชื่อมต่อ API จัดพอร์ต...</div>
          </div>
        </div>
      )}

      {page === 2 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Purchasing Power <span>Dashboard</span></div>
            <div className="tool-sub">เปรียบเทียบ 5 มิติ — พลังซื้อของคุณในอนาคต พร้อมคำแนะนำจาก AI</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>กำลังพัฒนาระบบประมวลผลกราฟเปรียบเทียบ...</div>
          </div>
        </div>
      )}
    </div>
  );
}
