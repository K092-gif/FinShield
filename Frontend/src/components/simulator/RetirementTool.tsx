"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useState } from "react";

interface WealthResult {
  currentAge: number;
  retirementAge: number;
  years: number;
  initialCapital: number;
  monthlySavings: number;
  netInitialCapital: number;
  netMonthlySavings: number;
  bankBalance: number;
  portfolioValue: number;
  totalWealth: number;
  monthlyDividends: number;
  annualDividends: number;
}

const BANK_TIERS: Record<
  string,
  { name: string; tiers: Array<{ minBalance: number; rate: number }> }
> = {
  kkp_dime: {
    name: "เกียรตินาคินภัทร - Dime! Save (สูงสุด 3.00%)",
    tiers: [
      { minBalance: 0, rate: 0.03 },
      { minBalance: 10000, rate: 0.03 },
      { minBalance: 1000000, rate: 0.01 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  tcrb_alpha: {
    name: "ไทยเครดิต - ออมทรัพย์อัลฟา (สูงสุด 1.70%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 500000, rate: 0.017 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  krungsri_kept: {
    name: "กรุงศรีอยุธยา - Kept (สูงสุด 1.45%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 2000000, rate: 0.0145 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  tisco_e: {
    name: "ทิสโก้ - TISCO e-Savings (1.35%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0135 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  scb_ez: {
    name: "ไทยพาณิชย์ (SCB) - EZ Savings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  kbank_e: {
    name: "กสิกรไทย (KBank) - K-eSavings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 500000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  bbl_e: {
    name: "กรุงเทพ - e-Savings (1.25%)",
    tiers: [
      { minBalance: 0, rate: 0.005 },
      { minBalance: 1000000, rate: 0.0125 },
      { minBalance: Infinity, rate: 0.005 },
    ],
  },
  lh_byou: {
    name: "แลนด์ แอนด์ เฮ้าส์ - B-You Wealth (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  ttb_me: {
    name: "ทหารไทยธนชาต (ttb) - ME save (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  ktb_next: {
    name: "กรุงไทย - NEXT Savings (0.90%)",
    tiers: [{ minBalance: 0, rate: 0.009 }],
  },
  icbc_e: {
    name: "ไอซีบีซี (ไทย) - e-Savings (0.70%)",
    tiers: [{ minBalance: 0, rate: 0.007 }],
  },
};

export default function RetirementTool() {
  const [page, setPage] = useState(0);
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(55);
  const [initialCapital, setInitialCapital] = useState(500000);
  const [monthlySavings, setMonthlySavings] = useState(10000);
  const [dividendGoal, setDividendGoal] = useState(50000);
  const [selectedBank, setSelectedBank] = useState("kkp_dime");
  const [result, setResult] = useState<WealthResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateWealth = async () => {
    setLoading(true);
    try {
      // Fallback: Perform calculation locally
      const years = retirementAge - currentAge;
      const baseFee = initialCapital * 0.00157; // 0.157% fee
      const netInitialCapital = Math.max(0, initialCapital - baseFee);
      const monthlyFee = (monthlySavings * 0.00157) / 12;
      const netMonthlySavings = Math.max(0, monthlySavings - monthlyFee);

      // Calculate bank balance with tiered interest
      const bankInfo = BANK_TIERS[selectedBank];
      let bankBalance = netInitialCapital;
      if (bankInfo) {
        for (let month = 1; month <= years * 12; month++) {
          bankBalance += netMonthlySavings;

          // Apply tiered interest
          let monthlyInterest = 0;
          let remaining = bankBalance;

          for (let i = 0; i < bankInfo.tiers.length; i++) {
            const currentTier = bankInfo.tiers[i];
            const nextTier = bankInfo.tiers[i + 1];
            const tierLimit = nextTier
              ? nextTier.minBalance
              : Number.MAX_SAFE_INTEGER;

            if (remaining > currentTier.minBalance) {
              const tierAmount = Math.min(
                remaining - currentTier.minBalance,
                tierLimit - currentTier.minBalance
              );
              monthlyInterest += (tierAmount * currentTier.rate) / 12;
            }
          }

          bankBalance += monthlyInterest;
        }
      }

      // Calculate portfolio value (assuming portfolio grows with 0 yield since allocations is empty)
      let portfolioValue = netInitialCapital * 0.6; // Assume 60% goes to portfolio
      const monthlyPortfolioContribution = netMonthlySavings * 0.6;

      for (let i = 0; i < years * 12; i++) {
        // weightedYield is 0 since allocations list is empty
        portfolioValue += monthlyPortfolioContribution;
      }

      const totalWealth = bankBalance + portfolioValue;
      const monthlyDividends = 0; // weightedYield is 0
      const annualDividends = 0;

      setResult({
        currentAge,
        retirementAge,
        years,
        initialCapital,
        monthlySavings,
        netInitialCapital: Math.round(netInitialCapital),
        netMonthlySavings: Math.round(netMonthlySavings),
        bankBalance: Math.round(bankBalance),
        portfolioValue: Math.round(portfolioValue),
        totalWealth: Math.round(totalWealth),
        monthlyDividends: Math.round(monthlyDividends),
        annualDividends: Math.round(annualDividends),
      });
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการคำนวณ");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    calculateWealth();
  }, [currentAge, retirementAge, initialCapital, monthlySavings, selectedBank]);

  return (
    <div className="tool-screen active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-nav" style={{ marginBottom: 0 }}>
          <button className={`page-btn ${page === 0 ? "active" : ""}`} onClick={() => setPage(0)}>
            <span className="num">1</span>เป้าหมายเกษียณ
          </button>
          <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
            <span className="num">2</span>จัดพอร์ต
          </button>
          <button className={`page-btn ${page === 2 ? "active" : ""}`} onClick={() => setPage(2)}>
            <span className="num">3</span>FIRE & ภาษี
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
            <button className="btn btn-primary" onClick={() => setPage(2)}>ดูแดชบอร์ด FIRE →</button>
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
            <div className="tool-title">Financial Goal & <span>Wealth Calculator</span></div>
            <div className="tool-sub">คำนวณเส้นทางสู่เป้าหมายเกษียณพร้อมแสดงต้นทุนแฝงจริง และดอกเบี้ยเงินฝากธนาคารแบบขั้นบันได</div>
          </div>
          <div className="grid2">
            <div className="card">
              <div className="card-title">📋 ข้อมูลการเงินของคุณ</div>
              <div className="grid2">
                <div className="form-group">
                  <label className="form-label">อายุปัจจุบัน</label>
                  <input
                    className="form-input"
                    type="number"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">อายุที่ต้องการเกษียณ</label>
                  <input
                    className="form-input"
                    type="number"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">เงินทุนตั้งต้น <span style={{fontSize:'10px', color:'var(--red)'}}>ต้นทุน 0.157% ถูกหักอัตโนมัติ</span></label>
                <div className="form-input-prefix">
                  <span>฿</span>
                  <input
                    className="form-input"
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ออมเพิ่ม/เดือน</label>
                <div className="form-input-prefix">
                  <span>฿</span>
                  <input
                    className="form-input"
                    type="number"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">เป้าหมายเงินปันผลสุทธิ/เดือน (หลังเกษียณ)</label>
                <div className="form-input-prefix">
                  <span>฿</span>
                  <input
                    className="form-input"
                    type="number"
                    value={dividendGoal}
                    onChange={(e) => setDividendGoal(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="divider"></div>
              {result && (
                <>
                  <div className="stat-row"><span className="stat-label">เงินลงทุนสุทธิตั้งต้น (หักค่าธรรมเนียม)</span><span className="stat-val cyan">฿{result.netInitialCapital.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">เงินออม/เดือนสุทธิ</span><span className="stat-val cyan">฿{result.netMonthlySavings.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">ระยะเวลา</span><span className="stat-val">{result.years} ปี</span></div>
                </>
              )}
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">🏦 เลือกบัญชีเงินฝากธนาคารเปรียบเทียบ</div>
                <select
                  className="form-select"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                >
                  {Object.entries(BANK_TIERS).map(([key, bank]) => (
                    <option key={key} value={key}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>* ระบบจะคำนวณอัตราดอกเบี้ยแบบขั้นบันไดให้อัตโนมัติตามวงเงินฝากที่ธนาคารกำหนด</div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--red)', marginBottom: '16px' }}>
                <div className="card-title">เงินฝากธนาคาร</div>
                <div className="card-val red">฿{result?.bankBalance.toLocaleString() || '0'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>คำนวณตามขั้นบันได</div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button className="btn btn-primary btn-full" onClick={() => setPage(1)}>ต่อไป: จัดพอร์ต →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 1 && (
        <div className="tool-page active">
          <div className="tool-action-bar">
            <div className="tool-header">
              <div className="tool-title">Multi-Asset <span>Portfolio Builder</span></div>
              <div className="tool-sub">เลือกสินทรัพย์จาก 100 ตัว — ระบุสัดส่วนให้รวมครบ 100%</div>
            </div>
          </div>

          <div className="grid2" style={{ marginBottom: '16px' }}>
            <div className="card">
              <div className="card-title">📊 พอร์ตรวม</div>
              <div className="stat-row"><span className="stat-label">Weighted Yield</span><span className="stat-val green">0.00%</span></div>
              <div className="stat-row"><span className="stat-label">Risk Score</span><span className="stat-val">0.0 / 10</span></div>
              <div className="progress-wrap">
                <div className="progress-label"><span>สัดส่วนรวม</span><span>0%</span></div>
                <div className="progress-track"><div className="progress-fill ok" style={{ width: '0%' }}></div></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🍩 การกระจายความเสี่ยง</div>
              <div style={{ height: '100px', position: 'relative' }}></div>
            </div>
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
            <div className="tool-title">FIRE Dashboard & <span>Tax Optimizer</span></div>
            <div className="tool-sub">อิสรภาพทางการเงินและกลยุทธ์ภาษีปันผลอัจฉริยะ</div>
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
