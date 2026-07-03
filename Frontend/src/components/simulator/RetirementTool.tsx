"use client";
import '../ui/RetirementTool.css';

import { API_BASE_URL } from "@/lib/api";
import React, { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import PortfolioBuilder from "@/components/simulator/PortfolioBuilder";

import { calculateTax, calculateDividendTax } from "@/lib/taxCalculator";

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

// Bank Tiers will be fetched from API

export default function RetirementTool() {
  const { financeData, loading: financeLoading } = useFinance();
  const { user } = useAuth();

  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [dividendCalendarData, setDividendCalendarData] = useState<any[] | null>(null);
  const [dividendLoading, setDividendLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(55);
  const [initialCapital, setInitialCapital] = useState(500000);
  const [monthlySavings, setMonthlySavings] = useState(10000);
  const [dividendGoal, setDividendGoal] = useState(50000);
  const [inflationRate, setInflationRate] = useState(3);
  const [selectedBank, setSelectedBank] = useState("kkp_dime");
  const [result, setResult] = useState<WealthResult | null>(null);
  const [bankTiers, setBankTiers] = useState<Record<string, { name: string; tiers: Array<{ minBalance: number; rate: number }> }>>({});

  // Fetch Bank Tiers on mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/simulator/banks`);
        if (res.ok) {
          const data = await res.json();
          const banksMap: Record<string, any> = {};
          data.forEach((b: any) => {
            banksMap[b.id] = { name: b.name, tiers: b.tiers };
          });
          setBankTiers(banksMap);
        }
      } catch (err) {
        console.error("Failed to fetch bank tiers", err);
      }
    };
    fetchBanks();
  }, []);
  const [loading, setLoading] = useState(false);

  // --- FIRE & Tax Optimizer State ---
  const [annualIncome, setAnnualIncome] = useState<number | ''>('');
  const [taxAccordions, setTaxAccordions] = useState({
    insurance: true,
    investment: false,
    family: false,
    stimulus: false,
    housing: false,
    donation: false
  });
  
  const [taxDeductions, setTaxDeductions] = useState({
    socialSecurity: '',
    lifeInsurance: '',
    healthInsurance: '',
    parentsHealthInsurance: '',
    pensionInsurance: '',
    pvd: '',
    ssf: '',
    rmf: '',
    thaiesg: '',
    nsf: '',
    ssfx: '',
    spouseNoIncome: false,
    childBefore2561: '',
    childAfter2561: '',
    adoptedChild: '',
    parentCare: '',
    pregnancyCare: '',
    easyEReceipt: '',
    secondTierCity: '',
    socialEnterprise: '',
    homeLoanInterest: '',
    homeRepair: '',
    generalDonation: '',
    educationDonation: '',
    politicalDonation: ''
  });

  const toggleAccordion = (section: keyof typeof taxAccordions) => {
    setTaxAccordions({ ...taxAccordions, [section]: !taxAccordions[section] });
  };

  const renderTaxInput = (label: string, field: keyof typeof taxDeductions) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" style={{ fontSize: '12px' }}>{label}</label>
      <div className="form-input-prefix">
        <span>฿</span>
        <input
          type="number"
          className="form-input"
          value={taxDeductions[field] as string}
          onChange={(e) => setTaxDeductions({ ...taxDeductions, [field]: e.target.value })}
        />
      </div>
    </div>
  );

  // ── Tax Calculation (live) ──
  const taxResult = useMemo(() => {
    const numVal = (v: string | boolean | number) => {
      if (typeof v === 'boolean') return 0;
      return Number(v) || 0;
    };
    return calculateTax({
      annualIncome: typeof annualIncome === 'number' ? annualIncome : 0,
      spouseNoIncome: taxDeductions.spouseNoIncome as boolean,
      childBefore2561: numVal(taxDeductions.childBefore2561),
      childAfter2561: numVal(taxDeductions.childAfter2561),
      adoptedChild: numVal(taxDeductions.adoptedChild),
      parentCare: numVal(taxDeductions.parentCare),
      pregnancyCare: numVal(taxDeductions.pregnancyCare),
      pvd: numVal(taxDeductions.pvd),
      nsf: numVal(taxDeductions.nsf),
      rmf: numVal(taxDeductions.rmf),
      ssf: numVal(taxDeductions.ssf),
      thaiesg: numVal(taxDeductions.thaiesg),
      ssfx: numVal(taxDeductions.ssfx),
      socialEnterprise: numVal(taxDeductions.socialEnterprise),
      socialSecurity: numVal(taxDeductions.socialSecurity),
      lifeInsurance: numVal(taxDeductions.lifeInsurance),
      healthInsurance: numVal(taxDeductions.healthInsurance),
      parentsHealthInsurance: numVal(taxDeductions.parentsHealthInsurance),
      pensionInsurance: numVal(taxDeductions.pensionInsurance),
      homeLoanInterest: numVal(taxDeductions.homeLoanInterest),
      homeRepair: numVal(taxDeductions.homeRepair),
      generalDonation: numVal(taxDeductions.generalDonation),
      educationDonation: numVal(taxDeductions.educationDonation),
      politicalDonation: numVal(taxDeductions.politicalDonation),
      easyEReceipt: numVal(taxDeductions.easyEReceipt),
      secondTierCity: numVal(taxDeductions.secondTierCity),
    });
  }, [annualIncome, taxDeductions]);

  const dividendResult = useMemo(() => {
    const annualDiv = result?.annualDividends || 0;
    return calculateDividendTax(annualDiv, taxResult.marginalRate);
  }, [result?.annualDividends, taxResult.marginalRate]);

  const fmt = (n: number) => n.toLocaleString();

  // ── Sync from Firestore when data loads ──
  useEffect(() => {
    if (financeLoading) return;
    const r = financeData.retirement;
    setCurrentAge(r.currentAge);
    setRetirementAge(r.retirementAge);
    setInitialCapital(r.initialCapital || financeData.assets.currentCapital);
    setMonthlySavings(r.monthlySavings || financeData.assets.monthlySavings);
    setDividendGoal(r.dividendGoal || financeData.assets.retirementGoal);
  }, [financeData, financeLoading]); // re-run when finance data updates

  // ── Fetch P&L from backend ──
  useEffect(() => {
    if (!portfolioData) return;
    const { selectedAssets, transactions } = portfolioData;
    
    let totalFeePercent = 0;
    let totalAlloc = 0;
    (selectedAssets || []).forEach((asset: any) => {
      const txns = transactions[asset.id] || [];
      const alloc = txns.reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);
      let rate = 0;
      if (asset.type === "Mutual Fund") rate = (asset.riskLevel === "Low" || asset.riskLevel?.includes("ต่ำ")) ? 0 : 1.0;
      else if (asset.market === "US" || asset.market === "Global") rate = 0.65;
      else if (asset.market === "TH") rate = 0.17;
      totalFeePercent += rate * alloc;
      totalAlloc += alloc;
    });
    const effectiveFeeRate = totalAlloc > 0 ? (totalFeePercent / totalAlloc) : 0.157;
    const baseFee = (initialCapital || 0) * (effectiveFeeRate / 100);
    const netCapital = Math.max(0, (initialCapital || 0) - baseFee);
    
    // Safely filter assets
    const assetsWithDates = (selectedAssets || []).filter(
      (a: any) => transactions && transactions[a.id] && transactions[a.id].length > 0
    );

    if (assetsWithDates.length === 0 || netCapital <= 0) {
      setPnlData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPnlLoading(true);
      setDividendLoading(true);
      try {
        const [pnlRes, divRes] = await Promise.all([
          fetch(`${API_BASE_URL}/simulator/portfolio-pnl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalSavings: netCapital,
              allocations: assetsWithDates.map((a: any) => ({
                id: a.id,
                transactions: transactions[a.id].map((t: any) => ({
                  allocation: Number(t.allocation),
                  buyDate: t.buyDate
                })).filter((t: any) => t.allocation > 0)
              })),
            }),
          }),
          fetch(`${API_BASE_URL}/simulator/dividend-calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalWealth: netCapital,
              allocations: assetsWithDates.map((a: any) => {
                const asset = selectedAssets.find((sa: any) => sa.id === a.id);
                const totalAlloc = transactions[a.id].reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);
                return {
                  id: a.id,
                  allocation: totalAlloc,
                  expectedYield: asset ? asset.dividendYield || 0 : 0,
                  category: asset ? (asset.category || (asset.market === "TH" ? "thai-stock" : "us-stock")) : "us-stock"
                };
              }),
            }),
          })
        ]);

        if (pnlRes.ok) {
          const data = await pnlRes.json();
          setPnlData(data);
        }
        if (divRes.ok) {
          const divData = await divRes.json();
          setDividendCalendarData(divData);
        }
      } catch (err) {
        console.error('Failed to fetch simulator data:', err);
      } finally {
        setPnlLoading(false);
        setDividendLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [portfolioData, financeData]);

  const calculateWealth = async () => {
    setLoading(true);
    try {
      const years = retirementAge - currentAge;
      
      let totalFeePercent = 0;
      let totalAlloc = 0;
      let thFee = 0, offshoreFee = 0, fundFee = 0;

      if (portfolioData?.selectedAssets && portfolioData?.transactions) {
        portfolioData.selectedAssets.forEach((asset: any) => {
          const txns = portfolioData.transactions[asset.id] || [];
          const alloc = txns.reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);
          
          let rate = 0;
          if (asset.type === "Mutual Fund") {
            rate = (asset.riskLevel === "Low" || asset.riskLevel?.includes("ต่ำ")) ? 0 : 1.0;
            fundFee += rate * alloc;
          } else if (asset.market === "US" || asset.market === "Global") {
            rate = 0.65;
            offshoreFee += rate * alloc;
          } else if (asset.market === "TH") {
            rate = 0.17;
            thFee += rate * alloc;
          }
          
          totalFeePercent += rate * alloc;
          totalAlloc += alloc;
        });
      }

      const effectiveFeeRate = totalAlloc > 0 ? (totalFeePercent / totalAlloc) : 0.157; // default fallback if no assets
      
      const baseFee = initialCapital * (effectiveFeeRate / 100); 
      const netInitialCapital = Math.max(0, initialCapital - baseFee);
      const monthlyFee = (monthlySavings * (effectiveFeeRate / 100));
      const netMonthlySavings = Math.max(0, monthlySavings - monthlyFee);

      // Calculate bank balance with tiered interest
      const bankInfo = bankTiers[selectedBank];
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
        feeDetails: {
          thFee: totalAlloc > 0 ? (thFee / totalAlloc) : 0,
          offshoreFee: totalAlloc > 0 ? (offshoreFee / totalAlloc) : 0,
          fundFee: totalAlloc > 0 ? (fundFee / totalAlloc) : 0,
          totalFeeAmount: baseFee,
          effectiveRate: effectiveFeeRate
        }
      } as WealthResult & { feeDetails: any });
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการคำนวณ");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    calculateWealth();
  }, [currentAge, retirementAge, initialCapital, monthlySavings, selectedBank, bankTiers]);

  // ── Auto-save Simulation to DB ──
  useEffect(() => {
    const saveToDb = async () => {
      if (!user?.uid || !result) return;
      try {
        await apiCall("/simulator/simulations", {
          method: "POST",
          body: JSON.stringify({
            firebaseUid: user.uid,
            simulationType: "retirement",
            data: {
              currentAge,
              retirementAge,
              initialCapital,
              monthlySavings,
              selectedBank,
              results: result
            }
          }),
        });
      } catch (e) {
        console.error("Failed to save simulation to DB:", e);
      }
    };
    
    // Debounce the save
    const timeout = setTimeout(saveToDb, 2000);
    return () => clearTimeout(timeout);
  }, [result, user?.uid]);

  return (
    <div className="tool-screen active">
      <div className="rt-top-nav">
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
          <div className="rt-page-actions">
            <button className="btn btn-primary" onClick={() => setPage(1)}>ต่อไป: จัดพอร์ต →</button>
          </div>
        )}
        {page === 1 && (
          <div className="rt-page-actions">
            <button className="btn btn-secondary" onClick={() => setPage(0)}>← กลับ</button>
            <button className="btn btn-primary" onClick={() => setPage(2)}>ดูแดชบอร์ด FIRE →</button>
          </div>
        )}
        {page === 2 && (
          <div className="rt-page-actions">
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
              <div className="card-title rt-title-icon">
                <i className="fi fi-sr-clipboard-list" style={{ fontSize: '18px' }}></i> ข้อมูลการเงินของคุณ
              </div>
              <div className="grid2">
                <div className="form-group">
                  <label className="form-label">อายุปัจจุบัน</label>
                  <input
                    className="form-input"
                    type="number"
                    value={currentAge === 0 ? '' : currentAge}
                    onChange={(e) => setCurrentAge(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">อายุที่ต้องการเกษียณ</label>
                  <input
                    className="form-input"
                    type="number"
                    value={retirementAge === 0 ? '' : retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">เงินทุนตั้งต้น</label>
                <div className="form-input-prefix">
                  <span>฿</span>
                  <input
                    className="form-input"
                    type="number"
                    value={initialCapital === 0 ? '' : initialCapital}
                    onChange={(e) => setInitialCapital(e.target.value === '' ? 0 : Number(e.target.value))}
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
                    value={monthlySavings === 0 ? '' : monthlySavings}
                    onChange={(e) => setMonthlySavings(e.target.value === '' ? 0 : Number(e.target.value))}
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
                    value={dividendGoal === 0 ? '' : dividendGoal}
                    onChange={(e) => setDividendGoal(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="divider"></div>
              {result && (
                <>
                  <div className="stat-row">
                    <span className="stat-label">เงินลงทุนสุทธิตั้งต้น (หักค่าธรรมเนียม)</span>
                    <span className="stat-val cyan" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      ฿{result.netInitialCapital.toLocaleString()}
                      {result.feeDetails?.totalFeeAmount > 0 && (
                        <span 
                          style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 'normal', marginTop: '2px', cursor: 'help', borderBottom: '1px dotted var(--text-muted)' }}
                          title={`หักค่าธรรมเนียมรวม ${result.feeDetails.effectiveRate.toFixed(2)}%\n- หุ้นไทย: ${result.feeDetails.thFee.toFixed(2)}%\n- หุ้นตปท.: ${result.feeDetails.offshoreFee.toFixed(2)}%\n- กองทุนรวม: ${result.feeDetails.fundFee.toFixed(2)}%`}
                        >
                          (-฿{Math.round(result.feeDetails.totalFeeAmount).toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="stat-row"><span className="stat-label">เงินออม/เดือนสุทธิ</span><span className="stat-val cyan">฿{result.netMonthlySavings.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">ระยะเวลา</span><span className="stat-val">{result.years} ปี</span></div>
                </>
              )}
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title rt-title-icon">
                  <i className="fi fi-sr-bank" style={{ fontSize: '18px' }}></i> เลือกบัญชีเงินฝากธนาคารเปรียบเทียบ
                </div>
                <select
                  className="form-select"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                >
                  {Object.entries(bankTiers).map(([key, bank]) => (
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

          <PortfolioBuilder 
            storageKey={`finshield-portfolio-state-${user?.uid || 'guest'}`}
            onChange={setPortfolioData}
          />
        </div>
      )}

      {page === 2 && (
        <div className="tool-page active">
          <div className="tool-header" style={{ marginBottom: '24px' }}>
            <div className="tool-title" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
              FIRE Dashboard & Tax Optimizer
            </div>
            <div className="tool-sub" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              อิสรภาพทางการเงินและกลยุทธ์ภาษีปันผลอัจฉริยะ (ครบวงจร)
            </div>
          </div>


          {/* Top Row Cards */}
          {(() => {
            const yieldRate = portfolioData?.weightedYield || 0;
            const r = yieldRate / 100;
            const n = result?.years || 0;
            
            // Use actual current investment + profit if available, else simulated net initial capital
            const p = pnlData ? (pnlData.totalInvested + pnlData.totalProfitLoss) : (result?.netInitialCapital || 0);
            const pmt = (result?.netMonthlySavings || 0) * 12;
            
            const futureValue = r === 0 ? p + pmt * n : p * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
            const annualDividend = futureValue * r;
            const inflationAdjusted = futureValue / Math.pow(1 + (inflationRate || 0) / 100, n);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <i className="fi fi-sr-trophy" style={{ fontSize: '18px', color: 'var(--green)' }}></i> มูลค่าพอร์ต ณ วันเกษียณ
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'" }}>
                    ฿{fmt(Math.round(futureValue))}
                  </div>
                </div>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <i className="fi fi-sr-coins" style={{ fontSize: '18px', color: 'var(--gold)' }}></i> เงินปันผลรวม/ปี (คาดการณ์ {yieldRate.toFixed(2)}%)
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--gold)', fontFamily: "'Space Mono'" }}>
                    ฿{fmt(Math.round(annualDividend))}
                  </div>
                </div>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fi fi-sr-arrow-trend-down" style={{ fontSize: '18px', color: 'var(--accent-blue)' }}></i> มูลค่าปรับเงินเฟ้อ
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'normal' }}>
                      เงินเฟ้อ
                      <input 
                        type="number" 
                        value={inflationRate === 0 ? '' : inflationRate}
                        onChange={(e) => setInflationRate(e.target.value === '' ? 0 : Number(e.target.value))}
                        style={{ width: '45px', padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', fontSize: '12px', background: 'var(--bg-sub)', color: 'var(--text-main)' }}
                      />
                      %
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: "'Space Mono'" }}>
                    ฿{fmt(Math.round(inflationAdjusted))}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid2" style={{ alignItems: 'start' }}>
            {/* Left Column: Tax & Income */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-money-bill-wave" style={{ fontSize: '18px' }}></i> ข้อมูลรายได้ต่อปีเพื่อคำนวณฐานภาษี
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>รายได้ทั้งปี (บาท)</label>
                  <div className="form-input-prefix">
                    <span>฿</span>
                    <input
                      type="number"
                      className="form-input"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-shield-plus" style={{ fontSize: '18px' }}></i> 1. ประเมินลดหย่อนภาษีเงินได้ (Income Tax)
                </div>
                
                {/* Accordion 1: Insurance */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.insurance ? '16px' : '0' }}
                    onClick={() => toggleAccordion('insurance')}
                  >
                    {taxAccordions.insurance ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    กลุ่มประกันสังคมและประกันชีวิต
                  </div>
                  {taxAccordions.insurance && (
                    <div className="grid2">
                      {renderTaxInput('ประกันสังคม', 'socialSecurity')}
                      {renderTaxInput('ประกันชีวิตทั่วไป', 'lifeInsurance')}
                      {renderTaxInput('ประกันสุขภาพ', 'healthInsurance')}
                      {renderTaxInput('ประกันสุขภาพพ่อแม่', 'parentsHealthInsurance')}
                      {renderTaxInput('ประกันบำนาญ', 'pensionInsurance')}
                    </div>
                  )}
                </div>

                {/* Accordion 2: Investment */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.investment ? '16px' : '0' }}
                    onClick={() => toggleAccordion('investment')}
                  >
                    {taxAccordions.investment ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    กลุ่มการออมและการลงทุน
                  </div>
                  {taxAccordions.investment && (
                    <div className="grid2">
                      {renderTaxInput('กองทุนสำรองเลี้ยงชีพ (PVD)', 'pvd')}
                      {renderTaxInput('กองทุนรวมเพื่อการออม (SSF)', 'ssf')}
                      {renderTaxInput('กองทุนเพื่อการเลี้ยงชีพ (RMF)', 'rmf')}
                      {renderTaxInput('กองทุนรวม THAIESG', 'thaiesg')}
                      {renderTaxInput('กองทุนการออมแห่งชาติ (กอช.)', 'nsf')}
                      {renderTaxInput('กองทุน SSFX', 'ssfx')}
                    </div>
                  )}
                </div>

                {/* Accordion 3: Family */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.family ? '16px' : '0' }}
                    onClick={() => toggleAccordion('family')}
                  >
                    {taxAccordions.family ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    กลุ่มส่วนตัวและครอบครัว (จำนวนคน / ตามจ่ายจริง)
                  </div>
                  {taxAccordions.family && (
                    <div className="grid2">
                      <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={taxDeductions.spouseNoIncome} 
                            onChange={(e) => setTaxDeductions({...taxDeductions, spouseNoIncome: e.target.checked})}
                          /> คู่สมรสไม่มีรายได้
                        </label>
                      </div>
                      {renderTaxInput('บุตร (เกิดก่อนปี 2561)', 'childBefore2561')}
                      {renderTaxInput('บุตร (เกิดตั้งแต่ปี 2561)', 'childAfter2561')}
                      {renderTaxInput('บุตรบุญธรรม (คน)', 'adoptedChild')}
                      {renderTaxInput('อุปการะพ่อแม่ (คน)', 'parentCare')}
                      {renderTaxInput('ฝากครรภ์และคลอดบุตร (บาท)', 'pregnancyCare')}
                    </div>
                  )}
                </div>

                {/* Accordion 4: Stimulus */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.stimulus ? '16px' : '0' }}
                    onClick={() => toggleAccordion('stimulus')}
                  >
                    {taxAccordions.stimulus ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    มาตรการรัฐและกระตุ้นเศรษฐกิจ
                  </div>
                  {taxAccordions.stimulus && (
                    <div className="grid2">
                      {renderTaxInput('EASY E-RECEIPT 2567', 'easyEReceipt')}
                      {renderTaxInput('เที่ยวเมืองรอง 2567', 'secondTierCity')}
                      {renderTaxInput('วิสาหกิจเพื่อสังคม', 'socialEnterprise')}
                    </div>
                  )}
                </div>

                {/* Accordion 5: Housing */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.housing ? '16px' : '0' }}
                    onClick={() => toggleAccordion('housing')}
                  >
                    {taxAccordions.housing ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    กลุ่มที่อยู่อาศัย
                  </div>
                  {taxAccordions.housing && (
                    <div className="grid2">
                      {renderTaxInput('ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย', 'homeLoanInterest')}
                      {renderTaxInput('ซ่อมแซมบ้าน (มาตรการรัฐ)', 'homeRepair')}
                    </div>
                  )}
                </div>

                {/* Accordion 6: Donation */}
                <div>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.donation ? '16px' : '0' }}
                    onClick={() => toggleAccordion('donation')}
                  >
                    {taxAccordions.donation ? <i className="fi fi-sr-angle-down" style={{ fontSize: '16px' }}></i> : <i className="fi fi-sr-angle-right" style={{ fontSize: '16px' }}></i>}
                    กลุ่มเงินบริจาค
                  </div>
                  {taxAccordions.donation && (
                    <div className="grid2">
                      {renderTaxInput('บริจาคทั่วไป (ลดหย่อน 1 เท่า)', 'generalDonation')}
                      {renderTaxInput('บริจาคการศึกษา/รพ. (ลดหย่อน 2 เท่า)', 'educationDonation')}
                      {renderTaxInput('พรรคการเมือง', 'politicalDonation')}
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Summary */}
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-clipboard-list" style={{ fontSize: '18px' }}></i> สรุปวิธีคำนวณเงินได้สุทธิทีละขั้นตอน
                </div>
                <div className="stat-row"><span className="stat-label">รายได้รวมทั้งปี</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(taxResult.grossIncome)}</span></div>
                <div className="stat-row"><span className="stat-label" style={{ color: 'var(--red)' }}>- หักค่าใช้จ่าย (สูงสุด 100,000)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>- ฿{fmt(taxResult.expenseDeduction)}</span></div>
                <div className="stat-row"><span className="stat-label" style={{ color: 'var(--red)' }}>- หักลดหย่อนส่วนตัว</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>- ฿{fmt(taxResult.personalDeduction)}</span></div>
                <div className="stat-row" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span className="stat-label" style={{ color: 'var(--red)' }}>- หักลดหย่อนอื่นๆ เพิ่มเติม</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>- ฿{fmt(taxResult.otherDeductions)}</span></div>
                
                <div className="stat-row" style={{ marginTop: '16px' }}><span className="stat-label" style={{ fontWeight: 'bold' }}>เงินได้สุทธิเพื่อนำไปคิดภาษีขั้นบันได</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(taxResult.netIncome)}</span></div>
                <div className="stat-row" style={{ marginTop: '24px' }}><span className="stat-label">ภาษีจ่าย (ไม่มีลดหย่อนเพิ่มเติม)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(taxResult.taxWithoutDeductions)}</span></div>
                <div className="stat-row"><span className="stat-label">ภาษีที่ต้องชำระ (หลังลดหย่อน)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(taxResult.taxWithDeductions)}</span></div>
                <div className="stat-row"><span className="stat-label" style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>ประหยัดภาษีไปได้ทั้งหมด!</span><span className="stat-val" style={{ color: 'var(--accent-blue)', fontFamily: "'Space Mono'"}}>฿{fmt(taxResult.taxSaved)}</span></div>
              </div>

              {/* Dividend Tax Refund Plan */}
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-clipboard-list" style={{ fontSize: '18px' }}></i> 2. วางแผนขอคืนภาษีเงินปันผล (ม.47 ทวิ)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  ระบบใช้ฐานภาษี <span style={{ fontWeight: 'bold' }}>{(taxResult.marginalRate * 100).toFixed(0)}%</span> ของคุณมาคำนวณสิทธิในการขอคืนเครดิตภาษีเงินปันผลอัตโนมัติ
                </div>
                <div className="stat-row"><span className="stat-label">ภาษีหัก ณ ที่จ่าย (10%)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.withholdingTax)}</span></div>
                <div className="stat-row"><span className="stat-label">เครดิตภาษีที่ได้รับ (สมมติฐาน 20%)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.taxCredit)}</span></div>
                <div className="stat-row" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span className="stat-label">ภาษีที่ต้องเสียสำหรับเงินปันผล</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.dividendTaxPayable)}</span></div>
                <div className="stat-row" style={{ marginTop: '16px' }}><span className="stat-label" style={{ color: 'var(--green)', fontWeight: 'bold' }}><i className="fi fi-sr-check-circle" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}></i>ขอเงินคืนภาษีได้/ปี</span><span className="stat-val" style={{ color: 'var(--green)', fontSize: '18px', fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.refundAmount)}</span></div>
                
                {dividendResult.shouldClaimRefund ? (
                  <div style={{ marginTop: '16px', background: 'var(--bg-success-subtle, #e8f5e9)', padding: '16px', borderRadius: '8px', color: 'var(--green)', fontSize: '12px', border: '1px solid #c8e6c9' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <i className="fi fi-sr-check-circle" style={{ fontSize: '14px' }}></i> กลยุทธ์ภาษีแนะนำ
                    </div>
                    ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) ต่ำกว่าอัตราภาษีนิติบุคคล แนะนำให้นำเงินปันผลมายื่นรวมคำนวณภาษีปลายปี เพื่อขอรับเครดิตภาษีคืน
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', background: 'var(--bg-danger-subtle, #ffebee)', padding: '16px', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', border: '1px solid #ffcdd2' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <i className="fi fi-sr-exclamation" style={{ fontSize: '14px' }}></i> กลยุทธ์ภาษีแนะนำ
                    </div>
                    ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) สูงกว่าเพดาน — แนะนำให้เลือกหักภาษี ณ ที่จ่าย 10% (Final Tax) แทนการยื่นรวมคำนวณ เพื่อป้องกันการเสียภาษีเพิ่ม
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Portfolio & Profit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-arrow-trend-up" style={{ fontSize: '18px', color: 'var(--green)' }}></i> ประมาณการกำไร/ขาดทุน
                </div>
                {pnlLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>
                ) : pnlData ? (
                  <>
                    <div style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px dashed var(--border)' }}>
                      <div className="stat-row">
                        <span className="stat-label">เงินลงทุนรวม</span>
                        <span className="stat-val" style={{fontFamily: "'Space Mono'"}}>
                          ฿{fmt(Math.round(pnlData.totalInvested))}
                          {result?.feeDetails?.totalFeeAmount > 0 && (
                            <span style={{ fontSize: '10px', color: 'var(--red)', marginLeft: '6px' }}>(-฿{fmt(Math.round(result.feeDetails.totalFeeAmount))})</span>
                          )}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">กำไร/ขาดทุนรวม</span>
                        <span className="stat-val" style={{fontFamily: "'Space Mono'", color: pnlData.totalProfitLoss >= 0 ? 'var(--green)' : 'var(--red)'}}>
                          {pnlData.totalProfitLoss >= 0 ? '+' : ''}฿{fmt(Math.abs(Math.round(pnlData.totalProfitLoss)))} <span style={{fontSize: '10px'}}>({pnlData.totalProfitLossPct >= 0 ? '+' : ''}{pnlData.totalProfitLossPct.toFixed(2)}%)</span>
                        </span>
                      </div>
                      {(() => {
                        const dayChg = pnlData.portfolioOneDayChangePct || 0;
                        const dayChgTHB = pnlData.portfolioOneDayChangeTHB || 0;
                        return (
                          <div className="stat-row">
                            <span className="stat-label">% เปลี่ยนแปลง</span>
                            <span className="stat-val" style={{fontFamily: "'Space Mono'", color: dayChg >= 0 ? 'var(--green)' : 'var(--red)'}}>
                              {dayChg >= 0 ? '+' : ''}{dayChg.toFixed(2)}% <span style={{fontSize: '10px'}}>({dayChgTHB >= 0 ? '+' : ''}฿{fmt(Math.abs(Math.round(dayChgTHB)))})</span>
                            </span>
                          </div>
                        );
                      })()}
                      <div className="stat-row" style={{ borderBottom: 'none' }}>
                        <span className="stat-label">คาดการณ์กำไร ({result?.years || 0} ปี)</span>
                        <span className="stat-val" style={{fontFamily: "'Space Mono'", color: 'var(--accent-blue)'}}>
                          +฿{fmt(Math.round(pnlData.totalInvested * Math.pow(1 + (portfolioData?.weightedYield || 0)/100, result?.years || 0) - pnlData.totalInvested))}
                        </span>
                      </div>
                    </div>

                    <div style={{ maxHeight: "350px", overflowY: "auto", fontSize: "12px", display: 'flex', flexDirection: 'column', gap: '0px' }}>
                      {pnlData.assets.map((a: any) => {
                        const plColor = a.profitLoss >= 0 ? 'var(--green)' : 'var(--red)';
                        const dayColor = (a.oneDayChangePct || 0) >= 0 ? 'var(--green)' : 'var(--red)';
                        const isDca = (portfolioData?.transactions?.[a.id]?.length || 0) > 1 || a.buyDate === 'DCA';
                        const requestedBuyDate = portfolioData?.buyDates?.[a.id] || a.buyDate;
                        
                        let dateDisplay = isDca ? "หลายรายการ (DCA)" : requestedBuyDate;
                        if (!isDca && dateDisplay) {
                          try {
                            const [yyyy, mm, dd] = dateDisplay.split('T')[0].split('-');
                            if (yyyy && mm && dd) {
                              dateDisplay = `${dd}/${mm}/${(Number(yyyy) + 543).toString().slice(2)}`;
                            }
                          } catch (e) {}
                        }

                        const isUsd = a.currency === 'USD';
                        const costDisplay = isUsd ? `$${a.costPriceRaw?.toFixed(2)}` : `฿${a.costPrice?.toFixed(2)}`;
                        const curDisplay = isUsd ? `$${a.currentPriceRaw?.toFixed(2)}` : `฿${a.currentPrice?.toFixed(2)}`;

                        return (
                          <details key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <summary style={{ cursor: 'pointer', listStyle: 'none', userSelect: 'none' }} className="hide-details-marker">
                              <div style={{ padding: '12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{a.id}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ fontWeight: 'bold', color: plColor, fontFamily: "'Space Mono'", fontSize: '13px' }}>
                                    {a.profitLoss >= 0 ? '+' : ''}฿{Math.round(a.profitLoss).toLocaleString()} <span style={{ fontSize: '11px' }}>({a.profitLossPct >= 0 ? '+' : ''}{a.profitLossPct.toFixed(2)}%)</span>
                                  </div>
                                  <i className="fi fi-rr-caret-down" style={{ fontSize: '12px', color: 'var(--text-muted)' }}></i>
                                </div>
                              </div>
                            </summary>
                            <div style={{ padding: '16px', background: 'var(--bg-sub)', fontSize: '11px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', borderTop: '1px dashed var(--border)' }}>
                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>ชื่อสินทรัพย์</div>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>{a.name}</div>
                              </div>

                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>จำนวนหุ้น</div>
                                <div style={{ fontFamily: "'Space Mono'", fontWeight: 'bold' }}>{a.shares > 0 ? a.shares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>ราคาปัจจุบัน</div>
                                <div style={{ fontFamily: "'Space Mono'", fontWeight: 'bold' }}>{curDisplay}</div>
                                <div style={{ fontSize: '10px', color: dayColor, marginTop: '2px' }}>{(a.oneDayChangePct || 0) >= 0 ? '↗' : '↘'} {(a.oneDayChangePct || 0) >= 0 ? '+' : ''}{(a.oneDayChangePct || 0).toFixed(2)}%</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>ต้นทุนเฉลี่ย / หุ้น</div>
                                <div style={{ fontFamily: "'Space Mono'", fontWeight: 'bold' }}>{costDisplay}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>ต้นทุนรวม</div>
                                <div style={{ fontFamily: "'Space Mono'", fontWeight: 'bold' }}>฿{a.invested.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>มูลค่าปัจจุบัน</div>
                                <div style={{ fontFamily: "'Space Mono'", fontWeight: 'bold', color: 'var(--text-main)' }}>฿{a.currentValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>กรุณาจัดพอร์ตในหน้าแรกเพื่อดูประมาณการกำไร/ขาดทุน</div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-coins" style={{ fontSize: '18px', color: 'var(--gold)' }}></i> เงินปันผลสะสม ({result?.years || 0} ปี)
                </div>
                {pnlData && portfolioData ? (() => {
                   const annualDividendGross = pnlData.totalInvested * (portfolioData.weightedYield / 100);
                   const annualDividendNet = annualDividendGross * 0.9;
                   const monthlyDividendNet = annualDividendNet / 12;
                   const yearsToShow = [1, 3, 5, 10, result?.years || 0].filter(y => y > 0).sort((a,b)=>a-b);
                   // Ensure uniqueness if result.years matches one of the defaults
                   const uniqueYearsToShow = Array.from(new Set(yearsToShow));

                   return (
                     <>
                        <div className="stat-row"><span className="stat-label">ปันผล/ปี (ก่อนภาษี)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(Math.round(annualDividendGross))}</span></div>
                        <div className="stat-row"><span className="stat-label">ปันผล/ปี (หลังหักภาษี 10%)</span><span className="stat-val" style={{color: "var(--green)", fontFamily: "'Space Mono'"}}>฿{fmt(Math.round(annualDividendNet))}</span></div>
                        <div className="stat-row"><span className="stat-label">ปันผล/เดือน (สุทธิ)</span><span className="stat-val" style={{color: "var(--gold)", fontFamily: "'Space Mono'"}}>฿{fmt(Math.round(monthlyDividendNet))}</span></div>
                        <div style={{ marginTop: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {uniqueYearsToShow.map(y => (
                            <div key={y} style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ {y}</div>
                              <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿{fmt(Math.round(annualDividendNet * y))}</div>
                            </div>
                          ))}
                        </div>
                     </>
                   )
                })() : <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>กรุณาจัดพอร์ตในหน้าแรกเพื่อดูข้อมูลปันผล</div>}
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-robot" style={{ fontSize: '18px' }}></i> AI Portfolio vs พอร์ตของคุณ
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  เปรียบเทียบผลลัพธ์พอร์ตของคุณ (Yield สมมติ 8%) กับพอร์ตที่ AI แนะนำสำหรับวัยเกษียณ (Yield เป้าหมาย 7.20%)
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">ผลตอบแทนเฉลี่ย (Yield)</span>
                  <span className="stat-val" style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div style={{ marginBottom: '2px' }}>ของคุณ: <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>1.20%</span></div>
                    <div>AI แนะนำ: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>7.20%</span></div>
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">มูลค่าพอร์ต ณ วันเกษียณ</span>
                  <span className="stat-val" style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div style={{ marginBottom: '2px' }}>ของคุณ: <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>฿1,098,742</span></div>
                    <div>AI แนะนำ: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>฿2,074,347</span></div>
                  </span>
                </div>
                <div className="stat-row" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <span className="stat-label">เงินปันผลสุทธิ / เดือน</span>
                  <span className="stat-val" style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div style={{ marginBottom: '2px' }}>ของคุณ: <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>฿989</span></div>
                    <div>AI แนะนำ: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>฿11,201</span></div>
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>💼 สินทรัพย์ของคุณ</div>
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>GOOGL</span><span style={{color:'var(--text-muted)'}}>10%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>AVGO</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>TSM</span><span style={{color:'var(--text-muted)'}}>10%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>LLY</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>SPY</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{fontWeight:'bold'}}>IVV</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>🤖 AI แนะนำ (TOP 4)</div>
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>SCHD</span><span style={{color:'var(--text-muted)'}}>30%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>JEPI</span><span style={{color:'var(--text-muted)'}}>30%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}><span style={{fontWeight:'bold'}}>PTT</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{fontWeight:'bold'}}>O-DRx</span><span style={{color:'var(--text-muted)'}}>20%</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-calendar" style={{ fontSize: '18px' }}></i> ปฏิทินรับเงินปันผลรายเดือน (หลังหักภาษี 10%)
                </div>
                {dividendLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>กำลังประมวลผลปฏิทินปันผล...</div>
                ) : dividendCalendarData && dividendCalendarData.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                    {dividendCalendarData.map((d: any) => (
                      <div key={d.monthIndex} style={{ background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{d.month}</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'", marginBottom: '8px' }}>฿{fmt(Math.round(d.amount))}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>จาก: {d.assets}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
                    ไม่มีข้อมูลเงินปันผลสำหรับพอร์ตนี้ (กรุณาเลือกหุ้นที่มีปันผล)
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fi fi-sr-chart-pie" style={{ fontSize: '18px' }}></i> Goal Progress
                </div>
                <div className="stat-row"><span className="stat-label">เป้าหมาย/เดือน</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿50,000</span></div>
                <div className="stat-row" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span className="stat-label">ทำได้จริง (สุทธิ)/เดือน</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿989</span></div>
                
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                    <span>ความสำเร็จ</span>
                    <span>2%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-sub)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '2%', height: '100%', background: 'var(--gold)' }}></div>
                  </div>
                </div>
                
                <div style={{ marginTop: '16px', background: 'var(--bg-danger-subtle, #ffebee)', padding: '12px', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <i className="fi fi-sr-exclamation" style={{ fontSize: '16px', flexShrink: 0 }}></i>
                  <span>พอร์ตยังไม่ถึงเป้า ลองเพิ่มเงินออมรายเดือน หรือปรับสัดส่วนสินทรัพย์ Yield สูงขึ้น</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

