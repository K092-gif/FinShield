"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import PortfolioBuilder from "@/components/ui/PortfolioBuilder";
import { ClipboardText, Bank, ChartBar, ChartDonut, WarningCircle, TrendUp, Coins, Robot, Calendar, ShieldPlus, CaretDown, CaretRight, Money, CheckCircle, Trophy, ChartLineDown } from "@phosphor-icons/react";
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
  const { financeData, loading: financeLoading } = useFinance();

  const [page, setPage] = useState(0);
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(55);
  const [initialCapital, setInitialCapital] = useState(500000);
  const [monthlySavings, setMonthlySavings] = useState(10000);
  const [dividendGoal, setDividendGoal] = useState(50000);
  const [selectedBank, setSelectedBank] = useState("kkp_dime");
  const [result, setResult] = useState<WealthResult | null>(null);
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
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardText weight="bold" size={18} /> ข้อมูลการเงินของคุณ
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
                <label className="form-label">เงินทุนตั้งต้น <span style={{fontSize:'10px', color:'var(--red)'}}>ต้นทุน 0.157% ถูกหักอัตโนมัติ</span></label>
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
                  <div className="stat-row"><span className="stat-label">เงินลงทุนสุทธิตั้งต้น (หักค่าธรรมเนียม)</span><span className="stat-val cyan">฿{result.netInitialCapital.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">เงินออม/เดือนสุทธิ</span><span className="stat-val cyan">฿{result.netMonthlySavings.toLocaleString()}</span></div>
                  <div className="stat-row"><span className="stat-label">ระยะเวลา</span><span className="stat-val">{result.years} ปี</span></div>
                </>
              )}
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bank weight="bold" size={18} /> เลือกบัญชีเงินฝากธนาคารเปรียบเทียบ
                </div>
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

          <PortfolioBuilder />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Trophy size={18} color="var(--green)" weight="bold" /> มูลค่าพอร์ต ณ วันเกษียณ
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'" }}>
                ฿1,098,742
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Coins size={18} color="var(--gold)" weight="bold" /> เงินปันผลรวม/ปี (คาดการณ์ 1.20%)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--gold)', fontFamily: "'Space Mono'" }}>
                ฿13,185
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ChartLineDown size={18} color="var(--accent-blue)" weight="bold" /> มูลค่าปรับเงินเฟ้อ (3%)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: "'Space Mono'" }}>
                ฿390,475
              </div>
            </div>
          </div>

          <div className="grid2" style={{ alignItems: 'start' }}>
            {/* Left Column: Tax & Income */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Money size={18} weight="bold" /> ข้อมูลรายได้ต่อปีเพื่อคำนวณฐานภาษี
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
                  <ShieldPlus size={18} weight="bold" /> 1. ประเมินลดหย่อนภาษีเงินได้ (Income Tax)
                </div>
                
                {/* Accordion 1: Insurance */}
                <div style={{ marginBottom: '12px' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: taxAccordions.insurance ? '16px' : '0' }}
                    onClick={() => toggleAccordion('insurance')}
                  >
                    {taxAccordions.insurance ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                    {taxAccordions.investment ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                    {taxAccordions.family ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                    {taxAccordions.stimulus ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                    {taxAccordions.housing ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                    {taxAccordions.donation ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
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
                  <ClipboardText size={18} weight="bold" /> สรุปวิธีคำนวณเงินได้สุทธิทีละขั้นตอน
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
                  <ClipboardText size={18} weight="bold" /> 2. วางแผนขอคืนภาษีเงินปันผล (ม.47 ทวิ)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  ระบบใช้ฐานภาษี <span style={{ fontWeight: 'bold' }}>{(taxResult.marginalRate * 100).toFixed(0)}%</span> ของคุณมาคำนวณสิทธิในการขอคืนเครดิตภาษีเงินปันผลอัตโนมัติ
                </div>
                <div className="stat-row"><span className="stat-label">ภาษีหัก ณ ที่จ่าย (10%)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.withholdingTax)}</span></div>
                <div className="stat-row"><span className="stat-label">เครดิตภาษีที่ได้รับ (สมมติฐาน 20%)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.taxCredit)}</span></div>
                <div className="stat-row" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}><span className="stat-label">ภาษีที่ต้องเสียสำหรับเงินปันผล</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.dividendTaxPayable)}</span></div>
                <div className="stat-row" style={{ marginTop: '16px' }}><span className="stat-label" style={{ color: 'var(--green)', fontWeight: 'bold' }}><CheckCircle size={16} weight="bold" style={{ verticalAlign: 'middle', marginRight: '4px' }}/>ขอเงินคืนภาษีได้/ปี</span><span className="stat-val" style={{ color: 'var(--green)', fontSize: '18px', fontFamily: "'Space Mono'"}}>฿{fmt(dividendResult.refundAmount)}</span></div>
                
                {dividendResult.shouldClaimRefund ? (
                  <div style={{ marginTop: '16px', background: 'var(--bg-success-subtle, #e8f5e9)', padding: '16px', borderRadius: '8px', color: 'var(--green)', fontSize: '12px', border: '1px solid #c8e6c9' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <CheckCircle size={14} weight="bold" /> กลยุทธ์ภาษีแนะนำ
                    </div>
                    ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) ต่ำกว่าอัตราภาษีนิติบุคคล แนะนำให้นำเงินปันผลมายื่นรวมคำนวณภาษีปลายปี เพื่อขอรับเครดิตภาษีคืน
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', background: 'var(--bg-danger-subtle, #ffebee)', padding: '16px', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', border: '1px solid #ffcdd2' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <WarningCircle size={14} weight="bold" /> กลยุทธ์ภาษีแนะนำ
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
                  <TrendUp weight="bold" size={18} color="var(--green)" /> ประมาณการกำไร/ขาดทุน
                </div>
                <div className="stat-row"><span className="stat-label">เงินลงทุนรวม</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿30,000</span></div>
                <div className="stat-row" style={{ paddingBottom: "12px", borderBottom: "1px dashed var(--border)" }}>
                  <span className="stat-label">กำไร/ขาดทุนรายวัน (จากตลาดจริง)</span>
                  <span className="stat-val" style={{ color: "var(--red)", fontFamily: "'Space Mono'" }}>฿-559</span>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <div className="stat-row" style={{ borderBottom: "none", paddingBottom: "4px" }}>
                    <span className="stat-label">คาดการณ์กำไรในอนาคต (35 ปี)</span>
                    <span className="stat-val" style={{ color: "var(--accent-blue)", fontFamily: "'Space Mono'" }}>+฿15,545</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", padding: "6px", background: "var(--bg-card-hover)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    <WarningCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    หมายเหตุ: คาดการณ์กำไรในอนาคตวิเคราะห์จากกราฟราคา backtest ด้วย AI เป็นเพียงการคาดการณ์จากข้อมูลในอดีตเท่านั้น
                  </div>
                </div>
                <div style={{ marginTop: "12px", maxHeight: "150px", overflowY: "auto", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>GOOGL</span>
                    <span style={{ color: "var(--red)", fontFamily: "'Space Mono'", fontWeight: 700 }}>฿-29 (-0.98%)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>AVGO</span>
                    <span style={{ color: "var(--red)", fontFamily: "'Space Mono'", fontWeight: 700 }}>฿-183 (-3.06%)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>TSM</span>
                    <span style={{ color: "var(--red)", fontFamily: "'Space Mono'", fontWeight: 700 }}>฿-201 (-6.69%)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700 }}>LLY</span>
                    <span style={{ color: "var(--green)", fontFamily: "'Space Mono'", fontWeight: 700 }}>+฿27 (+0.45%)</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins weight="bold" size={18} color="var(--gold)" /> เงินปันผลสะสม (35 ปี)
                </div>
                <div className="stat-row"><span className="stat-label">ปันผล/ปี (ก่อนภาษี)</span><span className="stat-val" style={{fontFamily: "'Space Mono'"}}>฿360</span></div>
                <div className="stat-row"><span className="stat-label">ปันผล/ปี (หลังหักภาษี 10%)</span><span className="stat-val" style={{color: "var(--green)", fontFamily: "'Space Mono'"}}>฿324</span></div>
                <div className="stat-row"><span className="stat-label">ปันผล/เดือน (สุทธิ)</span><span className="stat-val" style={{color: "var(--gold)", fontFamily: "'Space Mono'"}}>฿27</span></div>
                <div style={{ marginTop: "14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ 1</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿324</div>
                  </div>
                  <div style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ 3</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿972</div>
                  </div>
                  <div style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ 5</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿1,620</div>
                  </div>
                  <div style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ 10</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿3,240</div>
                  </div>
                  <div style={{ flex: "1 1 60px", padding: "8px", background: "var(--bg-sub)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>ปีที่ 35</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--green)", fontFamily: "'Space Mono'" }}>฿11,340</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Robot weight="bold" size={18} /> AI Portfolio vs พอร์ตของคุณ
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
                  <Calendar weight="bold" size={18} /> ปฏิทินรับเงินปันผลรายเดือน (หลังหักภาษี 10%)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                  <div style={{ background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>มี.ค.</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'", marginBottom: '8px' }}>฿2,967</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>จาก: AVGO, TSM, LLY, SPY, IVV</div>
                  </div>
                  <div style={{ background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>มิ.ย.</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'", marginBottom: '8px' }}>฿2,967</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>จาก: AVGO, TSM, LLY, SPY, IVV</div>
                  </div>
                  <div style={{ background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>ก.ย.</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'", marginBottom: '8px' }}>฿2,967</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>จาก: AVGO, TSM, LLY, SPY, IVV</div>
                  </div>
                  <div style={{ background: 'var(--bg-sub)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>ธ.ค.</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green)', fontFamily: "'Space Mono'", marginBottom: '8px' }}>฿2,967</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>จาก: AVGO, TSM, LLY, SPY, IVV</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChartDonut weight="bold" size={18} /> Goal Progress
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
                  <WarningCircle size={16} weight="fill" style={{ flexShrink: 0 }} />
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
