"use client";

import React, { useState, useEffect, useTransition } from "react";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useFinance } from "@/contexts/FinanceContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Timer, Tag, ChartLineUp, Lightbulb, Warning, Car, ForkKnife, House, ShoppingCart, Airplane, TrendUp, ShieldCheck, Bank, Coins, Money, ChartBar, CheckCircle, XCircle } from "@phosphor-icons/react";

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
  const [salaryGrowth, setSalaryGrowth] = useState(5); // 5% per year
  
  // Investment parameters
  const [investmentAmount, setInvestmentAmount] = useState(500000);
  const [expectedReturn, setExpectedReturn] = useState(7); // 7% per year
  
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
    // Add default salary if available, else 40000
    if (financeData.assets.monthlyIncome) {
      setSalary(financeData.assets.monthlyIncome);
    }
  }, [financeData, financeLoading]);

  const currentTotalExpenseWithoutDebt = expenses.travel + expenses.food + expenses.rent + expenses.goods + expenses.other;
  const currentTotalExpense = currentTotalExpenseWithoutDebt + expenses.debt;
  const inflationRate = 0.03; // 3% per year

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

  // Calculations for Page 1 & 2
  const annualExpenseIncrease = result ? (result.futureMonthlyExpense - result.currentMonthlyExpense) * 12 : 0;
  
  // Investment calculations (Annual)
  const nominalReturnAnnual = investmentAmount * (expectedReturn / 100);
  const inflationLossAnnual = investmentAmount * inflationRate;
  const netRealProfitAnnual = nominalReturnAnnual - inflationLossAnnual;
  
  // Required investment size to cover expense increase
  const requiredInvestmentSize = expectedReturn > 0 ? (annualExpenseIncrease / (expectedReturn / 100)) : 0;

  // Wealth at year N (Page 2)
  const futureCash = investmentAmount;
  const futureBank = investmentAmount * Math.pow(1 + 0.015, timeline); // 1.5% bank rate
  const futureInvest = investmentAmount * Math.pow(1 + (expectedReturn / 100), timeline);
  
  const realFutureCash = futureCash / Math.pow(1 + inflationRate, timeline);
  const realFutureBank = futureBank / Math.pow(1 + inflationRate, timeline);
  const realFutureInvest = futureInvest / Math.pow(1 + inflationRate, timeline);

  return (
    <div className="tool-screen active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-nav" style={{ marginBottom: 0 }}>
          <button className={`page-btn ${page === 0 ? "active" : ""}`} onClick={() => setPage(0)}>
            <span className="num">1</span>รายได้ & เงินเฟ้อ
          </button>
          <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
            <span className="num">2</span>จำลองสู้เงินเฟ้อ
          </button>
          <button className={`page-btn ${page === 2 ? "active" : ""}`} onClick={() => setPage(2)}>
            <span className="num">3</span>สรุปพลังซื้อ
          </button>
        </div>
        
        {page === 0 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setPage(1)}>ต่อไป: จัดการเงินเฟ้อ →</button>
          </div>
        )}
        {page === 1 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(0)}>← กลับ</button>
            <button className="btn btn-primary" onClick={() => setPage(2)}>ดูผลลัพธ์พอร์ต →</button>
          </div>
        )}
        {page === 2 && (
          <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(1)}>← กลับ</button>
          </div>
        )}
      </div>

      {isPending ? (
        <PageSkeleton />
      ) : (
        <>
          {/* PAGE 0 */}
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
                  <Timer size={18} weight="bold" /> จำลองอนาคตในอีก (ปี)
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
              </div>

              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendUp size={18} weight="bold" /> ข้อมูลรายได้พนักงานประจำ
                </div>
                <div className="grid2">
                  <div className="form-group">
                    <label className="form-label">เงินเดือนปัจจุบัน</label>
                    <div className="form-input-prefix">
                      <span>฿</span>
                      <input
                        type="number"
                        className="form-input"
                        value={salary === 0 ? '' : salary}
                        onChange={(e) => setSalary(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">คาดการณ์เงินเดือนขึ้น/ปี</label>
                    <div className="form-input-prefix">
                      <span>%</span>
                      <input
                        type="number"
                        className="form-input"
                        value={salaryGrowth === 0 ? '' : salaryGrowth}
                        onChange={(e) => setSalaryGrowth(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>
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
                  { key: "debt" as const, label: "ภาระหนี้สินที่ต้องจ่าย/เดือน", icon: <Bank size={16} weight="bold" /> },
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
                  <ChartLineUp size={18} weight="bold" /> Salary vs. Inflation ({timeline} ปี)
                </div>
                {result && (
                  <div style={{ marginTop: '16px' }}>
                    <div className="stat-row">
                      <span className="stat-label">เงินเดือนปัจจุบัน</span>
                      <span className="stat-val">฿{result.currentSalary.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">เงินเดือนในอนาคต (ตัวเลข)</span>
                      <span className="stat-val green">฿{result.futureSalary.toLocaleString()}</span>
                    </div>
                    
                    <div className="divider"></div>

                    <div className="stat-row">
                      <span className="stat-label">ค่าใช้จ่ายรวมปัจจุบัน</span>
                      <span className="stat-val">฿{result.currentMonthlyExpense.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">ค่าใช้จ่ายในอนาคต (เฟ้อ {result.inflationRate}%)</span>
                      <span className="stat-val red">฿{result.futureMonthlyExpense.toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">ส่วนต่างค่าครองชีพที่เพิ่มขึ้น</span>
                      <span className="stat-val red">+฿{result.monthlyDifference.toLocaleString()}/เดือน</span>
                    </div>

                    <div className="divider"></div>
                    
                    <div style={{ padding: '16px', background: result.salaryDiffReal >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', borderRadius: '12px', border: `1px solid ${result.salaryDiffReal >= 0 ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}` }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: result.salaryDiffReal >= 0 ? 'var(--green)' : 'var(--red)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {result.salaryDiffReal >= 0 ? <CheckCircle size={18} weight="bold"/> : <Warning size={18} weight="bold"/>}
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
                          : `เมื่อปรับเงินเฟ้อแล้ว กำลังซื้อของคุณหายไป ฿${Math.abs(result.salaryDiffReal).toLocaleString()}/เดือน (ต้องหาผลตอบแทนจากการลงทุนมาช่วย)`
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setPage(1)}
                style={{ 
                  marginTop: '12px', 
                  padding: '14px 20px', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  borderRadius: '12px', 
                  boxShadow: '0 8px 24px rgba(37,99,235,0.25)' 
                }}
              >
                ต่อไป: หาผลตอบแทนมาสู้เงินเฟ้อ →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 1 */}
      {page === 1 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Beat Inflation <span>Simulator</span></div>
            <div className="tool-sub">คำนวณเงินลงทุนและอัตราผลตอบแทนขั้นต่ำที่ต้องใช้ เพื่อชดเชยค่าครองชีพที่แพงขึ้น</div>
          </div>

          <div className="grid2">
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={18} weight="bold" /> ข้อมูลการลงทุน (ปัจจุบัน)
                </div>
                <div className="form-group">
                  <label className="form-label">เงินลงทุนตั้งต้นที่มี</label>
                  <div className="form-input-prefix">
                    <span>฿</span>
                    <input
                      type="number"
                      className="form-input"
                      value={investmentAmount === 0 ? '' : investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ผลตอบแทนที่คาดหวัง/ปี</label>
                  <div className="form-input-prefix">
                    <span>%</span>
                    <input
                      type="number"
                      className="form-input"
                      value={expectedReturn === 0 ? '' : expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    * เงินเฟ้อทั่วไปอยู่ที่ประมาณ 3% ต่อปี
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TargetIcon /> ขนาดพอร์ตที่ต้องการ
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '16px', lineHeight: 1.6 }}>
                  เพื่อนำผลตอบแทนจากการลงทุน มาจ่าย <strong>"ค่าครองชีพที่แพงขึ้นในอีก {timeline} ปี"</strong> (จำนวน ฿{result?.monthlyDifference.toLocaleString()}/เดือน หรือ ฿{((result?.monthlyDifference || 0)*12).toLocaleString()}/ปี)
                </div>
                
                <div style={{ background: 'var(--bg-sub)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>ขนาดพอร์ตขั้นต่ำที่ต้องมี (ที่ผลตอบแทน {expectedReturn}%)</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '28px', fontWeight: 800, color: 'var(--gold)' }}>
                    ฿{Math.round(requiredInvestmentSize).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="card">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChartBar size={18} weight="bold" /> ผลตอบแทนที่แท้จริง (Real Return)
                </div>
                
                <div className="stat-row">
                  <span className="stat-label">ผลตอบแทนจากการลงทุน ({expectedReturn}%)</span>
                  <span className="stat-val green">+฿{Math.round(nominalReturnAnnual).toLocaleString()}/ปี</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">มูลค่าที่หายไปจากเงินเฟ้อ (3%)</span>
                  <span className="stat-val red">-฿{Math.round(inflationLossAnnual).toLocaleString()}/ปี</span>
                </div>
                
                <div className="divider"></div>

                <div className="stat-row">
                  <span className="stat-label" style={{ fontWeight: 700 }}>กำไรสุทธิหลังหักเงินเฟ้อ</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: netRealProfitAnnual >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {netRealProfitAnnual >= 0 ? '+' : ''}฿{Math.round(netRealProfitAnnual).toLocaleString()}/ปี
                  </span>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>เปอร์เซ็นต์ผลตอบแทนขั้นต่ำเพื่อเอาชนะเงินเฟ้อ</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-sub)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (expectedReturn / Math.max(3.01, expectedReturn)) * 100)}%`, height: '100%', background: expectedReturn > 3 ? 'var(--green)' : 'var(--red)' }}></div>
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '14px', fontWeight: 700, color: expectedReturn > 3 ? 'var(--green)' : 'var(--red)' }}>
                      {expectedReturn > 3 ? 'ผ่านเกณฑ์ (>3%)' : 'ต่ำกว่าเงินเฟ้อ!'}
                    </span>
                  </div>
                </div>

                {expectedReturn <= 3 && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(220,38,38,0.08)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)', fontSize: '12px', color: 'var(--red)', lineHeight: 1.5 }}>
                    <strong>คำเตือน:</strong> ผลตอบแทนของคุณต่ำกว่าเงินเฟ้อ (3%) ทำให้มูลค่าเงินลงทุนของคุณลดลงเรื่อยๆ แนะนำให้กระจายพอร์ตไปยังสินทรัพย์ที่ให้ผลตอบแทนสูงขึ้น
                  </div>
                )}
                
                <button 
                  className="btn btn-primary btn-full" 
                  onClick={() => setPage(2)}
                  style={{ marginTop: '24px' }}
                >
                  สรุปพลังซื้อในอีก {timeline} ปี →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2 */}
      {page === 2 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Purchasing Power <span>Dashboard</span></div>
            <div className="tool-sub">เปรียบเทียบมูลค่าเงินของคุณเมื่อเวลาผ่านไป {timeline} ปี พร้อมคำแนะนำจาก AI</div>
          </div>
          
          <div className="grid3" style={{ marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--red)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>เก็บเงินสดเฉยๆ</div>
              <div style={{ fontSize: '24px', margin: '16px 0' }}>💵</div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>มูลค่าเงินเริ่มต้น: ฿{investmentAmount.toLocaleString()}</div>
              <div style={{ margin: '12px 0', borderTop: '1px dashed var(--border)' }}></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>พลังซื้อจริงหลัง {timeline} ปี</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: 'var(--red)' }}>
                ฿{Math.round(realFutureCash).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>มูลค่าลดลง {Math.round((1 - realFutureCash/investmentAmount)*100)}%</div>
            </div>

            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--gold)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>ฝากออมทรัพย์ (1.5%)</div>
              <div style={{ fontSize: '24px', margin: '16px 0' }}>🏦</div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>มูลค่าเงินอนาคต: ฿{Math.round(futureBank).toLocaleString()}</div>
              <div style={{ margin: '12px 0', borderTop: '1px dashed var(--border)' }}></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>พลังซื้อจริงหลัง {timeline} ปี</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: 'var(--gold)' }}>
                ฿{Math.round(realFutureBank).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '4px' }}>โตไม่ทันเงินเฟ้อ</div>
            </div>

            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--green)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>พอร์ตลงทุน ({expectedReturn}%)</div>
              <div style={{ fontSize: '24px', margin: '16px 0' }}>📈</div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>มูลค่าเงินอนาคต: ฿{Math.round(futureInvest).toLocaleString()}</div>
              <div style={{ margin: '12px 0', borderTop: '1px dashed var(--border)' }}></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>พลังซื้อจริงหลัง {timeline} ปี</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: 'var(--green)' }}>
                ฿{Math.round(realFutureInvest).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>{expectedReturn > 3 ? 'มูลค่าเติบโตสุทธิ' : 'มูลค่าลดลง'}</div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--bg-sub)' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={18} weight="bold" color="var(--gold)" /> คำแนะนำจาก AI
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.7 }}>
              {expectedReturn <= 3 ? (
                <>เงินลงทุนของคุณเติบโต <strong>ช้ากว่าอัตราเงินเฟ้อ</strong> 😱 พลังซื้อของคุณจะค่อยๆ ถูกกัดกินทุกปี แม้ตัวเลขในบัญชีจะเพิ่มขึ้น แต่ซื้อของได้น้อยลง แนะนำให้กระจายการลงทุนไปในสินทรัพย์ที่ให้ผลตอบแทนมากกว่า 3% เช่น หุ้น กองทุนรวม หรืออสังหาริมทรัพย์ (REITs)</>
              ) : (
                <>ยอดเยี่ยม! 🎉 อัตราผลตอบแทน <strong>{expectedReturn}%</strong> ของคุณสามารถเอาชนะเงินเฟ้อได้ ทำให้ความมั่งคั่งที่แท้จริงของคุณเติบโตขึ้น หากคุณตั้งเป้าที่จะนำผลตอบแทนนี้มาครอบคลุมรายจ่ายประจำเดือนที่แพงขึ้น คุณควรเพิ่มขนาดพอร์ตให้ถึง <strong>฿{Math.round(requiredInvestmentSize).toLocaleString()}</strong> ด้วยการออมสะสมอย่างต่อเนื่อง!</>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// TargetIcon component to fill the missing icon
const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);
