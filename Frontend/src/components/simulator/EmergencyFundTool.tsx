"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useState } from "react";

interface EmergencyResult {
  currentMonthlyExpense: number;
  monthsOfSurvival: number;
  recommendedSavings: number;
  shortfall: number;
  survivalScore: number;
  verdict: string;
}

export default function EmergencyFundTool() {
  const [page, setPage] = useState(0);
  const [expenses, setExpenses] = useState({
    food: 8000,
    rent: 12000,
    transport: 5000,
    debt: 5000,
    other: 3000,
  });
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [unemploymentMonths, setUnemploymentMonths] = useState(6);
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const totalMonthlyExpense = Object.values(expenses).reduce((a, b) => a + b, 0);

  const calculateEmergency = async () => {
    setLoading(true);
    try {
      // Fallback: Perform calculation locally
      const monthsOfSurvival = currentSavings / totalMonthlyExpense;
      const recommendedSavings = totalMonthlyExpense * unemploymentMonths;
      const shortfall = Math.max(0, recommendedSavings - currentSavings);
      const survivalScore = Math.min(100, (currentSavings / recommendedSavings) * 100);

      let verdict = "วิกฤตรุนแรง - มีความเสี่ยงล้มละลายหากตกงานกะทันหัน แนะนำให้เริ่มลดรายจ่ายและออมเงินทันที";
      if (survivalScore >= 100) verdict = "ยอดเยี่ยม - คุณมีเกราะป้องกันที่แข็งแกร่ง พร้อมรับมือกับวิกฤตเศรษฐกิจ";
      else if (survivalScore >= 50) verdict = "ปานกลาง - คุณสามารถอยู่รอดได้ระยะหนึ่ง แต่ควรเพิ่มเงินสำรองให้ถึงเป้าหมาย";

      setResult({
        currentMonthlyExpense: Math.round(totalMonthlyExpense),
        monthsOfSurvival: Math.round(monthsOfSurvival * 10) / 10,
        recommendedSavings: Math.round(recommendedSavings),
        shortfall: Math.round(shortfall),
        survivalScore: Math.round(survivalScore),
        verdict,
      });
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการคำนวณ");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    calculateEmergency();
  }, [expenses, currentSavings, unemploymentMonths]);

  return (
    <div className="tool-screen active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-nav" style={{ marginBottom: 0 }}>
          <button className={`page-btn ${page === 0 ? "active" : ""}`} onClick={() => setPage(0)}>
            <span className="num">1</span>Safety Net
          </button>
          <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>
            <span className="num">2</span>Stress Test
          </button>
          <button className={`page-btn ${page === 2 ? "active" : ""}`} onClick={() => setPage(2)}>
            <span className="num">3</span>Survival Score
          </button>
          <button className={`page-btn ${page === 3 ? "active" : ""}`} onClick={() => setPage(3)}>
            <span className="num">4</span>Portfolio
          </button>
        </div>
        
        {page === 0 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => setPage(1)}>ต่อไป: Stress Test →</button>
          </div>
        )}
        {page === 1 && (
          <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(0)}>← กลับ</button>
            <button className="btn btn-primary" onClick={() => setPage(2)}>ดูคะแนนเอาตัวรอด →</button>
          </div>
        )}
        {page === 2 && (
          <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(1)}>← กลับ</button>
            <button className="btn btn-primary" onClick={() => setPage(3)}>จัดพอร์ตเพิ่มผลตอบแทน →</button>
          </div>
        )}
        {page === 3 && (
          <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setPage(2)}>← กลับ</button>
          </div>
        )}
      </div>

      {page === 0 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Emergency <span>Safety Net</span></div>
            <div className="tool-sub">ประเมินภาระค่าใช้จ่ายต่อเดือน และเงินสำรองฉุกเฉินปัจจุบันของคุณ</div>
          </div>
          <div className="grid2">
            <div className="card">
              <div className="card-title">💸 ค่าใช้จ่ายประจำเดือน</div>
              <div className="form-group">
                <label className="form-label">ค่าอาหาร & ของใช้</label>
                <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" value={expenses.food} onChange={(e) => setExpenses({ ...expenses, food: Number(e.target.value) })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">ค่าที่พัก / ผ่อนบ้าน</label>
                <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" value={expenses.rent} onChange={(e) => setExpenses({ ...expenses, rent: Number(e.target.value) })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">ค่าเดินทาง / ผ่อนรถ</label>
                <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" value={expenses.transport} onChange={(e) => setExpenses({ ...expenses, transport: Number(e.target.value) })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">ภาระหนี้สินอื่นๆ (บัตรเครดิต, สินเชื่อ)</label>
                <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" value={expenses.debt} onChange={(e) => setExpenses({ ...expenses, debt: Number(e.target.value) })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">ค่าใช้จ่ายอื่นๆ</label>
                <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" value={expenses.other} onChange={(e) => setExpenses({ ...expenses, other: Number(e.target.value) })} /></div>
              </div>
            </div>
            
            <div>
              <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-title">💰 เงินสำรองที่มีในปัจจุบัน (สภาพคล่องสูง)</div>
                <div className="form-group mb-0">
                  <div className="form-input-prefix"><span>฿</span><input type="number" className="form-input" style={{ fontSize: '20px', padding: '16px 14px 16px 40px' }} value={currentSavings} onChange={(e) => setCurrentSavings(Number(e.target.value))} /></div>
                </div>
              </div>
              <div className="card">
                <div className="card-title">สรุปเบื้องต้น</div>
                <div className="stat-row"><span className="stat-label">รวมค่าใช้จ่าย</span><span className="stat-val red">฿{totalMonthlyExpense.toLocaleString()}/เดือน</span></div>
                <div className="stat-row"><span className="stat-label">เงินสำรองที่มี</span><span className="stat-val green">฿{currentSavings.toLocaleString()}</span></div>
                <div className="stat-row"><span className="stat-label">อยู่รอดได้ (โดยไม่มีรายได้)</span><span className="stat-val">{result?.monthsOfSurvival || 0} เดือน</span></div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <button className="btn btn-primary btn-full" onClick={() => setPage(1)}>ต่อไป: กำหนดเป้าหมาย Stress Test →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 1 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Job Loss <span>Stress Test</span></div>
            <div className="tool-sub">จำลองสถานการณ์เลวร้ายที่สุด: หากคุณตกงาน จะต้องใช้เวลาหางานใหม่นานแค่ไหน?</div>
          </div>

          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card-title text-center">ปรับระดับความรุนแรงของวิกฤต</div>
            <div className="slider-wrap" style={{ marginTop: '30px', marginBottom: '40px' }}>
              <input type="range" className="slider" min="1" max="12" step="1" value={unemploymentMonths} onChange={(e) => setUnemploymentMonths(Number(e.target.value))} />
              <div className="slider-labels">
                <span>1 เดือน</span>
                <span>6 เดือน</span>
                <span>12 เดือน</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>เป้าหมายเงินสำรองที่แนะนำสำหรับ <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{unemploymentMonths} เดือน</span>:</div>
              <div style={{ fontSize: '36px', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--cyan)', marginTop: '8px' }}>
                ฿{result?.recommendedSavings.toLocaleString()}
              </div>
            </div>
            <div style={{ marginTop: '32px' }}>
              <button className="btn btn-primary btn-full" onClick={() => setPage(2)}>ประมวลผล Survival Score →</button>
            </div>
          </div>
        </div>
      )}

      {page === 2 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Your <span>Survival Score</span></div>
            <div className="tool-sub">สรุปความพร้อมรับมือวิกฤตทางการเงินของคุณ</div>
          </div>

          <div className="grid2">
            <div className="card survival-score">
              <div className="card-title">คะแนนความอยู่รอด</div>
              <div className="score-num" style={{ color: result?.survivalScore && result.survivalScore >= 100 ? 'var(--green)' : result?.survivalScore && result.survivalScore >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                {result?.survivalScore}%
              </div>
              <div className="score-label">จากเป้าหมาย {unemploymentMonths} เดือน</div>
              <div className={`verdict ${result?.survivalScore && result.survivalScore >= 100 ? 'good' : result?.survivalScore && result.survivalScore >= 50 ? 'warn' : 'bad'}`} style={{ textAlign: 'left' }}>
                <div className="verdict-title">AI Verdict</div>
                <div className="verdict-text">{result?.verdict}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Gap Analysis</div>
              <div className="stat-row"><span className="stat-label">เป้าหมายเงินสำรอง</span><span className="stat-val">฿{result?.recommendedSavings.toLocaleString()}</span></div>
              <div className="stat-row"><span className="stat-label">เงินสำรองที่มีอยู่</span><span className="stat-val green">฿{currentSavings.toLocaleString()}</span></div>
              <div className="divider"></div>
              <div className="stat-row">
                <span className="stat-label">ส่วนที่ขาด (Shortfall)</span>
                <span className="stat-val red">฿{result?.shortfall.toLocaleString()}</span>
              </div>
              
              <div className="console" style={{ marginTop: '24px', height: '140px' }}>
                <div className="console-line cl-info">{'>'} วิเคราะห์แผนการเติมเต็มเงินสำรอง...</div>
                {result && result.shortfall > 0 ? (
                  <>
                    <div className="console-line cl-warn">{'>'} ตรวจพบ Shortfall: ฿{result.shortfall.toLocaleString()}</div>
                    <div className="console-line cl-dim">{'>'} หากออมเพิ่มเดือนละ ฿5,000 จะใช้เวลา {Math.ceil(result.shortfall / 5000)} เดือน</div>
                    <div className="console-line cl-dim">{'>'} หากออมเพิ่มเดือนละ ฿10,000 จะใช้เวลา {Math.ceil(result.shortfall / 10000)} เดือน</div>
                  </>
                ) : (
                  <div className="console-line cl-ok">{'>'} ยินดีด้วย! คุณบรรลุเป้าหมายเงินสำรองฉุกเฉินแล้ว</div>
                )}
              </div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn btn-primary btn-full" onClick={() => setPage(3)}>จัดการพอร์ตสภาพคล่อง →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 3 && (
        <div className="tool-page active">
          <div className="tool-header">
            <div className="tool-title">Liquidity <span>Portfolio</span></div>
            <div className="tool-sub">เพิ่มผลตอบแทนให้เงินสำรองฉุกเฉิน โดยยังคงรักษาสภาพคล่องไว้</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '24px' }}>🚧</span>
            <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>กำลังเชื่อมต่อ API จัดพอร์ตเงินฝาก/ตลาดเงิน...</div>
          </div>
        </div>
      )}
    </div>
  );
}
