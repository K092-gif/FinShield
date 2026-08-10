"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import "../ui/RetirementDiary.css";

/* ─── Types ──────────────────────────────────────────────── */
type Pledge = {
  id: string;
  name: string;
  amount: number;           // remaining balance
  originalAmount: number;   // set on creation, never changes
  monthlyPayment: number;
  targetYear: number;
  nextPaymentDate?: string; // YYYY-MM-DD — triggers auto-deduction
};

type JournalEntry = { id: string; date: string; text: string; aiComment?: string; };

type Deduction = {
  pledgeId: string; pledgeName: string; amount: number; date: string; // YYYY-MM-DD
};

type DiaryState = {
  dreamText: string;
  pledges: Pledge[];
  entries: JournalEntry[];
  dailyAdvice: Record<string, string>;
  lastVisited: string;
  deductions: Deduction[];
  monthlyScores?: Record<string, { score: number, review: string }>;
  yearlyScores?: Record<number, { score: number, review: string }>;
};

const DEFAULT_DIARY: DiaryState = {
  dreamText: "", pledges: [], entries: [], dailyAdvice: {},
  lastVisited: new Date().toISOString(), deductions: [],
  monthlyScores: {}, yearlyScores: {}
};

/* ─── Helpers ────────────────────────────────────────────── */
const toLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fmtMoney = (n: number) => `฿${n.toLocaleString()}`;

const MONTH_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_FULL  = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

