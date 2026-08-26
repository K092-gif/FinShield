"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { calculateTax, calculateDividendTax } from "@/lib/taxCalculator";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────
interface TaxHistoryRecord {
  id: number;
  taxYear: number;
  annualIncome: number;
  totalDeductions: number;
  netIncome: number;
  taxWithoutDeductions: number;
  taxWithDeductions: number;
  taxSaved: number;
  marginalRate: number;
  deductions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Deduction field labels for displaying history details
const DEDUCTION_LABELS: Record<string, string> = {
  socialSecurity: 'ประกันสังคม',
  lifeInsurance: 'ประกันชีวิตทั่วไป',
  healthInsurance: 'ประกันสุขภาพ',
  parentsHealthInsurance: 'ประกันสุขภาพพ่อแม่',
  pensionInsurance: 'ประกันบำนาญ',
  pvd: 'กองทุนสำรองเลี้ยงชีพ (PVD)',
  ssf: 'กองทุนรวมเพื่อการออม (SSF)',
  rmf: 'กองทุนเพื่อการเลี้ยงชีพ (RMF)',
  thaiesg: 'กองทุนรวม THAIESG',
  nsf: 'กองทุนการออมแห่งชาติ (กอช.)',
  ssfx: 'กองทุน SSFX',
  spouseNoIncome: 'คู่สมรสไม่มีรายได้',
  childBefore2561: 'บุตร (เกิดก่อนปี 2561)',
  childAfter2561: 'บุตร (เกิดตั้งแต่ปี 2561)',
  adoptedChild: 'บุตรบุญธรรม',
  parentCare: 'อุปการะพ่อแม่',
  pregnancyCare: 'ฝากครรภ์และคลอดบุตร',
  easyEReceipt: 'EASY E-RECEIPT',
  secondTierCity: 'เที่ยวเมืองรอง',
  socialEnterprise: 'วิสาหกิจเพื่อสังคม',
  homeLoanInterest: 'ดอกเบี้ยเงินกู้บ้าน',
  homeRepair: 'ซ่อมแซมบ้าน',
  generalDonation: 'บริจาคทั่วไป',
  educationDonation: 'บริจาคการศึกษา/รพ.',
  politicalDonation: 'พรรคการเมือง',
};

// ─── Strip markdown symbols from AI advice for human-readable display ───
function cleanTaxAdviceText(raw: string): string {
  return raw
    .replace(/```/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-–—]\s+/gm, '• ')
    .replace(/^\s*•\s*/gm, '• ')
    .replace(/[*_`~]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function TaxOptimizer() {
  const { user } = useAuth();

  // ─── Sub-tab state ──────────────────────────────────────────────────
  const [taxSubTab, setTaxSubTab] = useState<'deductions' | 'ai-analysis' | 'history'>('deductions');

  // ─── Year selector ──────────────────────────────────────────────────
  const currentBEYear = new Date().getFullYear() + 543;
  const [selectedTaxYear, setSelectedTaxYear] = useState(currentBEYear);
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentBEYear - i);

  // ─── Tax deduction form state ──────────────────────────────────────
  const [annualIncome, setAnnualIncome] = useState<number | ''>('');
  const [annualDividendInput, setAnnualDividendInput] = useState<number | ''>('');
  const [corporateTaxRate, setCorporateTaxRate] = useState<number>(0.20);
  const [customTaxCreditInput, setCustomTaxCreditInput] = useState<number | ''>('');
  const [taxAdvice, setTaxAdvice] = useState<string>('');
  const [isTaxAdviceLoading, setIsTaxAdviceLoading] = useState(false);
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

  // ─── Track if form has unsaved changes ─────────────────────────────
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const currentSnapshot = useMemo(() => JSON.stringify({ annualIncome, taxDeductions, selectedTaxYear }), [annualIncome, taxDeductions, selectedTaxYear]);
  const hasUnsavedChanges = lastSavedSnapshot !== null && lastSavedSnapshot !== currentSnapshot;

  // ─── Accordion state ──────────────────────────────────────────────
  const [taxAccordions, setTaxAccordions] = useState({
    insurance: true,
    investment: true,
    family: true,
    stimulus: true,
    housing: true,
    donation: true
  });

  // ─── History state ────────────────────────────────────────────────
  const [taxHistories, setTaxHistories] = useState<TaxHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Unsaved changes warning banner ──────────────────────────────
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const unsavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show warning when there are unsaved changes (debounced)
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (unsavedTimerRef.current) clearTimeout(unsavedTimerRef.current);
      unsavedTimerRef.current = setTimeout(() => setShowUnsavedWarning(true), 2000);
    } else {
      setShowUnsavedWarning(false);
      if (unsavedTimerRef.current) clearTimeout(unsavedTimerRef.current);
    }
    return () => { if (unsavedTimerRef.current) clearTimeout(unsavedTimerRef.current); };
  }, [hasUnsavedChanges]);

  const toggleAccordion = (section: keyof typeof taxAccordions) => {
    setTaxAccordions({ ...taxAccordions, [section]: !taxAccordions[section] });
  };

  const renderTaxInput = (
    label: string, 
    field: keyof typeof taxDeductions, 
    unit: string = '฿',
    hint?: string,
    placeholder?: string
  ) => (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-xs md:text-sm font-semibold text-[var(--text-main)]">{label}</label>
        {hint && <span className="text-[11px] text-[var(--text-muted)] font-medium">{hint}</span>}
      </div>
      <div className="relative">
        {unit === '฿' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">฿</span>}
        <input
          type="number"
          placeholder={placeholder || "0"}
          className={`w-full bg-[var(--bg-input)] dark:bg-gray-800/60 border border-[var(--border)] rounded-xl py-2 ${unit === '฿' ? 'pl-8 pr-3' : 'px-3'} text-sm font-semibold focus:ring-2 focus:ring-[#1e1c10] focus:border-[#1e1c10] transition-all outline-none`}
          value={taxDeductions[field] as string}
          onChange={(e) => setTaxDeductions({ ...taxDeductions, [field]: e.target.value })}
        />
        {unit !== '฿' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">{unit}</span>}
      </div>
    </div>
  );

  // ─── Tax Calculation ─────────────────────────────────────────────
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
    const annualDiv = typeof annualDividendInput === 'number' ? annualDividendInput : 0;
    const customCredit = typeof customTaxCreditInput === 'number' && customTaxCreditInput > 0 ? customTaxCreditInput : undefined;
    return calculateDividendTax(annualDiv, taxResult.marginalRate, corporateTaxRate, customCredit);
  }, [annualDividendInput, taxResult.marginalRate, corporateTaxRate, customTaxCreditInput]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ─── API helpers ──────────────────────────────────────────────────
  const getAuthHeader = useCallback(async () => {
    if (!user) return null;
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const analyzeTaxWithAI = useCallback(async () => {
    setIsTaxAdviceLoading(true);
    try {
      const annualDiv = typeof annualDividendInput === 'number' ? annualDividendInput : 0;
      const payload = {
        taxYear: selectedTaxYear,
        annualIncome: taxResult.grossIncome,
        netIncome: taxResult.netIncome,
        expenseDeduction: taxResult.expenseDeduction,
        personalDeduction: taxResult.personalDeduction,
        otherDeductions: taxResult.otherDeductions,
        totalDeductions: taxResult.otherDeductions + taxResult.personalDeduction + taxResult.expenseDeduction,
        taxBeforeDeductions: taxResult.taxWithoutDeductions,
        taxAfterDeductions: taxResult.taxWithDeductions,
        taxSaved: taxResult.taxSaved,
        marginalRatePercent: Number((taxResult.marginalRate * 100).toFixed(0)),
        deductionBreakdown: taxResult.deductionDetails,
        dividendData: {
          annualDividend: annualDiv,
          withholdingTax10: dividendResult.withholdingTax,
          corporateTaxRatePercent: Number((corporateTaxRate * 100).toFixed(0)),
          dividendTaxCredit: dividendResult.taxCredit,
          grossedDividend: dividendResult.grossedDividend,
          dividendTaxPayableAtPersonalRate: dividendResult.dividendTaxPayable,
          netRefundAmount: dividendResult.refundAmount,
          additionalTaxPayable: dividendResult.additionalTaxPayable,
          shouldClaimRefund: dividendResult.shouldClaimRefund,
        },
        deductionsRaw: taxDeductions,
      };
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tax_advice',
          context: payload,
          messages: [{
            role: 'user',
            content: `วิเคราะห์แผนภาษีบุคคลธรรมดาและเครดิตภาษีเงินปันผล (ม.47 ทวิ) จากข้อมูลจริงของผู้ใช้นี้: ${JSON.stringify(payload)}. ให้คำแนะนำเชิงลึกว่าควรยื่นรวมเงินปันผลหรือเลือกหัก ณ ที่จ่าย 10% (Final Tax) พร้อมอธิบายตัวเลขผลประโยชน์สุทธิที่ผู้ใช้จะได้รับ และชี้ช่องทางลดหย่อนภาษีที่ยังเหลืออยู่`,
          }],
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.reply) throw new Error(data.error || 'AI analysis failed');
      const cleaned = cleanTaxAdviceText(data.reply);
      setTaxAdvice(cleaned);
      localStorage.setItem(`finshield-tax-ai-advice-${user?.uid || 'guest'}`, cleaned);
    } catch (error) {
      console.error('Tax AI analysis failed:', error);
      setTaxAdvice('ยังวิเคราะห์ด้วย AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsTaxAdviceLoading(false);
    }
  }, [user, annualDividendInput, corporateTaxRate, selectedTaxYear, taxDeductions, taxResult, dividendResult]);


  const loadTaxHistories = useCallback(async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tax-history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTaxHistories(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load tax histories:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [getAuthHeader]);

  const saveTaxHistory = useCallback(async () => {
    const headers = await getAuthHeader();
    if (!headers) {
      setSaveMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบก่อนบันทึก' });
      return;
    }
    if (!annualIncome || annualIncome === 0) {
      setSaveMessage({ type: 'error', text: 'กรุณาระบุรายได้ก่อนบันทึก' });
      return;
    }

    setSavingHistory(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/tax-history`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxYear: selectedTaxYear,
          annualIncome: typeof annualIncome === 'number' ? annualIncome : 0,
          totalDeductions: taxResult.expenseDeduction + taxResult.personalDeduction + taxResult.otherDeductions,
          netIncome: taxResult.netIncome,
          taxWithoutDeductions: taxResult.taxWithoutDeductions,
          taxWithDeductions: taxResult.taxWithDeductions,
          taxSaved: taxResult.taxSaved,
          marginalRate: taxResult.marginalRate,
          deductions: taxDeductions,
        }),
      });
      if (res.ok) {
        setSaveMessage({ type: 'success', text: `บันทึกประวัติปี พ.ศ. ${selectedTaxYear} สำเร็จ` });
        setLastSavedSnapshot(currentSnapshot);
        setShowUnsavedWarning(false);
        await loadTaxHistories();
      } else {
        const errData = await res.json().catch(() => ({}));
        setSaveMessage({ type: 'error', text: errData.error || 'เกิดข้อผิดพลาดในการบันทึก' });
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setSavingHistory(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [getAuthHeader, annualIncome, selectedTaxYear, taxResult, taxDeductions, currentSnapshot, loadTaxHistories]);

  const deleteTaxHistoryYear = useCallback(async (year: number) => {
    if (!confirm(`ต้องการลบประวัติภาษีปี พ.ศ. ${year} ใช่ไหม?`)) return;
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tax-history/${year}`, { method: 'DELETE', headers });
      if (res.ok) {
        await loadTaxHistories();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [getAuthHeader, loadTaxHistories]);

  // Load existing data into form for editing
  const loadHistoryForEdit = useCallback((record: TaxHistoryRecord) => {
    setSelectedTaxYear(record.taxYear);
    setAnnualIncome(record.annualIncome);
    const d = record.deductions || {};
    setTaxDeductions({
      socialSecurity: d.socialSecurity ?? '',
      lifeInsurance: d.lifeInsurance ?? '',
      healthInsurance: d.healthInsurance ?? '',
      parentsHealthInsurance: d.parentsHealthInsurance ?? '',
      pensionInsurance: d.pensionInsurance ?? '',
      pvd: d.pvd ?? '',
      ssf: d.ssf ?? '',
      rmf: d.rmf ?? '',
      thaiesg: d.thaiesg ?? '',
      nsf: d.nsf ?? '',
      ssfx: d.ssfx ?? '',
      spouseNoIncome: d.spouseNoIncome ?? false,
      childBefore2561: d.childBefore2561 ?? '',
      childAfter2561: d.childAfter2561 ?? '',
      adoptedChild: d.adoptedChild ?? '',
      parentCare: d.parentCare ?? '',
      pregnancyCare: d.pregnancyCare ?? '',
      easyEReceipt: d.easyEReceipt ?? '',
      secondTierCity: d.secondTierCity ?? '',
      socialEnterprise: d.socialEnterprise ?? '',
      homeLoanInterest: d.homeLoanInterest ?? '',
      homeRepair: d.homeRepair ?? '',
      generalDonation: d.generalDonation ?? '',
      educationDonation: d.educationDonation ?? '',
      politicalDonation: d.politicalDonation ?? '',
    });
    // Set snapshot to mark as "saved" initially
    const snap = JSON.stringify({ annualIncome: record.annualIncome, taxDeductions: d, selectedTaxYear: record.taxYear });
    setLastSavedSnapshot(snap);
    // Switch to deductions tab
    setTaxSubTab('deductions');
  }, []);

  // Restore cached AI tax advice so results survive page navigation
  useEffect(() => {
    const saved = localStorage.getItem(`finshield-tax-ai-advice-${user?.uid || 'guest'}`);
    if (saved) setTaxAdvice(cleanTaxAdviceText(saved));
  }, [user]);

  // Load histories on mount
  useEffect(() => {
    if (user) {
      loadTaxHistories();
    }
  }, [user, loadTaxHistories]);

  // ─── Chart Data (last 5 years) ─────────────────────────────────────
  const chartData = useMemo(() => {
    const sorted = [...taxHistories].sort((a, b) => a.taxYear - b.taxYear).slice(-5);
    return sorted.map(h => ({
      year: `${h.taxYear}`,
      taxPaid: Math.round(h.taxWithDeductions),
      taxSaved: Math.round(h.taxSaved),
      income: Math.round(h.annualIncome),
    }));
  }, [taxHistories]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-[var(--border)] rounded-xl p-3 shadow-lg text-xs">
        <div className="font-bold text-[var(--text-main)] mb-2">พ.ศ. {label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[var(--text-muted)]">{p.name}:</span>
            <span className="font-mono font-bold text-[var(--text-main)]">฿{Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render AI advice as structured paragraphs / bullet lists for natural reading
  const renderTaxAdvice = (text: string) => {
    return text.split(/\n{2,}/).map((block, bi) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every(l => l.startsWith('•'));
      if (isList) {
        return (
          <ul key={bi} className="space-y-2">
            {lines.map((l, li) => (
              <li key={li} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-[9px] shrink-0"></span>
                <span className="flex-1">{l.replace(/^•\s*/, '')}</span>
              </li>
            ))}
          </ul>
        );
      }
      return <p key={bi} className="whitespace-pre-line">{block.trim()}</p>;
    });
  };

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight m-0 pb-1 flex items-center gap-2">
            Tax <span className="font-medium text-[#747878] dark:text-gray-400">Optimizer</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] m-0">
            วางแผนลดหย่อนภาษี และคำนวณเครดิตภาษีเงินปันผลอัตโนมัติ
          </p>
        </div>
        <div className="flex w-full sm:w-auto bg-[#f4eedb] dark:bg-gray-800 p-1.5 rounded-full border border-[#e0dac7] dark:border-gray-700">
          <button
            onClick={() => setTaxSubTab('deductions')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'deductions'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] bg-transparent'
            }`}
          >
            ลดหย่อนภาษี
          </button>
          <button
            onClick={() => setTaxSubTab('ai-analysis')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'ai-analysis'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] bg-transparent'
            }`}
          >
            วิเคราะห์ด้วย AI
          </button>
          <button
            onClick={() => setTaxSubTab('history')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'history'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] bg-transparent'
            }`}
          >
            ประวัติ & แนวโน้ม
          </button>
        </div>
      </div>

      {/* ═══════════════ TAB 1: DEDUCTIONS (Original) ═══════════════ */}
      {taxSubTab === 'deductions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Inputs (70%) */}
          <div className="lg:col-span-8 space-y-8 p-2 md:p-4">
            
            {/* Section: Income + Year selector + Save */}
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 text-lg font-bold text-[var(--text-main)] mb-4">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-sub)] text-[var(--accent-blue)] flex items-center justify-center">
                  <i className="fi fi-sr-money-bill-wave text-sm"></i>
                </div>
                ข้อมูลรายได้ต่อปี
              </div>
              <div className="max-w-md">
                <label className="block text-sm font-semibold text-[var(--text-main)] mb-1.5">รายได้รวมทั้งปี (เงินเดือน โบนัส ฯลฯ)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">฿</span>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-sub)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 text-base font-bold focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] transition-all outline-none"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="เช่น 1200000"
                  />
                </div>
              </div>

              {/* Year selector + Save button row */}
              <div className="flex flex-wrap items-end gap-3 mt-5">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">ปีภาษี (พ.ศ.)</label>
                  <select
                    className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg py-2.5 px-3 text-sm font-bold focus:ring-2 focus:ring-[var(--accent-blue)] outline-none min-w-[120px]"
                    value={selectedTaxYear}
                    onChange={(e) => setSelectedTaxYear(Number(e.target.value))}
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>พ.ศ. {y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveTaxHistory}
                  disabled={savingHistory || !user}
                  className="px-5 py-2.5 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:bg-gray-400 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-[var(--shadow-card)] disabled:cursor-not-allowed"
                >
                  {savingHistory ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}
                </button>
              </div>

              {/* Save message */}
              {saveMessage && (
                <div className={`mt-3 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-300 ${
                  saveMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                  <i className={`fi ${saveMessage.type === 'success' ? 'fi-sr-check-circle' : 'fi-sr-exclamation'} mr-1.5`} />
                  {saveMessage.text}
                </div>
              )}

              {/* Unsaved changes warning */}
              {showUnsavedWarning && (
                <div className="mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-2 animate-pulse">
                  <i className="fi fi-sr-triangle-warning" />
                  คุณมีข้อมูลที่ยังไม่ได้บันทึก กรุณากดปุ่ม "บันทึกประวัติ" เพื่อบันทึกการเปลี่ยนแปลง
                </div>
              )}
            </section>

            <hr className="border-[var(--border)]" />

            {/* Section: Deductions Overview */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-lg font-bold text-[var(--text-main)]">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-sub)] text-[var(--accent-blue)] flex items-center justify-center">
                    <i className="fi fi-sr-shield-plus text-sm"></i>
                  </div>
                  รายการลดหย่อนภาษี (Income Tax Deductions)
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--bg-sub)] text-[var(--accent-blue)] border border-[var(--border)]">
                  รวมลดหย่อนเพิ่มเติม: ฿{fmt(taxResult.otherDeductions)}
                </span>
              </div>

              <div className="space-y-5">
                {/* Card Group 1: Insurance */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-md)]">
                  <div 
                    onClick={() => toggleAccordion('insurance')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-sub)] text-[var(--accent-blue)] flex items-center justify-center">
                        <i className="fi fi-sr-shield-check text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">กลุ่มประกันสังคมและประกันชีวิต</div>
                        <div className="text-xs text-[var(--text-muted)]">ประกันสังคม ประกันสุขภาพ ประกันชีวิต และประกันบำนาญ</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.insurance > 0 && (
                        <span className="text-xs font-bold text-[var(--accent-blue)] bg-[var(--bg-sub)] px-2.5 py-1 rounded-full border border-[#dbeafe] dark:border-blue-900">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.insurance)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.insurance ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.insurance && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--border)]">
                      {renderTaxInput('ประกันสังคม', 'socialSecurity', '฿', 'สูงสุด 9,000 บาท')}
                      {renderTaxInput('ประกันชีวิตทั่วไป', 'lifeInsurance', '฿', 'รวมสุขภาพสูงสุด 1 แสน')}
                      {renderTaxInput('ประกันสุขภาพตนเอง', 'healthInsurance', '฿', 'สูงสุด 25,000 บาท')}
                      {renderTaxInput('ประกันสุขภาพพ่อแม่', 'parentsHealthInsurance', '฿', 'สูงสุด 15,000 บาท')}
                      {renderTaxInput('ประกันบำนาญ', 'pensionInsurance', '฿', 'สูงสุด 15% ไม่เกิน 2 แสน')}
                    </div>
                  )}
                </div>

                {/* Card Group 2: Investment */}
                <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white/80 dark:bg-gray-900/40 p-5 md:p-6 shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-800">
                  <div 
                    onClick={() => toggleAccordion('investment')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                        <i className="fi fi-sr-chart-line-up text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">กลุ่มการออมและการลงทุนเพื่อการเกษียณ</div>
                        <div className="text-xs text-[var(--text-muted)]">PVD, SSF, RMF, ThaiESG, กอช. และวิสาหกิจเพื่อสังคม</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.investment > 0 && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.investment)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.investment ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.investment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--border)]">
                      {renderTaxInput('กองทุนสำรองเลี้ยงชีพ (PVD/กบข.)', 'pvd', '฿', 'สูงสุด 15% (cap รวม 5 แสน)')}
                      {renderTaxInput('กองทุนรวมเพื่อการออม (SSF)', 'ssf', '฿', 'สูงสุด 30% (cap 2 แสน)')}
                      {renderTaxInput('กองทุนเพื่อการเลี้ยงชีพ (RMF)', 'rmf', '฿', 'สูงสุด 30% (cap รวม 5 แสน)')}
                      {renderTaxInput('กองทุนรวม ThaiESG', 'thaiesg', '฿', 'วงเงินแยกพิเศษ สูงสุด 3 แสน')}
                      {renderTaxInput('กองทุนการออมแห่งชาติ (กอช.)', 'nsf', '฿', 'สูงสุด 30,000 บาท')}
                      {renderTaxInput('กองทุน SSFX', 'ssfx', '฿', 'สูงสุด 200,000 บาท')}
                      {renderTaxInput('วิสาหกิจเพื่อสังคม', 'socialEnterprise', '฿', 'สูงสุด 100,000 บาท')}
                    </div>
                  )}
                </div>

                {/* Card Group 3: Family */}
                <div className="rounded-2xl border border-pink-200/80 dark:border-pink-900/60 bg-white/80 dark:bg-gray-900/40 p-5 md:p-6 shadow-sm transition-all hover:border-pink-300 dark:hover:border-pink-800">
                  <div 
                    onClick={() => toggleAccordion('family')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-600 flex items-center justify-center">
                        <i className="fi fi-sr-users text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">กลุ่มครอบครัวและการดูแล</div>
                        <div className="text-xs text-[var(--text-muted)]">คู่สมรส บุตร บิดามารดา และค่าฝากครรภ์คลอดบุตร</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.family > 0 && (
                        <span className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-800">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.family)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.family ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.family && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mt-5 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center h-[42px] px-3.5 border border-[var(--border)] rounded-xl bg-gray-50 dark:bg-gray-900/60">
                        <label className="flex items-center gap-3 text-sm font-semibold text-[var(--text-main)] cursor-pointer w-full">
                          <input 
                            type="checkbox" 
                            checked={taxDeductions.spouseNoIncome} 
                            onChange={(e) => setTaxDeductions({...taxDeductions, spouseNoIncome: e.target.checked})}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          /> 
                          คู่สมรสไม่มีรายได้ (60,000 บาท)
                        </label>
                      </div>
                      {renderTaxInput('บุตร (เกิดก่อนปี 2561)', 'childBefore2561', 'คน', 'คนละ 30,000 บาท')}
                      {renderTaxInput('บุตร (เกิดตั้งแต่ปี 2561)', 'childAfter2561', 'คน', 'คนละ 60,000 บาท')}
                      {renderTaxInput('บุตรบุญธรรม', 'adoptedChild', 'คน', 'คนละ 30,000 บ. (max 3)')}
                      {renderTaxInput('อุปการะพ่อแม่', 'parentCare', 'คน', 'คนละ 30,000 บาท')}
                      {renderTaxInput('ฝากครรภ์และคลอดบุตร', 'pregnancyCare', '฿', 'ตามจริง สูงสุด 60,000 บาท')}
                    </div>
                  )}
                </div>

                {/* Card Group 4: Stimulus */}
                <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-white/80 dark:bg-gray-900/40 p-5 md:p-6 shadow-sm transition-all hover:border-amber-300 dark:hover:border-amber-800">
                  <div 
                    onClick={() => toggleAccordion('stimulus')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                        <i className="fi fi-sr-shop text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">มาตรการรัฐและกระตุ้นเศรษฐกิจ</div>
                        <div className="text-xs text-[var(--text-muted)]">Easy E-Receipt และท่องเที่ยวเมืองรอง</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.stimulus > 0 && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.stimulus)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.stimulus ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.stimulus && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--border)]">
                      {renderTaxInput('EASY E-RECEIPT 2567', 'easyEReceipt', '฿', 'ตามจริง สูงสุด 50,000 บาท')}
                      {renderTaxInput('เที่ยวเมืองรอง 2567', 'secondTierCity', '฿', 'ตามจริง สูงสุด 15,000 บาท')}
                    </div>
                  )}
                </div>

                {/* Card Group 5: Housing */}
                <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/60 bg-white/80 dark:bg-gray-900/40 p-5 md:p-6 shadow-sm transition-all hover:border-orange-300 dark:hover:border-orange-800">
                  <div 
                    onClick={() => toggleAccordion('housing')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center">
                        <i className="fi fi-sr-home text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">กลุ่มที่อยู่อาศัย</div>
                        <div className="text-xs text-[var(--text-muted)]">ดอกเบี้ยเงินกู้ยืมเพื่อซื้อที่อยู่อาศัยและค่าซ่อมแซม</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.housing > 0 && (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.housing)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.housing ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.housing && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--border)]">
                      {renderTaxInput('ดอกเบี้ยเงินกู้บ้าน', 'homeLoanInterest', '฿', 'ตามจริง สูงสุด 100,000 บาท')}
                      {renderTaxInput('ซ่อมแซมบ้าน (มาตรการรัฐ)', 'homeRepair', '฿', 'ตามจริง สูงสุด 100,000 บาท')}
                    </div>
                  )}
                </div>

                {/* Card Group 6: Donation */}
                <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-white/80 dark:bg-gray-900/40 p-5 md:p-6 shadow-sm transition-all hover:border-rose-300 dark:hover:border-rose-800">
                  <div 
                    onClick={() => toggleAccordion('donation')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
                        <i className="fi fi-sr-heart text-sm"></i>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)] text-base">กลุ่มเงินบริจาค</div>
                        <div className="text-xs text-[var(--text-muted)]">การศึกษา โรงพยาบาล บริจาคทั่วไป และพรรคการเมือง</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {taxResult.deductionDetails.donation > 0 && (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                          ลดหย่อนได้ ฿{fmt(taxResult.deductionDetails.donation)}
                        </span>
                      )}
                      <i className={`fi ${taxAccordions.donation ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm`}></i>
                    </div>
                  </div>
                  {taxAccordions.donation && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-[var(--border)]">
                      {renderTaxInput('บริจาคการศึกษา/รพ. (2 เท่า)', 'educationDonation', '฿', 'ลดหย่อนได้ 2 เท่า (cap 10% รายได้)')}
                      {renderTaxInput('บริจาคทั่วไป (1 เท่า)', 'generalDonation', '฿', 'ลดหย่อนได้ 1 เท่า (cap 10% รายได้)')}
                      {renderTaxInput('พรรคการเมือง', 'politicalDonation', '฿', 'ตามจริง สูงสุด 10,000 บาท')}
                    </div>
                  )}
                </div>

              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Summary (30%) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            
            {/* Income Tax Summary */}
            <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between font-bold text-[var(--text-main)]">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-clipboard-list text-blue-500"></i> สรุปภาษีเงินได้
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  ฐานภาษี {(taxResult.marginalRate * 100).toFixed(0)}%
                </span>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>รายได้รวมทั้งปี</span>
                  <span className="font-mono text-[var(--text-main)] font-bold">฿{fmt(taxResult.grossIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>- หักค่าใช้จ่าย (50% max 1แสน)</span>
                  <span className="font-mono">- ฿{fmt(taxResult.expenseDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>- หักลดหย่อนส่วนตัว</span>
                  <span className="font-mono">- ฿{fmt(taxResult.personalDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)] pb-3 border-b border-[var(--border)]">
                  <span>- หักลดหย่อนอื่นๆ เพิ่มเติม</span>
                  <span className="font-mono">- ฿{fmt(taxResult.otherDeductions)}</span>
                </div>
                
                <div className="flex justify-between items-center font-bold text-[var(--text-main)] pt-2">
                  <span>เงินได้สุทธิเพื่อคิดภาษีขั้นบันได</span>
                  <span className="font-mono text-[16px]">฿{fmt(taxResult.netIncome)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[var(--text-muted)] mt-3">
                  <span>ภาษีจ่าย (ไม่มีลดหย่อนเพิ่ม)</span>
                  <span className="font-mono">฿{fmt(taxResult.taxWithoutDeductions)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-[var(--text-main)]">
                  <span>ภาษีที่ต้องชำระ (หลังลดหย่อน)</span>
                  <span className="font-mono text-[15px]">฿{fmt(taxResult.taxWithDeductions)}</span>
                </div>
                
                <div className="mt-5 bg-[var(--bg-sub)] rounded-xl p-4 border border-[var(--border)]/50">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">ประหยัดภาษีไปได้ทั้งหมด!</div>
                  <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400">฿{fmt(taxResult.taxSaved)}</div>
                </div>
              </div>
            </div>

            {/* Dividend Tax Summary (ม.47 ทวิ) */}
            <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between font-bold text-[var(--text-main)]">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-chart-pie text-emerald-500"></i> ขอคืนภาษีเงินปันผล (ม.47 ทวิ)
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">มาตรา 47 ทวิ</span>
              </div>
              <div className="p-5 space-y-4 text-sm">
                
                {/* Dividend Input */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5">เงินปันผลรับรวมทั้งปี (ก่อนหักภาษี 10%)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">฿</span>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-gray-800 border border-[var(--border)] rounded-xl py-2.5 pl-8 pr-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={annualDividendInput}
                      onChange={(e) => setAnnualDividendInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="เช่น 50000"
                    />
                  </div>
                </div>

                {/* Corporate Tax Rate Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-[var(--text-main)]">อัตราภาษีนิติบุคคลของหุ้น</label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {(corporateTaxRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={corporateTaxRate}
                    onChange={(e) => setCorporateTaxRate(Number(e.target.value))}
                  >
                    <option value={0.20}>20% (มาตรฐานบริษัทจดทะเบียนในตลาด SET ทั่วไป)</option>
                    <option value={0.25}>25% (บริษัทอัตราพิเศษ 25%)</option>
                    <option value={0.30}>30% (บริษัทอัตราเดิม 30%)</option>
                    <option value={0.00}>0% (BOI / ยกเว้นภาษีนิติบุคคล / หุ้นต่างประเทศ)</option>
                  </select>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1.5 flex items-center justify-between">
                    <span>ฐานภาษีบุคคลธรรมดาของคุณ:</span>
                    <strong className="text-[var(--text-main)] font-mono">{(taxResult.marginalRate * 100).toFixed(0)}%</strong>
                  </div>
                </div>

                {/* Real Detailed Calculations */}
                <div className="space-y-2 pt-3 border-t border-[var(--border)] text-xs md:text-sm">
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>ภาษีหัก ณ ที่จ่าย (10%)</span>
                    <span className="font-mono text-[var(--text-main)]">฿{fmt(dividendResult.withholdingTax)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>เครดิตภาษีเงินปันผล ({(corporateTaxRate * 100).toFixed(0)}%)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(dividendResult.taxCredit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>เงินปันผลรวมเครดิตภาษี</span>
                    <span className="font-mono text-[var(--text-main)]">฿{fmt(dividendResult.grossedDividend)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold text-[var(--text-main)] pt-1 border-t border-dashed border-[var(--border)]">
                    <span>ภาษีที่ต้องเสียจริงสำหรับเงินปันผล</span>
                    <span className="font-mono">฿{fmt(dividendResult.dividendTaxPayable)}</span>
                  </div>
                </div>

                {/* Net Result Box */}
                {dividendResult.shouldClaimRefund ? (
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-800">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <i className="fi fi-sr-coins text-emerald-600"></i> ขอคืนภาษีได้สุทธิ/ปี
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">เมื่อนำมายื่นรวมคำนวณปลายปี</div>
                    </div>
                    <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-xl">
                      +฿{fmt(dividendResult.refundAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3.5 border border-amber-200 dark:border-amber-800">
                    <div>
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <i className="fi fi-sr-exclamation text-amber-600"></i> เสียภาษีเพิ่มหากยื่นรวม
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">ควรเลือก Final Tax (หัก 10%)</div>
                    </div>
                    <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-xl">
                      -฿{fmt(dividendResult.additionalTaxPayable)}
                    </span>
                  </div>
                )}

                {/* Recommendation Strategy Banner */}
                {dividendResult.shouldClaimRefund ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5 mb-1.5">
                      <i className="fi fi-sr-check-circle"></i> กลยุทธ์ที่แนะนำ: ยื่นขอคืนภาษี
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-500 leading-relaxed">
                      ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) ต่ำกว่าจุดคุ้มค่า แนะนำให้นำเงินปันผล ฿{fmt(typeof annualDividendInput === 'number' ? annualDividendInput : 0)} มายื่นรวมคำนวณปลายปี เพื่อขอรับเครดิตภาษีคืนสุทธิ <strong>฿{fmt(dividendResult.refundAmount)}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3.5 rounded-xl border border-red-100 dark:border-red-900/50">
                    <div className="font-bold text-red-700 dark:text-red-400 text-xs flex items-center gap-1.5 mb-1.5">
                      <i className="fi fi-sr-exclamation"></i> กลยุทธ์ที่แนะนำ: หัก ณ ที่จ่าย 10% (Final Tax)
                    </div>
                    <div className="text-[11px] text-red-600 dark:text-red-500 leading-relaxed">
                      ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) สูงกว่า 28% หากนำเงินปันผลมายื่นรวมจะต้องเสียภาษีเพิ่ม ฿{fmt(dividendResult.additionalTaxPayable)} แนะนำให้เลือกหักภาษี ณ ที่จ่าย 10% (Final Tax) ไม่นำมารวมคำนวณ
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* AI Deep Analysis — shortcut to the AI sub-tab */}
            <div className="bg-[#dbeafe]/50 dark:bg-gray-900/60 rounded-2xl border border-[#93c5fd]/70 dark:border-blue-900/60 shadow-sm p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#dbeafe] text-[#2563eb] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center">
                <i className="fi fi-sr-sparkles"></i>
              </div>
              <div className="font-bold text-[var(--text-main)] text-sm">AI วิเคราะห์ภาษีเชิงลึก</div>
              <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                ให้ AI ตรวจสอบโควตาลดหย่อนที่ยังเหลือ และแนะนำกลยุทธ์เงินปันผลที่คุ้มค่าที่สุดจากข้อมูลจริงของคุณ
              </div>
              <button
                onClick={() => setTaxSubTab('ai-analysis')}
                className="w-full px-4 py-2.5 bg-[#1e1c10] hover:bg-black text-white text-xs font-bold rounded-full transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5"
              >
                <i className="fi fi-sr-sparkles" /> เริ่มการวิเคราะห์ด้วย AI
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: AI DEEP ANALYSIS ═══════════════ */}
      {taxSubTab === 'ai-analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: AI Analysis Card */}
          <div className="lg:col-span-8 p-2 md:p-4">
            <div className="rounded-2xl border border-[#93c5fd]/70 dark:border-blue-900/60 bg-[#dbeafe]/50 dark:bg-gray-900/60 shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="p-5 border-b border-[#dbeafe] dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-bold text-[var(--text-main)]">
                  <div className="w-8 h-8 rounded-xl bg-[#dbeafe] text-[#2563eb] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center">
                    <i className="fi fi-sr-sparkles text-sm"></i>
                  </div>
                  AI วิเคราะห์ภาษีเชิงลึก
                </div>
                <button
                  onClick={analyzeTaxWithAI}
                  disabled={isTaxAdviceLoading || !annualIncome}
                  className="px-3 py-1.5 bg-[#1e1c10] hover:bg-black disabled:bg-gray-300 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:shadow flex items-center gap-1.5 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isTaxAdviceLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังวิเคราะห์...
                    </>
                  ) : taxAdvice ? (
                    <>
                      <i className="fi fi-rr-refresh text-xs" />
                      วิเคราะห์ใหม่
                    </>
                  ) : (
                    <>
                      <i className="fi fi-sr-magic-wand text-xs" />
                      วิเคราะห์ด้วย AI
                    </>
                  )}
                </button>
              </div>

              {/* Card body */}
              <div className="p-5 md:p-6">
                {isTaxAdviceLoading ? (
                  <div className="space-y-4 py-10 text-center">
                    <div className="w-10 h-10 border-[3px] border-[#dbeafe] border-t-[#2563eb] rounded-full animate-spin mx-auto" />
                    <div className="text-sm font-semibold text-[#2563eb] dark:text-blue-300">
                      FinShield AI กำลังประมวลผลข้อมูลภาษีและสิทธิลดหย่อนของคุณ...
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">ใช้เวลาประมวลผลประมาณ 10-30 วินาที</div>
                  </div>
                ) : taxAdvice ? (
                  <div className="space-y-5">
                    <div className="text-sm text-[var(--text-main)] leading-relaxed space-y-3 bg-[var(--card)] p-5 rounded-2xl border border-[#dbeafe] dark:border-blue-900/30">
                      {renderTaxAdvice(taxAdvice)}
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={analyzeTaxWithAI}
                        disabled={isTaxAdviceLoading}
                        className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-[#dbeafe]/60 dark:hover:bg-gray-700 text-[#1d4ed8] dark:text-blue-300 border border-[#93c5fd] dark:border-blue-900 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <i className="fi fi-rr-refresh" /> ขอคำแนะนำใหม่
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4">
                    {/* Hero icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <i className="fi fi-sr-bulb text-3xl text-amber-500"></i>
                    </div>

                    {/* Title + description */}
                    <div className="text-lg font-extrabold text-[var(--text-main)] mb-2">
                      วางแผนภาษีอย่างชาญฉลาดด้วย AI
                    </div>
                    <div className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
                      ให้ AI วิเคราะห์ข้อมูลภาษีจริงของคุณ เพื่อให้แน่ใจว่าคุณจะไม่พลาดสิทธิลดหย่อนใด ๆ
                      และได้รับประโยชน์สูงสุดจากการวางแผนภาษีที่ดี
                    </div>

                    {/* Feature checklist */}
                    <div className="max-w-sm mx-auto space-y-2.5 mb-7 text-left">
                      {[
                        'วิเคราะห์โควตาลดหย่อนที่ยังเหลืออยู่',
                        'เปรียบเทียบกลยุทธ์เงินปันผล (ยื่นรวม vs Final Tax)',
                        'คำแนะนำแผนภาษีเฉพาะสำหรับข้อมูลของคุณ',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5 text-sm text-[var(--text-main)]">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <i className="fi fi-sr-check text-[10px]"></i>
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    {annualIncome ? (
                      <button
                        onClick={analyzeTaxWithAI}
                        className="px-8 py-3 bg-[#1e1c10] hover:bg-black text-white text-sm font-bold rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <i className="fi fi-sr-sparkles mr-1.5" /> เริ่มการวิเคราะห์ภาษีด้วย AI
                      </button>
                    ) : (
                      <div className="inline-flex flex-col items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-6 py-4">
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <i className="fi fi-sr-triangle-warning" />
                          กรุณากรอกข้อมูลรายได้ในแท็บ "ลดหย่อนภาษี" ก่อนเริ่มการวิเคราะห์
                        </div>
                        <button
                          onClick={() => setTaxSubTab('deductions')}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          <i className="fi fi-sr-clipboard-list mr-1.5" /> ไปที่แท็บลดหย่อนภาษี
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Data used for analysis */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between font-bold text-[var(--text-main)]">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-database text-[#2563eb]"></i> ข้อมูลที่ใช้วิเคราะห์
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#dbeafe] dark:bg-blue-900/40 text-[#1d4ed8] dark:text-blue-300">
                  พ.ศ. {selectedTaxYear}
                </span>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>รายได้รวมทั้งปี</span>
                  <span className="font-mono text-[var(--text-main)] font-bold">฿{fmt(taxResult.grossIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>เงินได้สุทธิ</span>
                  <span className="font-mono">฿{fmt(taxResult.netIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>ลดหย่อนรวมทั้งหมด</span>
                  <span className="font-mono">- ฿{fmt(taxResult.expenseDeduction + taxResult.personalDeduction + taxResult.otherDeductions)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>ภาษีที่ต้องชำระ</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">฿{fmt(taxResult.taxWithDeductions)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">ประหยัดภาษีได้</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">฿{fmt(taxResult.taxSaved)}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                  <span>ฐานภาษีขั้นสูง</span>
                  <span className="font-mono font-bold">{(taxResult.marginalRate * 100).toFixed(0)}%</span>
                </div>
                {typeof annualDividendInput === 'number' && annualDividendInput > 0 && (
                  <div className="flex justify-between items-center text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                    <span>เงินปันผลรับทั้งปี</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(annualDividendInput)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hint card */}
            <div className="bg-[#dbeafe]/50 dark:bg-blue-900/20 rounded-2xl border border-[#bfdbfe] dark:border-blue-900/50 p-4 flex items-start gap-3">
              <i className="fi fi-sr-info text-[#2563eb] mt-0.5"></i>
              <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                AI จะใช้ข้อมูลรายได้ ลดหย่อน และเงินปันผลปัจจุบันจากแท็บ "ลดหย่อนภาษี" ในการวิเคราะห์
                หากแก้ไขข้อมูล ให้กด "วิเคราะห์ใหม่" เพื่อรับคำแนะนำล่าสุด
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: HISTORY ═══════════════ */}
      {taxSubTab === 'history' && (
        <div className="space-y-8">
          
          {/* Chart Section */}
          <div className="p-2 md:p-4">
            <div className="flex items-center gap-3 text-lg font-bold text-[var(--text-main)] mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <i className="fi fi-sr-chart-histogram text-sm" />
              </div>
              กราฟเปรียบเทียบภาษีย้อนหลัง (สูงสุด 5 ปี)
            </div>

            {chartData.length > 0 ? (
              <div className="w-full" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12, fontWeight: 700 }}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`}
                      width={70}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `฿${(v / 1000000).toFixed(1)}M`}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                    />
                    <Bar yAxisId="left" dataKey="taxPaid" name="ภาษีที่ต้องจ่าย" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
                    <Bar yAxisId="left" dataKey="taxSaved" name="ภาษีที่ประหยัดได้" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="income" name="รายได้รวม" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                <i className="fi fi-sr-chart-histogram text-4xl mb-3 opacity-40" />
                <div className="text-sm font-semibold">ยังไม่มีประวัติภาษี</div>
                <div className="text-xs mt-1">กรุณาบันทึกข้อมูลลดหย่อนในแท็บ "ลดหย่อนภาษี" ก่อน</div>
              </div>
            )}
          </div>

          {/* History List Section */}
          <div className="p-2 md:p-4 mt-4">
            <div className="flex items-center gap-3 text-lg font-bold text-[var(--text-main)] mb-6">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-sub)] text-[var(--accent-blue)] flex items-center justify-center">
                <i className="fi fi-sr-time-past text-sm" />
              </div>
              ประวัติการเสียภาษีแต่ละปี
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-muted)] text-sm">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3" />
                กำลังโหลดประวัติ...
              </div>
            ) : taxHistories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <i className="fi fi-sr-folder-open text-3xl mb-3 opacity-40" />
                <div className="text-sm font-semibold">ยังไม่มีประวัติ</div>
                <div className="text-xs mt-1">ไปที่แท็บ "ลดหย่อนภาษี" เพื่อกรอกข้อมูลและบันทึก</div>
              </div>
            ) : (
              <div className="space-y-4">
                {taxHistories.map((record) => {
                  const isExpanded = expandedYear === record.taxYear;
                  const deductions = (record.deductions || {}) as Record<string, any>;
                  // Filter out empty deductions
                  const activeDeductions = Object.entries(deductions).filter(([key, val]) => {
                    if (key === 'spouseNoIncome') return val === true;
                    return val && Number(val) > 0;
                  });

                  return (
                    <div 
                      key={record.id} 
                      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                        isExpanded 
                          ? 'border-[var(--border2)] shadow-[var(--shadow-md)]' 
                          : 'border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Card header — always visible */}
                      <div 
                        className="flex items-center justify-between p-4 md:p-5 cursor-pointer select-none"
                        onClick={() => setExpandedYear(isExpanded ? null : record.taxYear)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Year badge */}
                          <div className="w-14 h-14 rounded-xl bg-[var(--accent-blue)] flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                            <div className="text-[10px] font-semibold leading-none opacity-80">พ.ศ.</div>
                            <div className="text-lg font-extrabold leading-tight">{record.taxYear}</div>
                          </div>
                          {/* Summary info */}
                          <div>
                            <div className="text-xs text-[var(--text-muted)] mb-0.5">ภาษีที่ต้องจ่าย</div>
                            <div className="text-xl font-extrabold font-mono text-[var(--text-main)]">
                              ฿{fmt(Math.round(record.taxWithDeductions))}
                            </div>
                            <div className="flex gap-4 mt-1 text-[11px] text-[var(--text-muted)]">
                              <span>รายได้: <strong className="text-[var(--text-main)] font-mono">฿{fmt(Math.round(record.annualIncome))}</strong></span>
                              <span>ประหยัด: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">฿{fmt(Math.round(record.taxSaved))}</strong></span>
                              <span>อัตรา: <strong className="font-mono">{(record.marginalRate * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Edit button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); loadHistoryForEdit(record); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            title="แก้ไข"
                          >
                            <i className="fi fi-sr-pencil text-sm" />
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTaxHistoryYear(record.taxYear); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title="ลบ"
                          >
                            <i className="fi fi-sr-trash text-sm" />
                          </button>
                          {/* Expand arrow */}
                          <i className={`fi ${isExpanded ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[var(--text-muted)] text-sm transition-transform duration-200`} />
                        </div>
                      </div>

                      {/* Expanded detail (dropdown) */}
                      {isExpanded && (
                        <div className="border-t border-[var(--border)] bg-gray-50/50 dark:bg-gray-900/30 p-4 md:p-5 animate-[fadeIn_0.2s_ease]">
                          {/* Tax breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                              <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">เงินได้สุทธิ</div>
                              <div className="font-mono font-bold text-sm text-[var(--text-main)]">฿{fmt(Math.round(record.netIncome))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                              <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">ภาษีก่อนลดหย่อน</div>
                              <div className="font-mono font-bold text-sm text-red-600">฿{fmt(Math.round(record.taxWithoutDeductions))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                              <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">ภาษีหลังลดหย่อน</div>
                              <div className="font-mono font-bold text-sm text-[var(--text-main)]">฿{fmt(Math.round(record.taxWithDeductions))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                              <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">ลดหย่อนรวม</div>
                              <div className="font-mono font-bold text-sm text-blue-600">฿{fmt(Math.round(record.totalDeductions))}</div>
                            </div>
                          </div>

                          {/* Deduction details */}
                          {activeDeductions.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider">
                                รายการลดหย่อนที่ใช้
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {activeDeductions.map(([key, val]) => {
                                  const isPersonCount = ['childBefore2561', 'childAfter2561', 'adoptedChild', 'parentCare'].includes(key);
                                  return (
                                    <div key={key} className="flex justify-between items-center text-xs py-1.5 px-2 rounded bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                      <span className="text-[var(--text-muted)]">{DEDUCTION_LABELS[key] || key}</span>
                                      <span className="font-mono font-bold text-[var(--text-main)]">
                                        {key === 'spouseNoIncome' ? 'ใช่' : isPersonCount ? `${fmt(Number(val))} คน` : `฿${fmt(Number(val))}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Last updated */}
                          <div className="text-[10px] text-[var(--text-muted)] mt-4 text-right">
                            อัปเดตล่าสุด: {new Date(record.updatedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

