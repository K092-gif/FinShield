"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import InfoTooltip from "./InfoTooltip";
import "../ui/RetirementDiary.css";

/* ─── Types ──────────────────────────────────────────────── */
type Pledge = {
  id: string;
  name: string;
  amount: number;           // remaining balance
  originalAmount: number;   // set on creation, never changes
  monthlyPayment: number;
  targetYear: number;
  paymentDay?: number;      // 1-31: day of each month to deduct
  nextPaymentDate?: string; // YYYY-MM-DD — next auto-deduction date
};

type JournalEntry = { id: string; date: string; text: string; aiComment?: string; };

type Deduction = {
  pledgeId: string; pledgeName: string; amount: number; date: string; // YYYY-MM-DD
};

type DiaryState = {
  dreamText: string;
  petName?: string;
  petEncouragement?: string;
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

/**
 * Calculates the payment date for a specific year and month, clamped to the days in that month.
 */
const getPaymentDateForMonth = (year: number, month: number, paymentDay: number): string => {
  const maxDays = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(Math.max(1, paymentDay), maxDays);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(actualDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

/**
 * Calculates the next upcoming payment date from today (or from a given date).
 */
const calculateNextPaymentDate = (paymentDay: number, fromDate: Date = new Date()): string => {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth();
  const todayDate = fromDate.getDate();

  // If today is past the paymentDay of this month, the next payment is next month
  let targetYear = y;
  let targetMonth = m;
  if (todayDate > paymentDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  return getPaymentDateForMonth(targetYear, targetMonth, paymentDay);
};

/**
 * Processes recurring monthly deductions for each pledge on its designated paymentDay.
 */
const runDeductions = (pledgesList: Pledge[], existingDeductions: Deduction[], todayDate: Date) => {
  const todayMid = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 23, 59, 59);
  const updatedPledges: Pledge[] = JSON.parse(JSON.stringify(pledgesList || []));
  const newDeductions: Deduction[] = [...(existingDeductions || [])];
  const deductionKeys = new Set(newDeductions.map(d => `${d.pledgeId}_${d.date}`));
  let hasChanges = false;

  const today = new Date();

  updatedPledges.forEach((pledge, idx) => {
    // 1. Recover or determine paymentDay (supports legacy pledges having nextPaymentDate)
    let pDay = pledge.paymentDay;
    if (!pDay && pledge.nextPaymentDate) {
      const parsed = new Date(`${pledge.nextPaymentDate}T12:00:00`);
      if (!isNaN(parsed.getTime())) {
        pDay = parsed.getDate();
        updatedPledges[idx].paymentDay = pDay;
        hasChanges = true;
      }
    }

    if (!pDay || updatedPledges[idx].amount <= 0 || !(pledge.monthlyPayment > 0)) return;

    // 2. If nextPaymentDate is missing, initialize it
    if (!updatedPledges[idx].nextPaymentDate) {
      updatedPledges[idx].nextPaymentDate = calculateNextPaymentDate(pDay, today);
      hasChanges = true;
    }

    let payDate = new Date(`${updatedPledges[idx].nextPaymentDate}T00:00:00`);
    if (isNaN(payDate.getTime())) {
      payDate = new Date(`${calculateNextPaymentDate(pDay, today)}T00:00:00`);
    }

    // 3. Process every due monthly deduction up to today
    while (payDate <= todayMid && updatedPledges[idx].amount > 0) {
      const dateStr = toLocalDate(payDate);
      const key = `${pledge.id}_${dateStr}`;

      if (!deductionKeys.has(key)) {
        const deductAmt = Math.min(pledge.monthlyPayment, updatedPledges[idx].amount);
        updatedPledges[idx].amount = Math.max(0, updatedPledges[idx].amount - deductAmt);
        newDeductions.push({
          pledgeId: pledge.id,
          pledgeName: pledge.name,
          amount: deductAmt,
          date: dateStr,
        });
        deductionKeys.add(key);
        hasChanges = true;
      }

      // Advance to next month's paymentDay
      let nextY = payDate.getFullYear();
      let nextM = payDate.getMonth() + 1;
      if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      }
      const nextDateStr = getPaymentDateForMonth(nextY, nextM, pDay);
      payDate = new Date(`${nextDateStr}T00:00:00`);
      updatedPledges[idx].nextPaymentDate = nextDateStr;
      hasChanges = true;
    }
  });

  return { updatedPledges, newDeductions, hasChanges };
};

type PetEvent = {
  title: string;
  mission: string;
  reward: string;
  keywords: string[];
  hint: string;
};

const PET_EVENTS: PetEvent[] = [
  {
    title: "เริ่มต้นปีอย่างมีเป้าหมาย",
    mission: "เขียนความฝันหรือเป้าหมายการเงิน",
    reward: "10 คะแนน",
    keywords: ["เป้าหมาย", "ความฝัน", "ฝัน", "วางแผน", "เริ่มต้น", "ตั้งใจ", "แพลน", "plan", "goal"],
    hint: "เป้าหมาย, ความฝัน, วางแผน, แพลน",
  },
  {
    title: "เดือนแห่งการรู้จักตัวเอง",
    mission: "บันทึกสิ่งที่ทำได้ดีและนิสัยการเงิน",
    reward: "10 คะแนน",
    keywords: ["ดี", "ภูมิใจ", "สำเร็จ", "นิสัย", "ตัวเอง", "วินัย", "ปรับปรุง", "เรียนรู้"],
    hint: "ดี, ภูมิใจ, วินัย, นิสัย",
  },
  {
    title: "ภารกิจเงินสำรอง",
    mission: "ทบทวนแผนเงินสำรองฉุกเฉิน",
    reward: "10 คะแนน",
    keywords: ["ฉุกเฉิน", "สำรอง", "ปลอดภัย", "เผื่อ", "เงินก้อน", "อุ่นใจ", "ความเสี่ยง", "emergency"],
    hint: "ฉุกเฉิน, สำรอง, ปลอดภัย, อุ่นใจ",
  },
  {
    title: "ฤดูวางแผนภาษี",
    mission: "เขียนสิ่งที่อยากเตรียมเรื่องภาษีและลดหย่อน",
    reward: "10 คะแนน",
    keywords: ["ภาษี", "ลดหย่อน", "คืนภาษี", "ssf", "rmf", "ltf", "ประกัน", "ยื่นภาษี", "tax"],
    hint: "ภาษี, ลดหย่อน, ประกัน, tax",
  },
  {
    title: "รีเซ็ตค่าใช้จ่าย",
    mission: "บันทึกค่าใช้จ่ายที่อยากลดหรือประหยัด",
    reward: "10 คะแนน",
    keywords: ["ลด", "ค่าใช้จ่าย", "ประหยัด", "ฟุ่มเฟือย", "ตัด", "คุมงบ", "รายจ่าย", "expense"],
    hint: "ลด, ค่าใช้จ่าย, ประหยัด, รายจ่าย",
  },
  {
    title: "ครึ่งปีแห่งวินัย",
    mission: "สรุปความคืบหน้าการเงินครึ่งปี",
    reward: "10 คะแนน",
    keywords: ["ครึ่งปี", "วินัย", "คืบหน้า", "ทบทวน", "ติดตาม", "สม่ำเสมอ", "ผ่านมา", "6 เดือน"],
    hint: "ครึ่งปี, วินัย, คืบหน้า, ทบทวน",
  },
  {
    title: "เดือนแห่งการปลดหนี้",
    mission: "เขียนเรื่องการลดหนี้หรือจัดการหนี้",
    reward: "10 คะแนน",
    keywords: ["หนี้", "คืน", "ผ่อน", "ปลดหนี้", "ดอกเบี้ย", "จ่ายหนี้", "หมดหนี้", "debt"],
    hint: "หนี้, ผ่อน, ปลดหนี้, ดอกเบี้ย",
  },
  {
    title: "เดือนแห่งการออม",
    mission: "บันทึกการออมเงินหรือการลงทุน",
    reward: "10 คะแนน",
    keywords: ["ออม", "เก็บเงิน", "ฝาก", "สะสม", "กองทุน", "ลงทุน", "หยอดกระปุก", "save"],
    hint: "ออม, เก็บเงิน, สะสม, ลงทุน",
  },
  {
    title: "วางแผนปลายปี",
    mission: "ทบทวนเป้าหมายก่อนสิ้นปี",
    reward: "10 คะแนน",
    keywords: ["ปลายปี", "สิ้นปี", "เป้าหมาย", "ทบทวน", "แผน", "สรุป", "เตรียมตัว", "ไตรมาส"],
    hint: "เป้าหมาย, สิ้นปี, ปลายปี, ทบทวน, แผน",
  },
  {
    title: "เก็บเกี่ยวความสำเร็จ",
    mission: "เขียนเรื่องที่ภูมิใจหรือทำได้สำเร็จ",
    reward: "10 คะแนน",
    keywords: ["สำเร็จ", "ภูมิใจ", "ชนะ", "ผลลัพธ์", "เป้า", "งอกเงย", "กำไร", "ก้าวหน้า"],
    hint: "สำเร็จ, ภูมิใจ, ผลลัพธ์, ก้าวหน้า",
  },
  {
    title: "ขอบคุณตัวเอง",
    mission: "บันทึกบทเรียนทางการเงิน 1 ข้อ",
    reward: "10 คะแนน",
    keywords: ["ขอบคุณ", "บทเรียน", "เรียนรู้", "พัฒนา", "ตัวเอง", "เข้าใจ", "ประสบการณ์", "เตือนใจ"],
    hint: "ขอบคุณ, บทเรียน, เรียนรู้, ประสบการณ์",
  },
  {
    title: "ปิดปีอย่างอบอุ่น",
    mission: "เขียนจดหมายถึงตัวเองในปีหน้า",
    reward: "10 คะแนน",
    keywords: ["ปีหน้า", "สิ้นปี", "ปิดปี", "สวัสดี", "จดหมาย", "อนาคต", "ปีใหม่", "พร้อม"],
    hint: "ปีหน้า, ปีใหม่, สิ้นปี, อนาคต",
  },
];

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
  const [newPledgeDay,     setNewPledgeDay]     = useState(""); // 1-31: day of each month to deduct
  const [editingPledgeId,  setEditingPledgeId]  = useState<string | null>(null);
  const [editPledge,       setEditPledge]       = useState<Partial<Pledge>>({});


  /* journal */
  const [newEntryText,   setNewEntryText]   = useState("");
  const [isAskingAI,     setIsAskingAI]     = useState(false);
  const [isEditingPetName, setIsEditingPetName] = useState(false);
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

  // Digital-pet progress is based on unique days written, not raw entries.
  // This rewards consistency while allowing users to write more than once a day.
  const diaryDays = useMemo(() => new Set([
    ...(diary.entries || []).map(entry => toLocalDate(new Date(entry.date))),
  ]), [diary.entries]);
  const currentPetEvent = PET_EVENTS[currentRealMonth];
  const monthDiaryDays = new Set([
    ...(diary.entries || [])
    .filter(entry => {
      const date = new Date(entry.date);
      return date.getFullYear() === currentRealYear && date.getMonth() === currentRealMonth;
    })
    .map(entry => toLocalDate(new Date(entry.date))),
  ]);
  let currentStreak = 0;
  const streakDate = new Date();
  while (diaryDays.has(toLocalDate(streakDate))) {
    currentStreak += 1;
    streakDate.setDate(streakDate.getDate() - 1);
  }
  // ── Monthly Theme Event Detection ──
  // Track unique days in current month where at least one entry matches the current event's theme keywords
  const themeDaysThisMonth = useMemo(() => {
    const keywords = currentPetEvent.keywords || [];
    const matched = new Set<string>();
    (diary.entries || []).forEach(entry => {
      const d = new Date(entry.date);
      if (d.getFullYear() === currentRealYear && d.getMonth() === currentRealMonth) {
        const text = (entry.text || "").toLowerCase();
        const matches = keywords.some(kw => text.includes(kw.toLowerCase()));
        if (matches) matched.add(toLocalDate(d));
      }
    });
    return matched;
  }, [diary.entries, currentPetEvent, currentRealYear, currentRealMonth]);

  const themeDaysCount = themeDaysThisMonth.size;
  const isMonthlyThemeDone = themeDaysCount >= 3;

  const monthlyMission = {
    label: currentPetEvent.mission,
    points: 10,
    done: isMonthlyThemeDone,
    progress: Math.min(3, themeDaysCount),
    target: 3,
  };
  const missions = [
    { label: "เขียนไดอารี่วันนี้", points: 3, done: diaryDays.has(todayStr) },
    { label: "เขียนให้ได้ 3 วันในเดือนนี้", points: 5, done: monthDiaryDays.size >= 3 },
    { label: "ตั้งความฝันทางการเงิน", points: 8, done: Boolean(diary.dreamText?.trim()) },
  ];
  const missionCount = missions.filter(mission => mission.done).length;

  // ── Cumulative pet score (never decreases from month/day resets) ──
  // 1) 2 pts per unique diary day (permanent, grows forever)
  const diaryScore = diaryDays.size * 2;
  // 2) 10 pts per completed monthly theme event (>= 3 theme days in that month)
  const completedThemeMonthsCount = useMemo(() => {
    const monthBuckets = new Map<string, { month: number; matchedDays: Set<string> }>();
    (diary.entries || []).forEach(entry => {
      const d = new Date(entry.date);
      const m = d.getMonth();
      const key = `${d.getFullYear()}-${m}`;
      if (!monthBuckets.has(key)) {
        monthBuckets.set(key, { month: m, matchedDays: new Set() });
      }
      const eventKeywords = PET_EVENTS[m]?.keywords || [];
      const text = (entry.text || "").toLowerCase();
      if (eventKeywords.some(kw => text.includes(kw.toLowerCase()))) {
        monthBuckets.get(key)!.matchedDays.add(toLocalDate(d));
      }
    });
    return [...monthBuckets.values()].filter(bucket => bucket.matchedDays.size >= 3).length;
  }, [diary.entries]);
  const monthlyThemeBonus = completedThemeMonthsCount * 10;
  // 3) 5 pts per completed month with 3+ unique diary days (consistency bonus)
  const completedMonthsCount = useMemo(() => {
    const monthBuckets = new Map<string, Set<string>>();
    (diary.entries || []).forEach(entry => {
      const d = new Date(entry.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthBuckets.has(key)) monthBuckets.set(key, new Set());
      monthBuckets.get(key)!.add(toLocalDate(d));
    });
    return [...monthBuckets.values()].filter(days => days.size >= 3).length;
  }, [diary.entries]);
  const generalMonthlyBonus = completedMonthsCount * 5;
  // 4) 8 pts for setting a financial dream (persistent while set)
  const dreamBonus = diary.dreamText?.trim() ? 8 : 0;
  // 5) 3 pts bonus for writing today (daily incentive)
  const todayBonus = diaryDays.has(todayStr) ? 3 : 0;
  // Total cumulative score
  const petScore = diaryScore + monthlyThemeBonus + generalMonthlyBonus + dreamBonus + todayBonus;
  const petMilestones = [0, 10, 25, 45, 75, 115, 170, 240, 330];
  const petLevel = petMilestones.reduce(
    (level, milestone, index) => petScore >= milestone ? index : level,
    0
  );
  const petCurrentGoal = petMilestones[petLevel];
  const petNextGoal = petMilestones[petLevel + 1] ?? petCurrentGoal;
  const petProgress = petNextGoal > petCurrentGoal
    ? Math.min(100, Math.round(((petScore - petCurrentGoal) / (petNextGoal - petCurrentGoal)) * 100))
    : 100;
  const petNames = ["เมล็ดเงิน", "เจ้าตัวจิ๋ว", "นักออมฝึกหัด", "นักบันทึก", "ผู้พิทักษ์วินัย", "นักวางแผน", "ผู้สร้างอิสรภาพ", "มาสเตอร์การเงิน", "ตำนานการเงิน"];
  const petAccessories = ["✦", "♡", "฿", "📔", "🛡️", "📊", "✦", "👑", "✧฿✧"];
  const petName = petNames[petLevel];
  const [previewPetLevel, setPreviewPetLevel] = useState<number | null>(null);
  const isPreviewingPet = previewPetLevel !== null;
  const displayedPetLevel = previewPetLevel ?? petLevel;
  const displayedDayCount = diaryDays.size;

  const userPetName = diary.petName?.trim() || petName;
  const displayedPetName = isPreviewingPet ? petNames[displayedPetLevel] : userPetName;
  const petHappiness = Math.min(100, 45 + currentStreak * 8 + missionCount * 10);
  const petEnergy = Math.min(100, 35 + (diaryDays.has(todayStr) ? 35 : 0) + missionCount * 10);

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

    // 2. Auto-deduction: check paymentDay for each pledge and deduct every month on that day
    const { updatedPledges, newDeductions, hasChanges } = runDeductions(
      diary.pledges || [],
      diary.deductions || [],
      today
    );

    setDiary((prev: DiaryState) => ({
      ...prev,
      lastVisited: today.toISOString(),
      dailyAdvice: prev.dailyAdvice || {},
      deductions: hasChanges ? newDeductions : (prev.deductions || []),
      pledges: hasChanges ? updatedPledges : (prev.pledges || []),
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
    const day = newPledgeDay ? Math.min(31, Math.max(1, Number(newPledgeDay))) : 1;
    const initialNextDate = calculateNextPaymentDate(day, new Date());

    const newPledgeItem: Pledge = {
      id: Date.now().toString(),
      name: newPledgeName,
      amount: amt,
      originalAmount: amt,
      monthlyPayment: Number(newPledgeMonthly) || 0,
      targetYear: Number(newPledgeYear),
      paymentDay: day,
      nextPaymentDate: initialNextDate,
    };

    setDiary((prev: DiaryState) => {
      const { updatedPledges, newDeductions } = runDeductions(
        [...(prev.pledges || []), newPledgeItem],
        prev.deductions || [],
        new Date()
      );
      return {
        ...prev,
        pledges: updatedPledges,
        deductions: newDeductions,
      };
    });

    setNewPledgeName(""); setNewPledgeAmount(""); setNewPledgeMonthly("");
    setNewPledgeYear(""); setNewPledgeDay("");
  };

  const handleDeletePledge = (id: string) =>
    setDiary((prev: DiaryState) => ({
      ...prev, pledges: (prev.pledges || []).filter(p => p.id !== id),
    }));

  const handleSaveEditPledge = (p: Pledge) => {
    const updatedDay = editPledge.paymentDay ?? p.paymentDay ?? (p.nextPaymentDate ? new Date(`${p.nextPaymentDate}T12:00:00`).getDate() : 1);
    const updatedNextDate = editPledge.paymentDay
      ? calculateNextPaymentDate(editPledge.paymentDay, new Date())
      : (p.nextPaymentDate || (updatedDay ? calculateNextPaymentDate(updatedDay, new Date()) : undefined));

    setDiary((prev: DiaryState) => {
      const newPledges = (prev.pledges || []).map(item => item.id === p.id ? {
        ...item,
        name:            editPledge.name            ?? item.name,
        amount:          editPledge.amount           ?? item.amount,
        originalAmount:  item.originalAmount         || (editPledge.amount ?? item.amount),
        monthlyPayment:  editPledge.monthlyPayment   ?? (item.monthlyPayment || 0),
        targetYear:      editPledge.targetYear       ?? item.targetYear,
        paymentDay:      updatedDay,
        nextPaymentDate: updatedNextDate,
      } : item);

      const { updatedPledges, newDeductions } = runDeductions(newPledges, prev.deductions || [], new Date());
      return {
        ...prev,
        pledges: updatedPledges,
        deductions: newDeductions,
      };
    });

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

  const handlePetEncouragement = async () => {
    setIsAskingAI(true);
    try {
      const recentText = (diary.entries || []).slice(0, 3).map(entry => entry.text).join("\n---\n");
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "diary_cheer",
          messages: [{ role: "user", content: `ช่วยเขียนข้อความให้กำลังใจสั้นๆ ในเสียงของสัตว์เลี้ยงการเงินชื่อ ${userPetName} ให้เจ้าของที่เขียนไดอารี่แล้ว ${displayedDayCount} วัน สะสม ${petScore} คะแนน มี streak ${currentStreak} วัน และทำภารกิจสำเร็จ ${missionCount}/3 ภารกิจ ข้อความอบอุ่น เป็นธรรมชาติ ไม่เกิน 2 ประโยค ไม่ต้องใช้ bullet\nบันทึกล่าสุด:\n${recentText}` }],
          context: { petName: userPetName, diaryDays: displayedDayCount, petScore, streak: currentStreak, happiness: petHappiness, energy: petEnergy },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) setDiary((prev: DiaryState) => ({ ...prev, petEncouragement: data.reply }));
      }
    } catch (err) {
      console.error("Pet encouragement failed:", err);
    } finally {
      setIsAskingAI(false);
    }
  };

  useEffect(() => {
    if (selectedView === "summary" && !diary.petEncouragement && !isAskingAI) {
      void handlePetEncouragement();
    }
  }, [selectedView, diary.petEncouragement]);

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
            : (p.paymentDay || p.nextPaymentDate) && (
              <span>
                {p.paymentDay ? `ทุกวันที่ ${p.paymentDay} ` : ''}
                {p.nextPaymentDate ? `(ครั้งถัดไป ${new Date(`${p.nextPaymentDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" })})` : ''}
              </span>
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
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-sub)] text-sm text-[var(--text-main)]">
          <i className="fi fi-sr-heart text-xl text-[var(--accent-blue)] shrink-0"></i>
          <div><strong>คิดถึงจังเลย!</strong>{" "}เป็นยังไงบ้าง หากมีเรื่องไม่สบายใจสามารถเข้ามาเขียนไดอารี่ได้นะ ยุ่งมากขอให้เงินมากตามนะ 💙</div>
        </div>
      )}

      {/* Book Area */}
      <div className="flex flex-col w-full">

        {/* Year tabs + สรุป tab — Serene Pulse Style */}
        {isBookOpen && (
          <div className="diary-top-tabs flex items-end gap-1.5 mb-[-1px] z-10 pl-2">
            {availableYears.map(year => {
              const isActive = selectedView === "diary" && selectedYear === year;
              return (
                <button key={year} onClick={() => handleYearSelect(year)} title={`ปี ${year}`}
                  className={`px-5 py-2.5 text-[13px] font-bold rounded-t-2xl cursor-pointer transition-all border border-b-0 ${
                    isActive
                      ? "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] shadow-md"
                      : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border2)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)]"
                  }`}>
                  {year}
                </button>
              );
            })}
            <button 
              onClick={() => { setSelectedView("summary"); setIsBookOpen(true); }}
              className={`px-5 py-2.5 text-[13px] font-bold rounded-t-2xl cursor-pointer transition-all border border-b-0 flex items-center gap-1.5 ${
                selectedView === "summary"
                  ? "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] shadow-md"
                  : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border2)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)]"
              }`}
            >
              <i className="fi fi-sr-chart-pie-alt text-[var(--accent-warm)]"></i> สรุป
            </button>
          </div>
        )}

        {/* Mobile Month Navigation Bar */}
        {isBookOpen && selectedView === "diary" && (
          <div className="flex lg:hidden overflow-x-auto gap-1.5 py-2 px-1 mb-1 border-b border-[var(--border2)] bg-[var(--card)]/40 rounded-xl">
            {Array.from({ length: 12 }, (_, i) => i).map(month => {
              const isActive = selectedMonth === month;
              const hasEntries = monthsWithEntries.has(month);
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] shadow-sm"
                      : "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border2)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)]"
                  } ${hasEntries && !isActive ? "border-emerald-500/60 font-extrabold text-emerald-700 dark:text-emerald-400" : ""}`}
                >
                  {MONTH_SHORT[month]}
                  {hasEntries && !isActive && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle"></span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Book row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-0">

          {/* ── THE BOOK ── */}
          <div className={`diary-book flex flex-col lg:flex-row bg-[#fffdf5] dark:bg-[#201f1a] border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)] min-h-[680px] lg:max-h-[82vh] max-h-none ${!isBookOpen ? "w-full max-w-[500px] mx-auto cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 diary-book-closed" : "flex-1 w-full diary-book-open"}`}
            onClick={() => { if (!isBookOpen) setIsBookOpen(true); }}
          >

            {!isBookOpen ? (
              /* ══ COVER VIEW ══ */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1e1c10] dark:bg-[#333024] text-white relative overflow-hidden rounded-md shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)] group">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/20 border-r border-black/30 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.2)]"></div> {/* Book Spine */}
                
                <div className="flex flex-col items-center gap-4 z-10 p-10 transform transition-all duration-300">
                  <h1 className="text-[2.5rem] font-bold text-white mb-2 drop-shadow-md flex items-center gap-3">
                    ไดอารี่เกษียณสุข
                  </h1>
                  <p className="text-[#f7f0de] text-[15px] font-medium drop-shadow text-center max-w-md leading-relaxed opacity-90">
                    บันทึกเรื่องราวในแต่ละวัน สารภาพหนี้สิน และติดตามก้าวเล็กๆ สู่ความอิสระ
                  </p>
                </div>
              </div>
            ) : selectedView === "summary" ? (
              /* ══ SUMMARY + PET VIEW (Merged — Serene Pulse Style) ══ */
              <>
                {/* ── LEFT PAGE (SUMMARY CALENDAR, AI EVAL, STATS) ── */}
                <div className="flex-1 flex flex-col px-4 lg:px-6 py-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-black/[0.05] space-y-5">
                  
                  {/* Section Header */}
                  <div className="pb-2">
                    <h3 className="text-[15px] font-extrabold text-[var(--text-main)] m-0 flex items-center gap-2">
                      <i className="fi fi-sr-chart-histogram text-[var(--accent-warm)]"></i>
                      บันทึกรายเดือน — ปี {selectedYear}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] m-0 mt-1">ภาพรวมกิจกรรมบันทึกและยอดชำระหนี้</p>
                  </div>

                  {/* Monthly grid */}
                  <div className="grid grid-cols-6 gap-2">
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
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border cursor-pointer transition-all ${summarySelectedMonth === i ? "bg-[var(--card-yellow)] border-[var(--card-yellow-hover)] shadow-sm" : "border-[var(--border2)] bg-[var(--card)] hover:border-[var(--card-yellow-hover)] hover:bg-[var(--bg-sub)]"}`}>
                          <div className="w-full h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${summarySelectedMonth === i ? "bg-[var(--accent-dark)]" : "bg-[var(--green)]"}`}
                              style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold ${summarySelectedMonth === i ? "text-[var(--accent-dark)]" : "text-[var(--text-muted)]"}`}>{name}</span>
                          <span className={`text-xs font-black ${count > 0 ? "text-[var(--text-main)]" : "text-[var(--text-light)]"}`}>{count}</span>
                          {deducted > 0
                            ? <span className="text-[9px] font-bold text-[var(--red)]">-{fmtMoney(deducted)}</span>
                            : <span className="text-[9px] text-transparent">-</span>
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
                      <div className="p-4 bg-[var(--card)] rounded-2xl border border-[var(--border2)] space-y-2.5 shadow-[var(--shadow-sm)]">
                        <div className="flex items-center gap-2">
                          <i className="fi fi-sr-robot text-[var(--accent-warm)]"></i>
                          <h4 className="text-xs font-bold text-[var(--text-main)] m-0">{title}</h4>
                        </div>
                        {scoreData ? (
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center shrink-0 w-12 pt-1">
                              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--card-yellow)]/20 border-2 border-[var(--card-yellow-hover)]">
                                <span className="text-base font-black text-[#705b00]">{scoreData.score}</span>
                              </div>
                              <span className="text-[8px] font-bold text-[#705b00] uppercase mt-0.5">Score</span>
                            </div>
                            <p className="text-xs text-[var(--text-main)] leading-relaxed flex-1 m-0">
                              {scoreData.review.replace(/\n/g, " ").replace(/[*#-]/g, "")}
                            </p>
                          </div>
                        ) : isPast ? (
                          <div className="text-xs text-[var(--text-muted)]">AI กำลังประเมินผล...</div>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)] p-3 bg-[var(--bg-sub)] rounded-xl border border-[var(--border)] text-center">
                            ยังไม่จบปีนี้ AI จะประเมินผลให้เมื่อสิ้นสุดปีครับ
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Overview 4 stat boxes — Serene Pulse Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1"><i className="fi fi-sr-bill-arrow text-[var(--red)] text-[9px]"></i> หนี้คงเหลือรวม</div>
                      <div className="text-lg font-black text-[var(--red)] font-mono mt-1">{fmtMoney(summaryStats.totalDebt)}</div>
                    </div>
                    <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1"><i className="fi fi-sr-check-circle text-[var(--green)] text-[9px]"></i> ชำระแล้วรวม</div>
                      <div className="text-lg font-black text-[var(--green)] font-mono mt-1">{fmtMoney(summaryStats.totalPaid)}</div>
                    </div>
                    <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1"><i className="fi fi-sr-document text-[var(--accent-warm)] text-[9px]"></i> บันทึกทั้งหมด</div>
                      <div className="text-lg font-black text-[var(--text-main)] font-mono mt-1">{summaryStats.totalEntries} รายการ</div>
                    </div>
                    <div className="p-3.5 bg-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1"><i className="fi fi-sr-trophy text-[var(--gold)] text-[9px]"></i> ปลดหนี้แล้ว</div>
                      <div className="text-lg font-black text-[var(--green)] font-mono mt-1">{summaryStats.paidOffPledges} รายการ</div>
                    </div>
                  </div>

                  {/* Dream text preview */}
                  <div className="p-3.5 bg-gradient-to-r from-[var(--card-yellow)]/20 to-[var(--card)]/50 rounded-2xl border border-[var(--card-yellow-hover)]/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-extrabold text-[var(--accent-warm)] uppercase flex items-center gap-1">
                        <i className="fi fi-sr-star"></i> ภาพฝันวันเกษียณ
                      </div>
                      <button 
                        onClick={() => setSelectedView("diary")}
                        className="text-[10px] font-bold text-[var(--accent-warm)] hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1"
                        title="ไปยังหน้าเขียนความฝัน"
                      >
                        <i className="fi fi-sr-pencil text-[9px]"></i> {diary.dreamText ? "แก้ไข" : "ตั้งความฝัน (+8 คะแนน)"}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-main)] m-0 pl-2 border-l-2 border-[var(--accent-warm)]">
                      {diary.dreamText || "ยังไม่ได้ระบุภาพฝันวันเกษียณ (คลิก 'ตั้งความฝัน (+8 คะแนน)' ด้านบนเพื่อไประบุ)"}
                    </p>
                  </div>


                </div>

                {/* ── RIGHT PAGE (PET + MISSIONS + PLEDGES) ── */}
                <div className="flex-1 flex flex-col px-4 lg:px-6 py-6 overflow-y-auto space-y-4">
                  
                  {/* Pet Section Header */}
                  <div className="pb-1">
                    <h3 className="text-[15px] font-extrabold text-[var(--text-main)] m-0 flex items-center gap-2">
                      <i className="fi fi-sr-paw text-[var(--accent-warm)]"></i>
                      สัตว์เลี้ยงการเงิน
                    </h3>
                  </div>

                  {/* Pet Avatar + Vitals — Compact */}
                  <div className="flex flex-col items-center gap-3 p-4 bg-gradient-to-b from-[var(--bg-sub)] to-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)]">
                    {/* Level Preview Controls */}
                    <div className="diary-pet-preview-controls flex items-center justify-between w-full max-w-xs">
                      <button onClick={() => setPreviewPetLevel(level => Math.max(0, (level ?? petLevel) - 1))} aria-label="ดูมาสคอตเลเวลก่อนหน้า"><i className="fi fi-rr-angle-left"></i></button>
                      <span className="text-xs font-bold text-[var(--text-muted)]">{isPreviewingPet ? `ตัวอย่าง Level ${displayedPetLevel + 1}` : `Level ปัจจุบัน ${petLevel + 1}`}</span>
                      <button onClick={() => setPreviewPetLevel(level => Math.min(petMilestones.length - 1, (level ?? petLevel) + 1))} aria-label="ดูมาสคอตเลเวลถัดไป"><i className="fi fi-rr-angle-right"></i></button>
                    </div>

                    {/* Star Pet Character */}
                    <div className={`diary-pet diary-pet-level-${displayedPetLevel}`} aria-hidden="true">
                      <div className="diary-pet-spark spark-one">✦</div>
                      <div className="diary-pet-spark spark-two">✦</div>
                      <div className="diary-pet-wings"><span>🪽</span><span>🪽</span></div>
                      <span className="diary-pet-arm diary-pet-arm-left"></span>
                      <span className="diary-pet-arm diary-pet-arm-right"></span>
                      <div className="diary-pet-body">
                        <span className="diary-pet-eye"></span>
                        <span className="diary-pet-eye"></span>
                        <span className="diary-pet-smile"></span>
                      </div>
                      <span className="diary-pet-leg diary-pet-leg-left"></span>
                      <span className="diary-pet-leg diary-pet-leg-right"></span>
                      <div className="diary-pet-accessory">{petAccessories[displayedPetLevel]}</div>
                      <div className="diary-pet-coin">฿</div>
                    </div>

                    {/* Pet Info */}
                    <div className="diary-pet-copy w-full text-center max-w-sm space-y-1.5">
                      <div className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">FINSHIELD PET · LEVEL {displayedPetLevel + 1}</div>
                      <div className="diary-pet-name-row justify-center flex items-center gap-2">
                        {isEditingPetName ? (
                          <input autoFocus className="diary-pet-name-input diary-pet-name-edit" value={diary.petName || ""}
                            onChange={event => setDiary((prev: DiaryState) => ({ ...prev, petName: event.target.value }))}
                            onBlur={() => setIsEditingPetName(false)}
                            onKeyDown={event => { if (event.key === "Enter") setIsEditingPetName(false); }}
                            placeholder="ตั้งชื่อ" aria-label="ตั้งชื่อสัตว์เลี้ยง" maxLength={24} />
                        ) : (
                          <>
                            <h2 className="text-xl font-extrabold text-[var(--text-main)] m-0">{displayedPetName}</h2>
                            <button className="diary-pet-edit-button" onClick={() => setIsEditingPetName(true)} aria-label="แก้ไขชื่อสัตว์เลี้ยง" title="แก้ไขชื่อ">
                              <i className="fi fi-rr-pencil"></i>
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] m-0">
                        {petScore === 0 ? "เริ่มเขียนวันนี้ แล้วช่วยกันเก็บคะแนน" : `สะสม ${petScore} คะแนน · กำลังเติบโต`}
                      </p>
                      
                      <div className="diary-pet-progress my-1.5" aria-label={`ความคืบหน้า ${petProgress}%`}>
                        <span style={{ width: `${petProgress}%` }} />
                      </div>
                      
                      <div className="flex justify-between text-[10px] font-semibold text-[var(--text-muted)]">
                        <span>{petScore}/{petNextGoal} คะแนน</span>
                        <span>{petProgress === 100 ? "พร้อมเติบโต!" : `อีก ${Math.max(0, petNextGoal - petScore)}`}</span>
                      </div>

                      <div className="flex justify-center gap-3 text-[10px] font-medium text-[var(--text-muted)] pt-1">
                        <span>ความสุข <b className="text-[var(--text-main)]">{petHappiness}%</b></span>
                        <span>พลังงาน <b className="text-[var(--text-main)]">{petEnergy}%</b></span>
                        <span>streak <b className="text-[var(--text-main)]">{currentStreak} วัน</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Event — Compact with InfoTooltip */}
                  <div className="p-3.5 rounded-2xl border border-[var(--card-yellow-hover)]/40 bg-gradient-to-r from-[var(--card-yellow)]/15 to-[var(--card)] space-y-2 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-extrabold tracking-wider text-[var(--accent-warm)] uppercase flex items-center gap-1.5">
                        <i className="fi fi-sr-flame text-[10px]"></i>
                        EVENT · {MONTH_SHORT[currentRealMonth]} (ธีมประจำเดือน)
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">วิธีรับคะแนน</span>
                        <InfoTooltip title={`ภารกิจธีม: ${currentPetEvent.title}`} align="right" position="bottom">
                          <div className="space-y-2 text-[11px]">
                            <p className="m-0 font-semibold text-[var(--text-main)]">
                              🎯 <strong>วิธีรับ 10 คะแนน:</strong>
                            </p>
                            <p className="m-0 text-[var(--text-muted)] leading-relaxed">
                              เขียนไดอารี่ในเดือนนี้โดยมีคำที่เข้าธีมอย่างน้อย <strong>3 วัน</strong> (ปัจจุบันทำได้ {themeDaysCount}/3 วัน)
                            </p>
                            <div className="p-2.5 bg-[var(--bg-sub)] rounded-xl border border-[var(--border)]">
                              <span className="font-bold text-[var(--accent-warm)] block mb-1">💡 คำที่เข้าธีม (ตัวอย่าง):</span>
                              <div className="flex flex-wrap gap-1">
                                {currentPetEvent.keywords.slice(0, 8).map(kw => (
                                  <span key={kw} className="bg-[var(--card)] px-1.5 py-0.5 rounded-md border border-[var(--border2)] text-[10px] text-[var(--text-main)] font-mono">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="m-0 text-[10px] text-[var(--text-muted)] italic">
                              * ระบบจะตรวจจับคำในเนื้อหาไดอารี่อัตโนมัติเมื่อกดบันทึก
                            </p>
                          </div>
                        </InfoTooltip>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)] m-0">{currentPetEvent.title}</h3>
                      <p className="text-[11px] text-[var(--text-muted)] m-0 mt-0.5">{monthlyMission.label}</p>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isMonthlyThemeDone ? "bg-[var(--green)]" : "bg-[var(--accent-warm)]"}`}
                          style={{ width: `${Math.min(100, Math.round((themeDaysCount / 3) * 100))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={isMonthlyThemeDone ? "text-[var(--green)]" : "text-[var(--text-muted)]"}>
                          {isMonthlyThemeDone ? "✓ สำเร็จครบ 3 วันแล้ว" : `ความคืบหน้าธีม: ${themeDaysCount}/3 วัน`}
                        </span>
                        <span className={isMonthlyThemeDone ? "text-[var(--green)]" : "text-[var(--accent-warm)]"}>
                          {isMonthlyThemeDone ? "✓ ได้รับแล้ว 10 คะแนน" : "รางวัล: 10 คะแนน"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Missions — Compact */}
                  <div className="p-3.5 rounded-2xl border border-[var(--border2)] bg-[var(--card)] space-y-2 shadow-[var(--shadow-sm)]">
                    <div className="text-[10px] font-extrabold tracking-wider text-[var(--text-muted)] uppercase">ภารกิจวันนี้ · {missionCount}/3</div>
                    <div className="space-y-1.5">
                      {missions.map(mission => (
                        <div key={mission.label} className={`flex items-center justify-between text-[11px] p-2 rounded-xl border ${mission.done ? "bg-[var(--card-green)]/40 border-green-200 text-green-700 font-semibold" : "bg-[var(--bg-sub)] border-[var(--border)] text-[var(--text-muted)]"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${mission.done ? "bg-[var(--green)] text-white" : "border border-[var(--border2)] text-transparent"}`}>✓</span>
                            <span>{mission.label}</span>
                          </div>
                          <b className="font-mono text-[10px]">+{mission.points}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Pet Message — Compact */}
                  <div className="p-3.5 rounded-2xl border border-[var(--card-yellow-hover)]/30 bg-[var(--card-yellow)]/10 space-y-2 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[var(--accent-warm)] uppercase tracking-wide">
                      <i className="fi fi-sr-sparkles text-[9px]"></i> ข้อความจากสัตว์เลี้ยง
                    </div>
                    <p className="text-[11px] text-[var(--text-main)] leading-relaxed m-0 font-medium">
                      {diary.petEncouragement || "เจ้าตัวจิ๋วแอบส่งกำลังใจให้เจ้านายนะ! ทุกก้าวที่ทำไปคือการสร้างอนาคตที่ดีขึ้น"}
                    </p>
                    <button onClick={handlePetEncouragement} disabled={isAskingAI} className="inline-flex items-center gap-1.5 bg-[var(--accent-dark)] hover:bg-black text-white text-[10px] font-bold px-3.5 py-1.5 rounded-full border-0 cursor-pointer transition-all shadow-sm disabled:opacity-50">
                      <i className="fi fi-sr-sparkles text-[9px]"></i>
                      <span>{isAskingAI ? "กำลังคิด..." : "ขอข้อความใหม่"}</span>
                    </button>
                  </div>

                  {/* Pledge list — Compact */}
                  {(diary.pledges || []).length > 0 && (
                    <div className="space-y-1.5 overflow-y-auto max-h-[140px]">
                      <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wide flex items-center gap-1">
                        <i className="fi fi-sr-document-signed text-[var(--red)] text-[9px]"></i> รายการหนี้
                      </span>
                      {diary.pledges.map(p => (
                        <div key={p.id} className="p-2.5 bg-[var(--bg-sub)] rounded-xl border border-[var(--border)] flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-[var(--text-main)]">{p.name}</span>
                          <span className={`font-mono font-bold ${p.amount <= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            {p.amount <= 0 ? "✓ ปลดแล้ว" : `คงเหลือ ${fmtMoney(p.amount)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ══ DIARY VIEW ══ */
              <>
                {/* ── LEFT PAGE ── */}
                <div className="flex-1 flex flex-col gap-4 px-4 lg:px-8 py-5 lg:py-7 overflow-y-auto border-b lg:border-b-0 lg:border-r border-black/[0.05]">

                  {/* Vision Board — Serene Pulse Card */}
                  <div className="flex-1 flex flex-col gap-3 p-4 bg-gradient-to-br from-[var(--card-yellow)]/10 to-transparent rounded-2xl border border-[var(--card-yellow-hover)]/25 shrink-0">
                    <div className="flex items-center gap-2 text-[15px] font-extrabold text-[var(--text-main)]">
                      <i className="fi fi-sr-star text-[var(--accent-warm)]"></i> ภาพฝันวันเกษียณ
                    </div>
                    <textarea
                      className="flex-1 w-full min-h-[80px] bg-transparent border-0 outline-none text-[var(--text-main)] text-sm leading-relaxed resize-none font-[var(--font-family)] placeholder:text-[var(--text-muted)]"
                      placeholder="อยากมีชีวิตหลังเกษียณแบบไหน? เช่น อยากเปิดคาเฟ่เล็กๆ หรือไปเที่ยวรอบโลก..."
                      value={dreamDraft !== null ? dreamDraft : diary.dreamText || ""}
                      onChange={e => setDreamDraft(e.target.value)}
                    />
                    <button onClick={handleSaveDream}
                      className={`self-end flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-[13px] font-bold border-0 cursor-pointer transition-all hover:opacity-90 shadow-sm ${dreamSaved ? "bg-[var(--green)]" : "bg-[var(--accent-dark)]"}`}>
                      {dreamSaved ? <><i className="fi fi-sr-check"></i> บันทึกสำเร็จ</> : "บันทึกความฝัน"}
                    </button>
                  </div>

                  {/* Debt Pledge — Serene Pulse Card */}
                  <div className="flex flex-col gap-3 p-4 bg-[var(--card)] rounded-2xl border border-[var(--border2)] shadow-[var(--shadow-sm)] shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[15px] font-extrabold text-[var(--text-main)]">
                        <i className="fi fi-sr-document-signed text-[var(--red)]"></i> ปลดหนี้
                      </div>
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
                                  <label className="text-[11px] text-[var(--text-muted)] font-semibold">วันที่จ่ายของทุกเดือน (1-31)</label>
                                  <input type="number" min="1" max="31" className={`${inputCls} mt-1`} onWheel={e => e.currentTarget.blur()}
                                    placeholder="เช่น 26"
                                    value={editPledge.paymentDay ?? (p.paymentDay ?? (p.nextPaymentDate ? new Date(`${p.nextPaymentDate}T12:00:00`).getDate() : ""))}
                                    onChange={e => {
                                      const val = e.target.value;
                                      const num = val ? Math.min(31, Math.max(1, parseInt(val, 10))) : undefined;
                                      setEditPledge(prev => ({ ...prev, paymentDay: num }));
                                    }} />
                                </div>
                              </div>
                              <div className="flex gap-1.5 justify-end">
                                <button className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-muted)] text-[12px] cursor-pointer hover:bg-[var(--bg-sub)] transition-colors"
                                  onClick={() => { setEditingPledgeId(null); setEditPledge({}); }}>ยกเลิก</button>
                                <button className="px-3 py-1.5 rounded-lg border-0 bg-[var(--accent-dark)] text-white text-[12px] font-bold cursor-pointer hover:opacity-90"
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
                                  {p.amount > 0 && (p.paymentDay || p.nextPaymentDate) && (
                                    <span className="text-[11px] text-[var(--accent-warm)] bg-[var(--bg-sub)] px-2 py-0.5 rounded-full self-start flex items-center gap-1 font-medium">
                                      <i className="fi fi-sr-calendar text-[9px]"></i>
                                      <span>
                                        {p.paymentDay ? `หักทุกวันที่ ${p.paymentDay} ` : ''}
                                        {p.nextPaymentDate ? `(จ่ายครั้งถัดไป: ${new Date(`${p.nextPaymentDate}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})` : ''}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <button className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-0 text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-main)] hover:bg-[var(--bg-sub)] transition-colors"
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
                    <div className="grid grid-cols-2 gap-2 mt-2 p-4 bg-[var(--bg-sub)] rounded-2xl border border-dashed border-[var(--border2)]">
                      <div className="col-span-2 flex items-center mb-1">
                        <span className="text-[12px] font-extrabold text-[var(--text-main)] flex items-center gap-1"><i className="fi fi-sr-add text-[var(--accent-warm)]"></i> เพิ่มรายการหนี้ใหม่</span>
                      </div>
                      <input type="text" placeholder="ชื่อหนี้ (เช่น ผ่อนรถ)" className={`col-span-2 ${inputCls}`}
                        value={newPledgeName} onChange={e => setNewPledgeName(e.target.value)} />
                      <input type="number" placeholder="ยอดหนี้ (฿)" className={inputCls}
                        value={newPledgeAmount} onChange={e => setNewPledgeAmount(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="number" placeholder="ชำระ/เดือน (฿)" className={inputCls}
                        value={newPledgeMonthly} onChange={e => setNewPledgeMonthly(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="number" placeholder="ปีปลดหมด" className={inputCls}
                        value={newPledgeYear} onChange={e => setNewPledgeYear(e.target.value)} onWheel={e => e.currentTarget.blur()} />
                      <input type="number" min="1" max="31" placeholder="วันที่จ่ายของทุกเดือน (1-31)" title="ระบุตัวเลขวันที่หักชำระของแต่ละเดือน (1-31 เช่น 26)" className={inputCls}
                        value={newPledgeDay} onChange={e => {
                          const val = e.target.value;
                          if (!val) { setNewPledgeDay(""); return; }
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setNewPledgeDay(String(Math.min(31, Math.max(1, num))));
                        }} onWheel={e => e.currentTarget.blur()} />
                      <button className="col-span-2 px-4 py-2.5 rounded-full border-0 bg-[var(--accent-dark)] text-white text-[13px] font-bold cursor-pointer hover:opacity-90 transition-all mt-1 shadow-sm"
                        onClick={handleAddPledge}>เพิ่มคำปฏิญาณ</button>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT PAGE ── */}
                <div className="diary-page-lined flex-1 flex flex-col px-4 lg:px-8 py-5 lg:py-7 gap-0 overflow-hidden relative">

                  {/* Day navigation header */}
                  <div className="flex items-center gap-2 border-b-2 border-[var(--border)] pb-3 mb-4 shrink-0">
                    <button
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                      onClick={() => setSelectedDayIndex(i => i + 1)}
                      disabled={selectedDayIndex >= daysInPeriod.length - 1} title="วันก่อนหน้า">
                      <i className="fi fi-sr-angle-left flex items-center text-xs leading-none"></i>
                    </button>
                    <div className="flex-1 text-center min-w-0 relative group">
                      <div className="text-[15px] font-bold text-[var(--text-main)] truncate leading-tight flex items-center justify-center gap-1 cursor-pointer">
                        {formattedDay}
                        {isCurrentDay && (
                          <span className="text-[11px] font-bold bg-[var(--card-yellow)] text-[#1e1c10] px-2.5 py-0.5 rounded-full align-middle ml-1 shadow-sm">วันนี้</span>
                        )}
                        <i className="fi fi-sr-calendar text-[12px] text-[var(--accent-warm)] opacity-60 group-hover:opacity-100 lg:hidden ml-1"></i>
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
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
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
                              className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent border-0 text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                              onClick={() => handleAskAdvice(entry.id)} disabled={askingEntryId === entry.id} title="ขอคำแนะนำ">
                              <i className={`fi ${askingEntryId === entry.id ? "fi-sr-spinner fa-spin" : "fi-sr-sparkles"} text-xs text-[var(--accent-warm)]`}></i>
                            </button>
                          </div>
                          <div className="text-[15px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap px-1 py-1 font-medium font-serif">
                            {entry.text}
                          </div>
                          {entry.aiComment && (
                            <div className="p-3.5 rounded-2xl bg-[var(--card-cream)] border border-[var(--border2)]">
                              <div className="flex items-center gap-2 text-[var(--accent-warm)] font-bold text-xs mb-1.5">
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
                      <div className="mt-1 p-4 rounded-2xl bg-[var(--card-cream)] border border-[var(--border2)]">
                        <div className="flex items-center gap-2 text-[var(--accent-warm)] font-bold text-[13px] mb-2">
                          <i className="fi fi-sr-robot"></i> คำแนะนำจากเพื่อนรู้งาน
                        </div>
                        <p className="text-[13px] text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">{adviceForDay.replace(/[*#]/g, "")}</p>
                      </div>
                    ) : entriesForCurrentDay.length > 0 && (
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[var(--border2)] bg-[var(--card)] text-[var(--text-main)] text-[13px] font-bold cursor-pointer mt-1 hover:bg-[var(--bg-sub)] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleAskAdvice()} disabled={isAskingAI}>
                        <i className="fi fi-sr-sparkles text-[var(--accent-warm)]"></i>
                        {isAskingAI ? "กำลังวิเคราะห์คำแนะนำ..." : "ขอคำแนะนำจากเพื่อนรู้งาน"}
                      </button>
                    )}
                  </div>

                  {/* New entry input */}
                  <div className="flex flex-col gap-2 border-t border-dashed border-[var(--border)] pt-3 mt-3 shrink-0">
                    {isCurrentPeriod && (
                      <div className="flex items-center justify-between px-1">
                        <div className="text-[11px] text-[var(--accent-warm)] font-semibold flex items-center gap-1.5">
                          <i className="fi fi-sr-flame text-[10px]"></i>
                          <span>ธีมเดือนนี้: <strong>{currentPetEvent.title}</strong></span>
                          <span className="text-[10px] text-[var(--text-muted)] font-normal hidden sm:inline">(เช่น {currentPetEvent.hint})</span>
                        </div>
                        {currentPetEvent.keywords.some(kw => newEntryText.toLowerCase().includes(kw.toLowerCase())) && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-950/50 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-300 dark:border-green-800 animate-pulse">
                            ✨ มีคำเข้าธีม!
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        className="w-full min-h-[72px] pl-3 pr-12 py-2.5 rounded-2xl border border-[var(--border2)] bg-[var(--card)] text-[var(--text-main)] text-sm font-[var(--font-family)] leading-relaxed resize-none outline-none focus:border-[var(--primary)] transition-colors placeholder:text-[var(--text-muted)]"
                        placeholder={isCurrentDay ? `บันทึกเรื่องราววันนี้... (ธีมเดือนนี้: ${currentPetEvent.title})` : `บันทึกย้อนหลัง — ${formattedDay}`}
                        value={newEntryText} onChange={e => setNewEntryText(e.target.value)} />
                      <button
                        className="absolute right-2 bottom-2 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-dark)] text-white border-0 cursor-pointer hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
                      "rounded-t-lg lg:rounded-t-none lg:rounded-r-[10px] border lg:border-l-0 border-[var(--border2)]",
                      "text-[13px] lg:text-[11px] font-bold cursor-pointer transition-all duration-150",
                      hasEntries ? (isActive ? "tab-has-dot tab-active-dot" : "tab-has-dot") : "",
                      isActive
                        ? "bg-[var(--accent-dark)] text-white border-[var(--accent-dark)] shadow-[0_3px_8px_rgba(30,28,16,0.18)] lg:shadow-[3px_0_8px_rgba(30,28,16,0.18)] lg:translate-x-[3px] z-[2]"
                        : "bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--bg-sub)] hover:text-[var(--text-main)] lg:hover:translate-x-[2px]",
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