const inputCls = "w-full box-border px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--text-main)] text-[13px] outline-none focus:border-[var(--accent-blue)] transition-colors";

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function RetirementDiary() {
  const { user } = useAuth();
  const [diary, setDiary] = useLocalStorage<DiaryState>("wpt_diary", DEFAULT_DIARY);
  const { financeData } = useFinance();

  // Fetch score history from database and sync missing ones
  useEffect(() => {
    if (user?.uid) {
      fetch(`${API_BASE_URL}/simulator/diary-scores?firebaseUid=${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const monthly: Record<string, { score: number; review: string }> = {};
            const yearly: Record<number, { score: number; review: string }> = {};
            data.forEach((s: any) => {
              if (s.evaluationType === "month") {
                monthly[s.periodKey] = { score: s.score, review: s.review };
              } else if (s.evaluationType === "year") {
                yearly[parseInt(s.periodKey, 10)] = { score: s.score, review: s.review };
              }
            });
            
            // Sync any local scores that are missing in the DB
            const localMonthly = diary.monthlyScores || {};
            const localYearly = diary.yearlyScores || {};
            
            Object.keys(localMonthly).forEach(key => {
              if (!monthly[key]) {
                fetch(`${API_BASE_URL}/simulator/diary-scores`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ firebaseUid: user.uid, evaluationType: "month", periodKey: key, ...localMonthly[key] })
                }).catch(console.error);
              }
            });
            
            Object.keys(localYearly).forEach(key => {
              if (!yearly[parseInt(key, 10)]) {
                fetch(`${API_BASE_URL}/simulator/diary-scores`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ firebaseUid: user.uid, evaluationType: "year", periodKey: key, ...localYearly[parseInt(key, 10)] })
                }).catch(console.error);
              }
            });

            setDiary(prev => ({
              ...prev,
              monthlyScores: { ...prev.monthlyScores, ...monthly },
              yearlyScores: { ...prev.yearlyScores, ...yearly }
            }));
          }
        })
        .catch(console.error);
    }
  }, [user]);

  /* pledge form */
  const [newPledgeName,    setNewPledgeName]    = useState("");
  const [newPledgeAmount,  setNewPledgeAmount]  = useState("");
  const [newPledgeMonthly, setNewPledgeMonthly] = useState("");
  const [newPledgeYear,    setNewPledgeYear]    = useState("");
  const [newPledgeDate,    setNewPledgeDate]    = useState(""); // nextPaymentDate for new pledge
  const [editingPledgeId,  setEditingPledgeId]  = useState<string | null>(null);
  const [editPledge,       setEditPledge]       = useState<Partial<Pledge>>({});

  /* journal */
  const [newEntryText,   setNewEntryText]   = useState("");
  const [isAskingAI,     setIsAskingAI]     = useState(false);
  const [askingEntryId,  setAskingEntryId]  = useState<string | null>(null);
  const [showReminder,   setShowReminder]   = useState(false);

  /* dream */
  const [dreamDraft, setDreamDraft] = useState<string | null>(null);
  const [dreamSaved, setDreamSaved] = useState(false);

  /* view */
  const [selectedView, setSelectedView] = useState<"diary" | "summary">("diary");
  const [isBookOpen, setIsBookOpen]     = useState(false);
  const [summarySelectedMonth, setSummarySelectedMonth] = useState<number | null>(null);

  /* ── Date navigation ──────────────────────────────────── */
  const today            = new Date();
  const currentRealYear  = today.getFullYear();
  const currentRealMonth = today.getMonth();
  const todayStr         = toLocalDate(today);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    set.add(currentRealYear);
    (diary.entries || []).forEach(e => set.add(new Date(e.date).getFullYear()));
    return Array.from(set).sort((a, b) => a - b);
  }, [diary.entries, currentRealYear]);

  const [selectedYear,     setSelectedYear]     = useState(currentRealYear);
  const [selectedMonth,    setSelectedMonth]    = useState(currentRealMonth);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const monthsWithEntries = useMemo(() => {
    const set = new Set<number>();
    (diary.entries || []).forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === selectedYear) set.add(d.getMonth());
    });
    return set;
  }, [diary.entries, selectedYear]);

  const isCurrentPeriod = selectedYear === currentRealYear && selectedMonth === currentRealMonth;

  const entriesForPeriod = useMemo(
    () => (diary.entries || []).filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    }),
    [diary.entries, selectedYear, selectedMonth]
  );

  const daysInPeriod = useMemo(() => {
    const set = new Set<string>();
    if (isCurrentPeriod) set.add(todayStr);
    entriesForPeriod.forEach(e => set.add(toLocalDate(new Date(e.date))));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entriesForPeriod, isCurrentPeriod, todayStr]);

  useEffect(() => { setSelectedDayIndex(0); }, [selectedYear, selectedMonth]);

  const currentDayStr = daysInPeriod[selectedDayIndex] ??
    (isCurrentPeriod ? todayStr : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`);
  const isCurrentDay = currentDayStr === todayStr;

  const entriesForCurrentDay = useMemo(
    () => entriesForPeriod.filter(e => toLocalDate(new Date(e.date)) === currentDayStr),
    [entriesForPeriod, currentDayStr]
  );

  const adviceForDay = (diary.dailyAdvice || {})[currentDayStr];

  const formattedDay = useMemo(() => {
    try {
      return new Date(`${currentDayStr}T12:00:00`).toLocaleDateString("th-TH", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
    } catch { return currentDayStr; }
  }, [currentDayStr]);

  /* ── Extended Summary Stats ───────────────────────────── */
  const summaryStats = useMemo(() => {
    const totalEntries = (diary.entries || []).length;

    const monthly: Record<number, number> = {};
    (diary.entries || [])
      .filter(e => new Date(e.date).getFullYear() === selectedYear)
      .forEach(e => { const m = new Date(e.date).getMonth(); monthly[m] = (monthly[m] || 0) + 1; });

    const pledges = diary.pledges || [];
    const totalDebt     = pledges.reduce((s, p) => s + p.amount, 0);
    const totalOriginal = pledges.reduce((s, p) => s + (p.originalAmount || p.amount), 0);
    const totalPaid     = totalOriginal - totalDebt;
    const activePledges   = pledges.filter(p => p.amount > 0).length;
    const paidOffPledges  = pledges.filter(p => p.amount <= 0 && (p.originalAmount || 0) > 0).length;

    // Monthly deductions for selected year
    const monthlyDeductions: Record<number, number> = {};
    (diary.deductions || [])
      .filter(d => new Date(d.date).getFullYear() === selectedYear)
      .forEach(d => { const m = new Date(d.date).getMonth(); monthlyDeductions[m] = (monthlyDeductions[m] || 0) + d.amount; });

    const yearlyDeducted = Object.values(monthlyDeductions).reduce((a, b) => a + b, 0);

    return { totalEntries, monthly, totalDebt, totalOriginal, totalPaid, activePledges, paidOffPledges, monthlyDeductions, yearlyDeducted };
  }, [diary.entries, diary.pledges, diary.deductions, selectedYear]);

  /* ── Effects ─────────────────────────────────────────── */
  useEffect(() => {
    // 1. Reminder
    const lastVisit = new Date(diary.lastVisited || new Date().toISOString());
    const diff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24));
    if (diff >= 1) setShowReminder(true);

    // 2. Auto-deduction: check nextPaymentDate for each pledge
    const todayMidnight = new Date(`${todayStr}T00:00:00`);
    const existingKeys = new Set(
      (diary.deductions || []).map(d => `${d.pledgeId}_${d.date}`)
    );

    const updatedPledges: Pledge[] = JSON.parse(JSON.stringify(diary.pledges || []));
    const newDeductions: Deduction[] = [...(diary.deductions || [])];
    let hasChanges = false;

    updatedPledges.forEach((pledge, idx) => {
      if (!pledge.nextPaymentDate || updatedPledges[idx].amount <= 0) return;
      let payDate = new Date(`${pledge.nextPaymentDate}T00:00:00`);

      while (payDate <= todayMidnight && updatedPledges[idx].amount > 0) {
        const dateStr = toLocalDate(payDate);
        const key = `${pledge.id}_${dateStr}`;
        if (!existingKeys.has(key)) {
          const deductAmt = Math.min(pledge.monthlyPayment, updatedPledges[idx].amount);
          updatedPledges[idx].amount = Math.max(0, updatedPledges[idx].amount - deductAmt);
          newDeductions.push({ pledgeId: pledge.id, pledgeName: pledge.name, amount: deductAmt, date: dateStr });
          existingKeys.add(key);
          hasChanges = true;
        }
        payDate = new Date(payDate.getFullYear(), payDate.getMonth() + 1, payDate.getDate());
      }
      if (hasChanges) updatedPledges[idx].nextPaymentDate = toLocalDate(payDate);
    });

    setDiary((prev: DiaryState) => ({
      ...prev,
      lastVisited: today.toISOString(),
      dailyAdvice: prev.dailyAdvice || {},
      deductions: hasChanges ? newDeductions : (prev.deductions || []),
      pledges: hasChanges ? updatedPledges : prev.pledges,
    }));
  }, []);

  /* ── Handlers ────────────────────────────────────────── */
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedView("diary");
    setIsBookOpen(true);
    setSelectedMonth(year === currentRealYear ? currentRealMonth
      : (Array.from(monthsWithEntries).sort((a, b) => a - b)[0] ?? 0));
  };

  const handleSaveDream = () => {
    const text = dreamDraft !== null ? dreamDraft : diary.dreamText || "";
    setDiary((prev: DiaryState) => ({ ...prev, dreamText: text }));
    setDreamSaved(true);
    setTimeout(() => setDreamSaved(false), 2000);
  };

  const handleAddPledge = () => {
    if (!newPledgeName || !newPledgeAmount || !newPledgeYear) return;
    const amt = Number(newPledgeAmount);
    setDiary((prev: DiaryState) => ({
      ...prev,
      pledges: [...(prev.pledges || []), {
        id: Date.now().toString(),
        name: newPledgeName,
        amount: amt,
        originalAmount: amt,
        monthlyPayment: Number(newPledgeMonthly) || 0,
        targetYear: Number(newPledgeYear),
        nextPaymentDate: newPledgeDate || undefined,
      }],
    }));
    setNewPledgeName(""); setNewPledgeAmount(""); setNewPledgeMonthly("");
    setNewPledgeYear(""); setNewPledgeDate("");
  };

  const handleDeletePledge = (id: string) =>
    setDiary((prev: DiaryState) => ({
      ...prev, pledges: (prev.pledges || []).filter(p => p.id !== id),
    }));

  const handleSaveEditPledge = (p: Pledge) => {
    setDiary((prev: DiaryState) => ({
      ...prev,
      pledges: prev.pledges.map(item => item.id === p.id ? {
        ...item,
        name:            editPledge.name            ?? item.name,
        amount:          editPledge.amount           ?? item.amount,
        originalAmount:  item.originalAmount         || (editPledge.amount ?? item.amount),
        monthlyPayment:  editPledge.monthlyPayment   ?? (item.monthlyPayment || 0),
        targetYear:      editPledge.targetYear       ?? item.targetYear,
        nextPaymentDate: editPledge.nextPaymentDate  ?? item.nextPaymentDate,
      } : item),
    }));
    setEditingPledgeId(null); setEditPledge({});
  };

  const handlePostEntry = () => {
    if (!newEntryText.trim()) return;
    const now = new Date();
    let entryDate: Date;
    if (isCurrentDay) {
      entryDate = now;
    } else {
      const [y, mo, d] = currentDayStr.split("-").map(Number);
      entryDate = new Date(y, mo - 1, d, now.getHours(), now.getMinutes());
      if (isNaN(entryDate.getTime())) entryDate = now;
    }
    setDiary((prev: DiaryState) => ({
      ...prev,
      entries: [{ id: Date.now().toString(), date: entryDate.toISOString(), text: newEntryText }, ...(prev.entries || [])],
    }));
    setNewEntryText("");
  };

  const handleAskAdvice = async (entryId?: string) => {
    let text = "";
    if (entryId) {
      const e = (diary.entries || []).find(e => e.id === entryId);
      if (!e) return;
      text = e.text; setAskingEntryId(entryId);
    } else {
      if (!entriesForCurrentDay.length) return;
      text = entriesForCurrentDay.map(e => e.text).join("\n---\n"); setIsAskingAI(true);
    }
    try {
      const ctx = {
        currentCapital: financeData.assets.currentCapital,
        monthlyIncome: financeData.assets.monthlyIncome,
        monthlyExpense: Object.values(financeData.expenses).reduce((a, b) => a + (b || 0), 0),
        debt: financeData.expenses.debt, monthlySavings: financeData.assets.monthlySavings,
        emergencyFund: financeData.assets.emergencyFund, pledges: diary.pledges,
      };
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "diary_cheer",
          messages: [{ role: "user", content: "นี่คือบันทึกไดอารี่ของฉัน ช่วยอ่านและให้คำแนะนำหรือกำลังใจหน่อย:\n" + text }],
          context: ctx }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          if (entryId) {
            setDiary((prev: DiaryState) => ({ ...prev, entries: prev.entries.map(e => e.id === entryId ? { ...e, aiComment: data.reply } : e) }));
          } else {
            setDiary((prev: DiaryState) => ({ ...prev, dailyAdvice: { ...(prev.dailyAdvice || {}), [currentDayStr]: data.reply } }));
          }
        }
      }
    } catch (err) { console.error("AI Advice failed:", err); }
    finally { if (entryId) setAskingEntryId(null); else setIsAskingAI(false); }
  };

  const handleEvaluateMonth = async (year: number, month: number) => {
    const key = `${year}-${month}`;

    const monthEntries = (diary.entries || []).filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "diary_score",
          messages: [{ role: "user", content: `สรุปพฤติกรรมเดือน ${month+1}/${year} ฉันเขียนไดอารี่ ${monthEntries.length} ครั้ง มีหนี้ ${diary.pledges.length} รายการ ช่วยประเมินคะแนนพฤติกรรมของฉันเต็ม 100 และให้คำแนะนำสั้นๆ 1 ย่อหน้า (ห้ามขึ้นบรรทัดใหม่ ห้ามใช้สัญลักษณ์ - หรือ bullet)` }],
          context: { entries: monthEntries.length, pledges: diary.pledges.length } 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        let score = Math.floor(Math.random() * 30) + 70;
        let review = "พฤติกรรมยอดเยี่ยมในเดือนนี้ ทำต่อไป!";
        try {
          const parsed = JSON.parse(data.reply);
          if (typeof parsed.score === "number") score = parsed.score;
          if (parsed.review) review = parsed.review.replace(/\n/g, " ").replace(/[*#-]/g, "").trim();
        } catch (e) {
          console.error("Failed to parse JSON AI response", e);
        }

        setDiary((prev: DiaryState) => ({
          ...prev,
          monthlyScores: { ...(prev.monthlyScores || {}), [key]: { score, review } }
        }));

        if (user?.uid) {
          try {
            const saveRes = await fetch(`${API_BASE_URL}/simulator/diary-scores`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firebaseUid: user.uid, evaluationType: "month", periodKey: key, score, review })
            });
            if (!saveRes.ok) console.error("Failed to save to database:", await saveRes.text());
          } catch (e) {
            console.error("Network error saving to database", e);
          }
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleEvaluateYear = async (year: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "diary_score",
          messages: [{ role: "user", content: `สรุปพฤติกรรมทั้งปี ${year} ช่วยประเมินคะแนนพฤติกรรมของฉันเต็ม 100 และให้คำแนะนำสั้นๆ 1 ย่อหน้า (ห้ามขึ้นบรรทัดใหม่ ห้ามใช้สัญลักษณ์ - หรือ bullet)` }],
          context: {} 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        let score = Math.floor(Math.random() * 20) + 80;
        let review = "ผลประกอบการปีนี้ดีมาก! เป็นปีที่ยอดเยี่ยม";
        try {
          const parsed = JSON.parse(data.reply);
          if (typeof parsed.score === "number") score = parsed.score;
          if (parsed.review) review = parsed.review.replace(/\n/g, " ").replace(/[*#-]/g, "").trim();
        } catch (e) {
          console.error("Failed to parse JSON AI response", e);
        }

        setDiary((prev: DiaryState) => ({
          ...prev,
          yearlyScores: { ...(prev.yearlyScores || {}), [year]: { score, review } }
        }));

        if (user?.uid) {
          try {
            const saveRes = await fetch(`${API_BASE_URL}/simulator/diary-scores`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firebaseUid: user.uid, evaluationType: "year", periodKey: year.toString(), score, review })
            });
            if (!saveRes.ok) console.error("Failed to save to database:", await saveRes.text());
          } catch (e) {
            console.error("Network error saving to database", e);
          }
        }
      }
    } catch (err) { console.error(err); }
  };

  // Auto trigger evaluation for past months/years when viewing summary
  useEffect(() => {
    if (selectedView === "summary") {
      if (summarySelectedMonth !== null) {
        const isPastMonth = selectedYear < currentRealYear || (selectedYear === currentRealYear && summarySelectedMonth < currentRealMonth);
        if (isPastMonth && !diary.monthlyScores?.[`${selectedYear}-${summarySelectedMonth}`]) {
          handleEvaluateMonth(selectedYear, summarySelectedMonth);
        }
      } else {
        const isPastYear = selectedYear < currentRealYear;
        if (isPastYear && !diary.yearlyScores?.[selectedYear]) {
          handleEvaluateYear(selectedYear);
        }
      }
    }
  }, [selectedView, summarySelectedMonth, selectedYear, currentRealYear, currentRealMonth, diary.monthlyScores, diary.yearlyScores]);

  /* ─── Small re-usable pieces ─────────────────────────── */
  const PledgeProgressBar = ({ p }: { p: Pledge }) => {
    const original = p.originalAmount || p.amount;
    const pct = original > 0 ? Math.min(100, Math.round(((original - p.amount) / original) * 100)) : 0;
    const isDone = p.amount <= 0;
    return (
      <div className="flex flex-col gap-1 mt-1">
        <div className="w-full h-1.5 bg-[var(--bg-sub)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isDone ? "bg-green-500" : "bg-[var(--accent-blue)]"}`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>จ่ายแล้ว {pct}% ({fmtMoney(original - p.amount)})</span>
          {isDone
            ? <span className="text-green-600 font-semibold">✓ ปลดหนี้แล้ว!</span>
            : p.nextPaymentDate && (
              <span>จ่ายครั้งถัดไป {new Date(`${p.nextPaymentDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
            )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="diary-animate flex flex-col items-center gap-3 max-w-[1200px] mx-auto px-4 py-5 pb-10 font-[var(--font-family)]">



      {showReminder && (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50/60 to-emerald-50/60 text-sm text-[var(--text-main)]">
          <i className="fi fi-sr-heart text-xl text-[var(--accent-blue)] shrink-0"></i>
          <div><strong>คิดถึงจังเลย!</strong>{" "}เป็นยังไงบ้าง หากมีเรื่องไม่สบายใจสามารถเข้ามาเขียนไดอารี่ได้นะ ยุ่งมากขอให้เงินมากตามนะ 💙</div>
        </div>
      )}

      {/* Book Area */}
      <div className="flex flex-col w-full">

        {/* Year tabs + สรุป tab */}
        {isBookOpen && (
          <div className="flex items-end gap-0.5">
            {availableYears.map(year => {
              const isActive = selectedView === "diary" && selectedYear === year;
              return (
                <button key={year} onClick={() => handleYearSelect(year)} title={`ปี ${year}`}
                  className={[isActive ? "tab-year-active" : "",
                    "px-5 py-2 text-[13px] font-bold border border-b-0 rounded-t-lg cursor-pointer transition-all duration-200 tracking-wide",
                    isActive
                      ? "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] shadow-[0_-4px_12px_rgba(17,45,78,0.18)]"
                      : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)]",
                  ].join(" ")}>
                  {year}
                </button>
              );
            })}
            <button onClick={() => { setSelectedView(v => v === "summary" ? "diary" : "summary"); setIsBookOpen(true); }}
              className={[selectedView === "summary" ? "tab-year-active" : "",
                "px-4 py-2 text-[13px] font-bold border border-b-0 rounded-t-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5",
                selectedView === "summary"
                  ? "bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-[0_-4px_12px_rgba(63,114,175,0.2)]"
                  : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)]",
              ].join(" ")}>
              <i className="fi fi-sr-chart-pie-alt"></i> สรุป
            </button>
          </div>
        )}

        {/* Book row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-0">

          {/* ── THE BOOK ── */}
          <div className={`diary-book flex flex-col lg:flex-row bg-[#fbfaf8] dark:bg-[#1a1c23] border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)] min-h-[680px] lg:max-h-[82vh] max-h-none ${!isBookOpen ? "w-full max-w-[500px] mx-auto cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 diary-book-closed" : "flex-1 w-full diary-book-open"}`}
            onClick={() => { if (!isBookOpen) setIsBookOpen(true); }}
          >

            {!isBookOpen ? (
              /* ══ COVER VIEW ══ */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#1b3a57] to-[var(--accent-dark)] text-white relative overflow-hidden rounded-md shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)] group">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/20 border-r border-black/30 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)]"></div> {/* Book Spine */}
                
                <div className="flex flex-col items-center gap-4 z-10 p-10 transform transition-all duration-300">
                  <h1 className="text-[2.5rem] font-bold text-white mb-2 drop-shadow-md flex items-center gap-3">
                    ไดอารี่เกษียณสุข
                  </h1>
                  <p className="text-blue-100 text-[15px] font-medium drop-shadow text-center max-w-md leading-relaxed opacity-90">
                    บันทึกเรื่องราวในแต่ละวัน สารภาพหนี้สิน และติดตามก้าวเล็กๆ สู่ความอิสระ
                  </p>
                </div>
              </div>
            ) : selectedView === "summary" ? (
              /* ══ SUMMARY VIEW ══ */
              <>
                {/* ── LEFT PAGE (GREEN) ── */}
                <div className="flex-1 flex flex-col px-4 lg:px-6 py-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-black/[0.05]">
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto rounded-xl lg:p-4">

                    <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-2 mb-1 shrink-0">
                      <h3 className="text-[14px] font-bold text-[var(--text-main)]">บันทึกรายเดือน / ยอดชำระหนี้ - ปี {selectedYear}</h3>
                    </div>

                    {/* Monthly grid */}
                    <div className="grid grid-cols-6 gap-1.5 shrink-0">
                      {MONTH_SHORT.map((name, i) => {
                        const count = summaryStats.monthly[i] || 0;
                        const deducted = summaryStats.monthlyDeductions[i] || 0;
                        const maxCount = Math.max(...Object.values(summaryStats.monthly), 1);
                        return (
                          <button key={i}
                            onClick={() => { 
                              if (summarySelectedMonth === i) setSummarySelectedMonth(null);
                              else setSummarySelectedMonth(i); 
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors group ${summarySelectedMonth === i ? "bg-[var(--card)] border-[var(--accent-blue)]" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--card)]"}`}>
                            <div className="w-full h-1.5 bg-[var(--bg-sub)] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${summarySelectedMonth === i ? "bg-[var(--accent-blue)]" : "bg-green-500"}`}
                                style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
                            </div>
                            <span className={`text-[10px] font-semibold ${summarySelectedMonth === i ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"}`}>{name}</span>
                            <span className={`text-[13px] font-bold leading-tight ${count > 0 ? (summarySelectedMonth === i ? "text-[var(--accent-blue)]" : "text-[var(--text-main)]") : "text-[var(--text-muted)]"}`}>{count}</span>
                            {deducted > 0
                              ? <span className="text-[9px] font-bold text-[var(--red)] leading-tight">-{fmtMoney(deducted)}</span>
                              : <span className="text-[9px] text-transparent leading-tight">-</span>
                            }
                          </button>
                        );
                      })}
                    </div>

                    {/* AI Scoring Section */}
                    {(() => {
                      const isMonthMode = summarySelectedMonth !== null;
                      const title = isMonthMode ? `ประเมินพฤติกรรม ${MONTH_FULL[summarySelectedMonth]} ${selectedYear}` : `ประเมินพฤติกรรมรวม ปี ${selectedYear}`;
                      const scoreData = isMonthMode 
                        ? diary.monthlyScores?.[`${selectedYear}-${summarySelectedMonth}`] 
                        : diary.yearlyScores?.[selectedYear];
                      
                      const isPast = isMonthMode 
                        ? (selectedYear < currentRealYear || (selectedYear === currentRealYear && summarySelectedMonth < currentRealMonth))
                        : (selectedYear < currentRealYear);

                      return (
                        <div className="py-4 border-t border-b border-dashed border-[var(--border)] shrink-0 my-1">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fi fi-sr-robot text-[var(--accent-blue)]"></i>
                            <h4 className="text-[13px] font-bold text-[var(--text-main)]">{title}</h4>
                          </div>
                          {scoreData ? (
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center shrink-0 w-16 pt-1">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-[var(--accent-blue)]">
                                  <span className="text-xl font-black text-[var(--accent-blue)] leading-none">{scoreData.score}</span>
                                </div>
                                <span className="text-[8px] font-bold text-[var(--accent-blue)] uppercase tracking-wider mt-0.5 mb-1">Score</span>
                                <button 
                                  onClick={() => summarySelectedMonth !== null ? handleEvaluateMonth(selectedYear, summarySelectedMonth) : handleEvaluateYear(selectedYear)}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-sub)] flex items-center gap-1 cursor-pointer transition-colors"
                                  title="ประเมินใหม่"
                                >
                                  <i className="fi fi-sr-refresh"></i>
                                </button>
                              </div>
                              <p className="text-[13px] text-[var(--text-main)] leading-7 flex-1 bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border)] relative font-medium shadow-sm">
                                <span className="absolute -left-1.5 top-5 w-3 h-3 bg-[var(--bg-main)] border-l border-t border-[var(--border)] rotate-[-45deg]"></span>
                                {scoreData.review.replace(/\n/g, " ").replace(/[*#-]/g, "")}
                              </p>
                            </div>
                          ) : isPast ? (
                            <div className="text-[12px] text-[var(--text-muted)] flex items-center gap-2">
                              <i className="fi fi-sr-spinner fa-spin"></i> AI กำลังประเมินผล...
                            </div>
                          ) : (
                            <div className="text-[12px] text-[var(--text-muted)] bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border)] text-center">
                              ยังไม่จบ{isMonthMode ? "เดือน" : "ปี"}นี้ AI จะประเมินผลให้เมื่อสิ้นสุด{isMonthMode ? "เดือน" : "ปี"}ครับ
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Yearly deduction summary - Cardless */}
                    <div className="py-2 shrink-0">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">ยอดชำระหนี้รวม{summarySelectedMonth !== null ? ` ${MONTH_FULL[summarySelectedMonth]}` : ` ปี ${selectedYear}`}</span>
                          <span className="text-2xl font-bold text-[var(--red)]">
                            {fmtMoney(summarySelectedMonth !== null ? (summaryStats.monthlyDeductions[summarySelectedMonth] || 0) : summaryStats.yearlyDeducted)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">บันทึกที่เขียน</span>
                          <span className="text-2xl font-bold text-green-600">
                            {summarySelectedMonth !== null ? (summaryStats.monthly[summarySelectedMonth] || 0) : Object.values(summaryStats.monthly).reduce((a, b) => a + b, 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deduction history - Cardless */}
                    {(diary.deductions || []).filter(d => new Date(d.date).getFullYear() === selectedYear && (summarySelectedMonth === null || new Date(d.date).getMonth() === summarySelectedMonth)).length > 0 && (
                      <div className="pt-2 flex flex-col gap-1.5 min-h-0 border-t border-[var(--border)]">
                        <span className="text-[11px] font-bold text-[var(--text-main)] mb-0.5">ประวัติการชำระหนี้</span>
                        <div className="overflow-y-auto flex flex-col gap-1">
                          {(diary.deductions || [])
                            .filter(d => new Date(d.date).getFullYear() === selectedYear && (summarySelectedMonth === null || new Date(d.date).getMonth() === summarySelectedMonth))
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((d, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1.5 border-b border-dashed border-[var(--border)] last:border-0">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] font-semibold text-[var(--text-main)]">{d.pledgeName}</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {new Date(`${d.date}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                </div>
                                <span className="text-[12px] font-bold text-[var(--red)]">-{fmtMoney(d.amount)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RIGHT PAGE (YELLOW) ── */}
                <div className="flex-1 flex flex-col px-4 lg:px-6 py-6 overflow-hidden">
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto rounded-xl lg:p-4">

                    <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-2 mb-1 shrink-0">
                      <h3 className="text-[14px] font-bold text-[var(--text-main)]">ภาพรวม — ปี {selectedYear}</h3>
                    </div>

                    {/* Overview stat cards - Cardless */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 shrink-0 py-2 border-b border-dashed border-[var(--border)]">
                      {[
                        { label: "หนี้คงเหลือรวม", value: fmtMoney(summaryStats.totalDebt), color: "text-[var(--red)]", icon: "fi-sr-sack" },
                        { label: "ชำระแล้วรวม",   value: fmtMoney(summaryStats.totalPaid), color: "text-green-600",        icon: "fi-sr-check-circle" },
                        { label: "บันทึกทั้งหมด",  value: `${summaryStats.totalEntries} รายการ`, color: "text-[var(--accent-blue)]", icon: "fi-sr-book-bookmark" },
                        { label: "ปลดหนี้แล้ว",   value: `${summaryStats.paidOffPledges} รายการ`, color: "text-green-600", icon: "fi-sr-trophy" },
                      ].map(c => (
                        <div key={c.label} className="flex flex-col gap-0.5 px-2 border-l-2 border-[var(--border)]">
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold">
                            <i className={`fi ${c.icon}`}></i> {c.label}
                          </div>
                          <span className={`text-xl font-bold leading-tight ${c.color}`}>{c.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Overall progress bar */}
                    {summaryStats.totalOriginal > 0 && (
                      <div className="p-3 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl shrink-0">
                        <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5 font-semibold">
                          <span>ความคืบหน้าการปลดหนี้รวม</span>
                          <span>{Math.round((summaryStats.totalPaid / summaryStats.totalOriginal) * 100)}%</span>
                        </div>
                        <div className="w-full h-3 bg-[var(--bg-sub)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-blue)] to-green-500 transition-all"
                            style={{ width: `${Math.min(100, Math.round((summaryStats.totalPaid / summaryStats.totalOriginal) * 100))}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                          <span>เริ่มต้น {fmtMoney(summaryStats.totalOriginal)}</span>
                          <span>คงเหลือ {fmtMoney(summaryStats.totalDebt)}</span>
                        </div>
                      </div>
                    )}

                    {/* Dream text - Cardless */}
                    {diary.dreamText && (
                      <div className="py-2 shrink-0 border-b border-dashed border-[var(--border)]">
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px] mb-1">
                          <i className="fi fi-sr-star"></i> ภาพฝันวันเกษียณ
                        </div>
                        <p className="text-[12px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-amber-300">{diary.dreamText}</p>
                      </div>
                    )}

                    {/* Full pledge list */}
                    {(diary.pledges || []).length > 0 && (
                      <div className="flex flex-col gap-2 min-h-0">
                        <span className="text-[11px] font-bold text-[var(--text-main)]">รายการหนี้ทั้งหมด</span>
                        {diary.pledges.map(p => {
                          const original = p.originalAmount || p.amount;
                          const pct = original > 0 ? Math.min(100, Math.round(((original - p.amount) / original) * 100)) : 0;
                          const isDone = p.amount <= 0;
                          const pledgeDeds = (diary.deductions || [])
                            .filter(d => d.pledgeId === p.id && new Date(d.date).getFullYear() === selectedYear)
                            .reduce((s, d) => s + d.amount, 0);
                          return (
                            <div key={p.id} className={`py-2 border-b border-dashed ${isDone ? "border-green-300/70" : "border-[var(--border)]"} last:border-0`}>
                              <div className="flex justify-between items-start mb-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className={`text-[13px] font-bold ${isDone ? "text-green-600" : "text-[var(--text-main)]"}`}>{p.name}</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {fmtMoney(p.monthlyPayment || 0)}/เดือน · เป้าหมาย ปี {p.targetYear}
                                  </span>
                                  {pledgeDeds > 0 && (
                                    <span className="text-[10px] text-[var(--red)] font-semibold">ชำระปีนี้: {fmtMoney(pledgeDeds)}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className={`text-[13px] font-bold ${isDone ? "text-green-600" : "text-[var(--red)]"}`}>
                                    {isDone ? "ปลดหนี้แล้ว ✓" : fmtMoney(p.amount)}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)]">จาก {fmtMoney(original)}</span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-[var(--bg-sub)] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isDone ? "bg-green-500" : "bg-[var(--accent-blue)]"}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                                <span>จ่ายแล้ว {pct}%</span>
                                {!isDone && p.nextPaymentDate && (
                                  <span>ถัดไป {new Date(`${p.nextPaymentDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>

            ) : (
              /* ══ DIARY VIEW ══ */
              <>
                {/* ── LEFT PAGE ── */}
                <div className="flex-1 flex flex-col gap-4 px-4 lg:px-8 py-5 lg:py-7 overflow-y-auto border-b lg:border-b-0 lg:border-r border-black/[0.05]">

                  {/* Vision Board - Cardless */}
                  <div className="flex-1 flex flex-col gap-3 py-3 border-b border-dashed border-[var(--border)] shrink-0">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-main)] pb-1">
                      <i className="fi fi-sr-star text-amber-400"></i> ภาพฝันวันเกษียณ
                    </div>
                    <textarea
                      className="flex-1 w-full min-h-[90px] bg-transparent border-0 outline-none text-[var(--text-main)] text-sm leading-relaxed resize-none font-[var(--font-family)] placeholder:text-[var(--text-muted)]"
                      placeholder="อยากมีชีวิตหลังเกษียณแบบไหน? เช่น อยากเปิดคาเฟ่เล็กๆ หรือไปเที่ยวรอบโลก..."
                      value={dreamDraft !== null ? dreamDraft : diary.dreamText || ""}
                      onChange={e => setDreamDraft(e.target.value)}
                    />
                    <button onClick={handleSaveDream}
                      className={`self-end flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[13px] font-semibold border-0 cursor-pointer transition-opacity hover:opacity-80 ${dreamSaved ? "bg-[var(--green)]" : "bg-[var(--text-main)]"}`}>
                      {dreamSaved ? <><i className="fi fi-sr-check"></i> บันทึกสำเร็จ</> : "บันทึกความฝัน"}
                    </button>
                  </div>

                  {/* Debt Pledge - Cardless */}
                  <div className="flex flex-col gap-3 py-3 shrink-0">
                    <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-main)] pb-1">
                      <i className="fi fi-sr-document-signed text-[var(--red)]"></i> ปลดหนี้
                    </div>

                    <div className="flex flex-col gap-1">
                      {(!diary.pledges || diary.pledges.length === 0) ? (
                        <p className="text-[var(--text-muted)] text-[13px] text-center py-2">ยังไม่มีหนี้ที่ต้องกังวล หรือลองเพิ่มได้เลย</p>
                      ) : diary.pledges.map(p => (
                        <div key={p.id} className={`flex flex-col gap-2 py-3 border-b border-dashed ${p.amount <= 0 ? "border-green-300/60" : "border-[var(--border)]"} last:border-0`}>
                          {editingPledgeId === p.id ? (
                            <div className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">ชื่อหนี้</label>
                                  <input type="text" className={`${inputCls} mt-1`}
                                    value={editPledge.name ?? p.name}
                                    onChange={e => setEditPledge(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">ยอดคงเหลือ (฿)</label>
                                  <input type="number" className={`${inputCls} mt-1`} onWheel={e => e.currentTarget.blur()}
                                    value={editPledge.amount ?? p.amount}
                                    onChange={e => setEditPledge(prev => ({ ...prev, amount: Number(e.target.value) }))} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">ชำระ/เดือน (฿)</label>
                                  <input type="number" className={`${inputCls} mt-1`} onWheel={e => e.currentTarget.blur()}
                                    value={editPledge.monthlyPayment ?? (p.monthlyPayment || 0)}
                                    onChange={e => setEditPledge(prev => ({ ...prev, monthlyPayment: Number(e.target.value) }))} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">ปีที่จะปลดหมด</label>
                                  <input type="number" className={`${inputCls} mt-1`} onWheel={e => e.currentTarget.blur()}
                                    value={editPledge.targetYear ?? p.targetYear}
                                    onChange={e => setEditPledge(prev => ({ ...prev, targetYear: Number(e.target.value) }))} />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">วันที่จ่ายครั้งถัดไป</label>
                                  <input type="date" className={`${inputCls} mt-1`}
                                    value={editPledge.nextPaymentDate ?? (p.nextPaymentDate || "")}
                                    onChange={e => setEditPledge(prev => ({ ...prev, nextPaymentDate: e.target.value || undefined }))} />
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end">
                                <button className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-muted)] text-[12px] cursor-pointer hover:bg-[var(--bg-sub)] transition-colors"
                                  onClick={() => { setEditingPledgeId(null); setEditPledge({}); }}>ยกเลิก</button>
                                <button className="px-3 py-1.5 rounded-lg border-0 bg-[var(--accent-blue)] text-white text-[12px] font-bold cursor-pointer hover:opacity-90"
                                  onClick={() => handleSaveEditPledge(p)}>บันทึก</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-[var(--text-main)] text-[14px]">{p.name}</span>
                                  {p.amount > 0
                                    ? <span className="text-[13px] text-[var(--red)] font-bold">{fmtMoney(p.amount)}</span>
                                    : <span className="text-[12px] text-green-600 font-bold">✓ ปลดหนี้แล้ว!</span>
                                  }
                                  {(p.monthlyPayment || 0) > 0 && (
                                    <span className="text-[11px] text-[var(--text-muted)]">ชำระ {fmtMoney(p.monthlyPayment || 0)}/เดือน</span>
                                  )}
                                  <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-sub)] px-2 py-0.5 rounded-full self-start">เป้าหมายจบ: ปี {p.targetYear}</span>
                                  {p.nextPaymentDate && p.amount > 0 && (
                                    <span className="text-[11px] text-[var(--accent-blue)] bg-blue-50/60 px-2 py-0.5 rounded-full self-start flex items-center gap-1">
                                      <i className="fi fi-sr-calendar text-[9px]"></i>
                                      จ่ายครั้งถัดไป: {new Date(`${p.nextPaymentDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <button className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-0 text-[var(--accent-blue)] cursor-pointer hover:bg-[var(--bg-sub)] transition-colors"
                                    onClick={() => { setEditingPledgeId(p.id); setEditPledge({}); }} title="แก้ไข">
                                    <i className="fi fi-sr-edit text-sm"></i>
                                  </button>
                                  <button className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-0 text-[var(--text-muted)] cursor-pointer hover:text-[var(--red)] hover:bg-[var(--bg-sub)] transition-colors"
                                    onClick={() => handleDeletePledge(p.id)} title="ลบ">
                                    <i className="fi fi-sr-trash text-sm"></i>
                                  </button>
                                </div>
                              </div>
                              <PledgeProgressBar p={p} />
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add pledge form */}
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-[var(--bg-main)]/50 rounded-xl border border-dashed border-[var(--border)]">
                      <div className="col-span-2 flex items-center mb-1">
                        <span className="text-[12px] font-bold text-[var(--text-main)]"><i className="fi fi-sr-add"></i> เพิ่มรายการหนี้ใหม่</span>
                      </div>
                      <input type="text" placeholder="ชื่อหนี้ (เช่น ผ่อนรถ)" className={`col-span-2 ${inputCls}`}
                        value={newPledgeName} onChange={e => setNewPledgeName(e.target.value)} />
                      <input type="number" placeholder="ยอดหนี้ (฿)" className={inputCls}
                        value={newPledgeAmount} onChange={e => setNewPledgeAmount(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="number" placeholder="ชำระ/เดือน (฿)" className={inputCls}
                        value={newPledgeMonthly} onChange={e => setNewPledgeMonthly(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="number" placeholder="ปีปลดหมด" className={inputCls}
                        value={newPledgeYear} onChange={e => setNewPledgeYear(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="date" title="วันที่จ่ายครั้งถัดไป (หักอัตโนมัติ)" className={`${inputCls} ${!newPledgeDate ? "text-[var(--text-muted)] [&::-webkit-calendar-picker-indicator]:opacity-40" : ""}`}
                        value={newPledgeDate} onChange={e => setNewPledgeDate(e.target.value)} />
                      <button className="col-span-2 px-3 py-2 rounded-lg border-0 bg-[var(--accent-dark)] text-white text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity mt-1"
                        onClick={handleAddPledge}>เพิ่มคำปฏิญาณ</button>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT PAGE ── */}
                <div className="diary-page-lined flex-1 flex flex-col px-4 lg:px-8 py-5 lg:py-7 gap-0 overflow-hidden relative">
                  {/* Paper background lines effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #000 31px, #000 32px)', backgroundPositionY: '58px' }}></div>

                  {/* Day navigation header */}
                  <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-3 mb-4 shrink-0">
                    <button
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sub)] hover:text-[var(--accent-blue)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                      onClick={() => setSelectedDayIndex(i => i + 1)}
                      disabled={selectedDayIndex >= daysInPeriod.length - 1} title="วันก่อนหน้า">
                      <i className="fi fi-sr-angle-left flex items-center text-xs leading-none"></i>
                    </button>
                    <div className="flex-1 text-center min-w-0 relative group">
                      <div className="text-[15px] font-bold text-[var(--text-main)] truncate leading-tight flex items-center justify-center gap-1 cursor-pointer">
                        {formattedDay}
                        {isCurrentDay && (
                          <span className="text-[11px] font-semibold bg-[var(--accent-blue)] text-white px-2 py-0.5 rounded-full align-middle ml-1">วันนี้</span>
                        )}
                        <i className="fi fi-sr-calendar text-[12px] text-[var(--accent-blue)] opacity-60 group-hover:opacity-100 lg:hidden ml-1"></i>
                      </div>
                      <input type="date" className="absolute inset-0 opacity-0 cursor-pointer lg:hidden"
                        value={currentDayStr}
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) {
                            handleYearSelect(d.getFullYear());
                            setSelectedMonth(d.getMonth());
                          }
                        }}
                      />
                      {daysInPeriod.length > 1 && (
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {MONTH_FULL[selectedMonth]} {selectedYear} · หน้า {selectedDayIndex + 1}/{daysInPeriod.length}
                        </div>
                      )}
                    </div>
                    <button
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sub)] hover:text-[var(--accent-blue)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                      onClick={() => setSelectedDayIndex(i => i - 1)}
                      disabled={selectedDayIndex <= 0} title="วันถัดไป">
                      <i className="fi fi-sr-angle-right flex items-center text-xs leading-none"></i>
                    </button>
                  </div>

                  {/* Scrollable entries */}
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
                    {entriesForCurrentDay.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-2 pb-10">
                        <i className="fi fi-sr-book-open-cover text-4xl opacity-40"></i>
                        <p className="text-sm">ยังไม่มีบันทึกในวันนี้</p>
                        <p className="text-xs">เริ่มเขียนไดอารี่วันนี้เลย!</p>
                      </div>
                    ) : (
                      entriesForCurrentDay.slice().reverse().map(entry => (
                        <div key={entry.id} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {new Date(entry.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                            </span>
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent border-0 text-[var(--accent-blue)] cursor-pointer hover:bg-blue-50/60 transition-colors disabled:opacity-40"
                              onClick={() => handleAskAdvice(entry.id)} disabled={askingEntryId === entry.id} title="ขอคำแนะนำ">
                              <i className={`fi ${askingEntryId === entry.id ? "fi-sr-spinner fa-spin" : "fi-sr-sparkles"} text-xs`}></i>
                            </button>
                          </div>
                          <div className="text-[15px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap px-1 py-1 font-medium font-serif">
                            {entry.text}
                          </div>
                          {entry.aiComment && (
                            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/50">
                              <div className="flex items-center gap-2 text-[var(--accent-blue)] font-semibold text-xs mb-1.5">
                                <i className="fi fi-sr-robot"></i> คำแนะนำจากเพื่อนรู้งาน
                              </div>
                              <p className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                                {entry.aiComment.replace(/[*#]/g, "")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {adviceForDay ? (
                      <div className="mt-1 p-4 rounded-xl bg-blue-50/60 border border-blue-200/50">
                        <div className="flex items-center gap-2 text-[var(--accent-blue)] font-semibold text-[13px] mb-2">
                          <i className="fi fi-sr-robot"></i> คำแนะนำจากเพื่อนรู้งาน
                        </div>
                        <p className="text-[13px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">{adviceForDay.replace(/[*#]/g, "")}</p>
                      </div>
                    ) : entriesForCurrentDay.length > 0 && (
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--accent-blue)] bg-transparent text-[var(--accent-blue)] text-[13px] font-semibold cursor-pointer mt-1 hover:bg-blue-50/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleAskAdvice()} disabled={isAskingAI}>
                        <i className="fi fi-sr-sparkles"></i>
                        {isAskingAI ? "กำลังวิเคราะห์คำแนะนำ..." : "ขอคำแนะนำจากเพื่อนรู้งาน"}
                      </button>
                    )}
                  </div>

                  {/* New entry input */}
                  <div className="flex flex-col gap-2 border-t border-dashed border-[var(--border)] pt-3 mt-3 shrink-0">
                    <div className="relative">
                      <textarea
                        className="w-full min-h-[72px] pl-3 pr-12 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-main)] text-sm font-[var(--font-family)] leading-relaxed resize-none outline-none focus:border-[var(--accent-blue)] transition-colors placeholder:text-[var(--text-muted)]"
                        placeholder={isCurrentDay ? "บันทึกภาระ ค่าใช้จ่าย หรือความสำเร็จของวันนี้..." : `บันทึกย้อนหลัง — ${formattedDay}`}
                        value={newEntryText} onChange={e => setNewEntryText(e.target.value)} />
                      <button
                        className="absolute right-2 bottom-2 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-blue)] text-white border-0 cursor-pointer hover:bg-[var(--accent-blue-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handlePostEntry} disabled={!newEntryText.trim()} title="จรดปากกาเขียน">
                        <i className="fi fi-sr-paper-plane mt-0.5 -ml-0.5"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── MONTH TABS ── */}
          {isBookOpen && (
            <div className="hidden lg:flex flex-col overflow-visible items-start -ml-[2px] z-[5] gap-1.5 py-4">
              {Array.from({ length: 12 }, (_, i) => i).map(month => {
                const isActive = selectedView === "diary" && selectedMonth === month;
                const hasEntries = monthsWithEntries.has(month);
                return (
                  <button key={month} title={MONTH_FULL[month]}
                    onClick={() => { setSelectedMonth(month); setSelectedView("diary"); }}
                    className={[
                      "tab-responsive relative flex-1 lg:flex-none flex items-center justify-center whitespace-nowrap",
                      "min-h-[40px] lg:min-h-0 min-w-[60px] lg:min-w-[32px] px-3 lg:px-2 py-2 lg:py-1.5",
                      "rounded-t-lg lg:rounded-t-none lg:rounded-r-[8px] border lg:border-l-0 border-[var(--border)]",
                      "text-[13px] lg:text-[11px] font-semibold cursor-pointer transition-all duration-150",
                      hasEntries ? (isActive ? "tab-has-dot tab-active-dot" : "tab-has-dot") : "",
                      isActive
                        ? "bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-[0_3px_8px_rgba(63,114,175,0.28)] lg:shadow-[3px_0_8px_rgba(63,114,175,0.28)] lg:translate-x-[3px] z-[2]"
                        : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--bg-sub)] hover:text-[var(--accent-blue)] lg:hover:translate-x-[2px]",
                    ].join(" ")}>
                    {MONTH_SHORT[month]}
                  </button>
                );
              })}
            </div>
          )}

        </div>{/* end book row */}
      </div>{/* end book area */}
    </div>
  );
}
