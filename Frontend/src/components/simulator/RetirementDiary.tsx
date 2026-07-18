"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
import "../ui/RetirementDiary.css";

type Pledge = {
  id: string;
  name: string;
  amount: number;
  targetYear: number;
};

type JournalEntry = {
  id: string;
  date: string; // ISO string
  text: string;
};

type DiaryState = {
  dreamText: string;
  pledges: Pledge[];
  entries: JournalEntry[];
  dailyAdvice: Record<string, string>; // e.g. { "2026-07-15": "Advice text..." }
  lastVisited: string; // ISO string
};

const DEFAULT_DIARY: DiaryState = {
  dreamText: "",
  pledges: [],
  entries: [],
  dailyAdvice: {},
  lastVisited: new Date().toISOString(),
};

// Helper to get YYYY-MM-DD in local time
const getLocalFormattedDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function RetirementDiary() {
  const [diary, setDiary] = useLocalStorage<DiaryState>("wpt_diary", DEFAULT_DIARY);
  const { financeData } = useFinance();
  
  const [newPledgeName, setNewPledgeName] = useState("");
  const [newPledgeAmount, setNewPledgeAmount] = useState("");
  const [newPledgeYear, setNewPledgeYear] = useState("");
  
  const [newEntryText, setNewEntryText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [askingEntryId, setAskingEntryId] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  
  const [dreamDraft, setDreamDraft] = useState<string | null>(null);
  const [dreamSaved, setDreamSaved] = useState(false);

  // Pagination Logic
  // Find all unique dates that have entries, plus today
  const allDates = useMemo(() => {
    const todayStr = getLocalFormattedDate(new Date());
    const datesSet = new Set<string>();
    datesSet.add(todayStr); // Always include today
    
    // Ensure diary.entries exists (migration from older localstorage formats)
    const entries = diary.entries || [];
    
    entries.forEach(e => {
      const dateStr = getLocalFormattedDate(new Date(e.date));
      datesSet.add(dateStr);
    });
    
    // Sort descending (newest first)
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [diary.entries]);

  const [currentDateIndex, setCurrentDateIndex] = useState(0); // 0 is the newest date (usually today)

  useEffect(() => {
    const lastVisit = new Date(diary.lastVisited || new Date().toISOString());
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays >= 1) {
      setShowReminder(true);
    }

    setDiary((prev: DiaryState) => ({ 
      ...prev, 
      lastVisited: now.toISOString(),
      dailyAdvice: prev.dailyAdvice || {} // ensure this field exists
    }));
  }, []);

  const handleSaveDreamBtn = () => {
    const textToSave = dreamDraft !== null ? dreamDraft : (diary.dreamText || "");
    setDiary((prev: DiaryState) => ({ ...prev, dreamText: textToSave }));
    setDreamSaved(true);
    setTimeout(() => setDreamSaved(false), 2000);
  };

  const handleAddPledge = () => {
    if (!newPledgeName || !newPledgeAmount || !newPledgeYear) return;
    
    const pledge: Pledge = {
      id: Date.now().toString(),
      name: newPledgeName,
      amount: Number(newPledgeAmount),
      targetYear: Number(newPledgeYear)
    };
    
    setDiary((prev: DiaryState) => ({ 
      ...prev, 
      pledges: [...(prev.pledges || []), pledge] 
    }));
    setNewPledgeName("");
    setNewPledgeAmount("");
    setNewPledgeYear("");
  };

  const handleDeletePledge = (id: string) => {
    setDiary((prev: DiaryState) => ({ 
      ...prev, 
      pledges: (prev.pledges || []).filter(p => p.id !== id) 
    }));
  };

  const handlePostEntry = () => {
    if (!newEntryText.trim()) return;
    
    const now = new Date();
    let entryDate = now;
    
    const todayStr = getLocalFormattedDate(now);
    if (currentDateStr !== todayStr) {
      // Backdate the entry to the currently viewed date, keeping current time
      entryDate = new Date(`${currentDateStr}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`);
      if (isNaN(entryDate.getTime())) {
        entryDate = now; // fallback
      }
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: entryDate.toISOString(),
      text: newEntryText,
    };
    
    setDiary((prev: DiaryState) => ({ 
      ...prev, 
      entries: [newEntry, ...(prev.entries || [])] 
    }));
    setNewEntryText("");
  };

  const handleAskAdvice = async (entryId?: string) => {
    const currentDateStr = allDates[currentDateIndex];
    let textToSend = "";
    
    if (entryId) {
      const entry = (diary.entries || []).find(e => e.id === entryId);
      if (!entry) return;
      textToSend = entry.text;
      setAskingEntryId(entryId);
    } else {
      const entriesForDay = (diary.entries || []).filter(e => getLocalFormattedDate(new Date(e.date)) === currentDateStr);
      if (entriesForDay.length === 0) return;
      textToSend = entriesForDay.map(e => e.text).join("\n---\n");
      setIsAskingAI(true);
    }
    
    try {
      const context = {
        currentCapital: financeData.assets.currentCapital,
        monthlyIncome: financeData.assets.monthlyIncome,
        monthlyExpense: Object.values(financeData.expenses).reduce((a, b) => a + (b || 0), 0),
        debt: financeData.expenses.debt,
        monthlySavings: financeData.assets.monthlySavings,
        emergencyFund: financeData.assets.emergencyFund,
      };

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "diary_cheer",
          messages: [{ role: "user", content: "นี่คือบันทึกไดอารี่ของฉัน ช่วยอ่านและให้คำแนะนำหรือกำลังใจหน่อย:\n" + textToSend }],
          context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          if (entryId) {
            setDiary((prev: DiaryState) => ({
              ...prev,
              entries: prev.entries.map(e => e.id === entryId ? { ...e, aiComment: data.reply } : e)
            }));
          } else {
            setDiary((prev: DiaryState) => ({
              ...prev,
              dailyAdvice: {
                ...(prev.dailyAdvice || {}),
                [currentDateStr]: data.reply
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error("AI Advice failed:", error);
    } finally {
      if (entryId) setAskingEntryId(null);
      else setIsAskingAI(false);
    }
  };

  // Rendering variables
  const currentDateStr = allDates[currentDateIndex];
  const entriesForCurrentDay = (diary.entries || []).filter(e => getLocalFormattedDate(new Date(e.date)) === currentDateStr);
  const adviceForCurrentDay = (diary.dailyAdvice || {})[currentDateStr];
  
  // Format Date String for Header (e.g. "15 กรกฎาคม 2569")
  const formattedDateHeader = new Date(currentDateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  
  const isToday = currentDateStr === getLocalFormattedDate(new Date());

  return (
    <div className="diary-container">
      <div className="diary-header">
        <h1>ไดอารี่เกษียณสุข 📖</h1>
        <p>บันทึกเรื่องราวในแต่ละวัน สารภาพหนี้สิน และติดตามก้าวเล็กๆ สู่ความอิสระ</p>
      </div>

      {showReminder && (
        <div className="diary-reminder-banner">
          <i className="fi fi-sr-heart diary-reminder-icon"></i>
          <div>
            <strong>คิดถึงจังเลย!</strong> เป็นยังไงบ้าง หากมีเรื่องไม่สบายใจสามารถเข้ามาเขียนไดอารี่ได้นะ หรือช่วงนี้คงยุ่งมากแน่เลย ยุ่งมากขอให้เงินมากตามนะ 💙
          </div>
        </div>
      )}

      {/* Book Container */}
      <div className="diary-book">
        
        {/* Left Page (Inside Cover) */}
        <div className="diary-page left">
          
          {/* Vision Board */}
          <div className="diary-card" style={{ flex: 1 }}>
            <div className="diary-card-title">
              <i className="fi fi-sr-star" style={{ color: "#FBBF24" }}></i> ภาพฝันวันเกษียณ
            </div>
            <textarea
              className="diary-textarea"
              style={{ flex: 1, border: "none", backgroundColor: "transparent", padding: "0" }}
              placeholder="อยากมีชีวิตหลังเกษียณแบบไหน? เล่าให้เราฟังหน่อย เช่น อยากเปิดคาเฟ่เล็กๆ หรือไปเที่ยวรอบโลก... (สามารถแก้ไขได้ตลอดเวลา)"
              value={dreamDraft !== null ? dreamDraft : (diary.dreamText || "")}
              onChange={(e) => setDreamDraft(e.target.value)}
            />
            <button 
              className="btn-post" 
              style={{ alignSelf: "flex-end", marginTop: "8px", backgroundColor: dreamSaved ? "var(--green)" : "var(--text-main)" }}
              onClick={handleSaveDreamBtn}
            >
              {dreamSaved ? <><i className="fi fi-sr-check"></i> บันทึกสำเร็จ</> : "บันทึกความฝัน"}
            </button>
          </div>

          {/* Debt Pledge */}
          <div className="diary-card">
            <div className="diary-card-title">
              <i className="fi fi-sr-document-signed" style={{ color: "var(--red)" }}></i> ปฏิญาณตนปลดหนี้
            </div>
            <div className="pledge-list">
              {(!diary.pledges || diary.pledges.length === 0) ? (
                <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "12px 0" }}>
                  ไม่มีหนี้ที่ต้องกังวล หรือถ้ามี... ลองตั้งเป้าหมายปลดหนี้ดูสิ
                </p>
              ) : (
                diary.pledges.map(p => (
                  <div key={p.id} className="pledge-item">
                    <div className="pledge-info">
                      <span className="pledge-name">{p.name}</span>
                      <span className="pledge-amount">฿{p.amount.toLocaleString()}</span>
                      <span className="pledge-target">เป้าหมายจบ: ปี {p.targetYear}</span>
                    </div>
                    <button className="btn-delete-pledge" onClick={() => handleDeletePledge(p.id)} title="ลบเป้าหมาย">
                      <i className="fi fi-sr-trash"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="add-pledge-form">
              <input
                type="text"
                placeholder="ชื่อหนี้ (เช่น รถ, บ้าน)"
                className="pledge-input"
                value={newPledgeName}
                onChange={e => setNewPledgeName(e.target.value)}
              />
              <input
                type="number"
                placeholder="ยอดหนี้ (บาท)"
                className="pledge-input"
                value={newPledgeAmount}
                onChange={e => setNewPledgeAmount(e.target.value)}
              />
              <input
                type="number"
                placeholder="ปีที่จะปลดหมด (เช่น 2570)"
                className="pledge-input"
                style={{ gridColumn: "span 2" }}
                value={newPledgeYear}
                onChange={e => setNewPledgeYear(e.target.value)}
              />
              <button className="btn-add-pledge" onClick={handleAddPledge}>
                เพิ่มคำปฏิญาณ
              </button>
            </div>
          </div>
        </div>

        {/* Right Page (Daily Journal) */}
        <div className="diary-page right">
          <div className="diary-page-header">
            <button 
              className="btn-page-nav" 
              disabled={currentDateIndex >= allDates.length - 1} 
              onClick={() => setCurrentDateIndex(prev => prev + 1)}
              title="วันก่อนหน้า"
            >
              <i className="fi fi-sr-angle-left"></i>
            </button>
            <div className="diary-page-date">
              {formattedDateHeader} {isToday && <span style={{ fontSize: "12px", color: "var(--accent-blue)", marginLeft: "4px" }}>(วันนี้)</span>}
            </div>
            <button 
              className="btn-page-nav" 
              disabled={currentDateIndex <= 0} 
              onClick={() => setCurrentDateIndex(prev => prev - 1)}
              title="วันถัดไป"
            >
              <i className="fi fi-sr-angle-right"></i>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column" }}>
            <div className="journal-entries">
              {entriesForCurrentDay.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                  <i className="fi fi-sr-book-open-cover" style={{ fontSize: "32px", opacity: 0.5, marginBottom: "8px", display: "block" }}></i>
                  ยังไม่มีบันทึกในวันนี้
                </div>
              ) : (
                entriesForCurrentDay.slice().reverse().map(entry => (
                  <div key={entry.id} className="journal-entry">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="journal-time">
                        {new Date(entry.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
                      </div>
                      <button 
                        className="btn-page-nav" 
                        style={{ width: "28px", height: "28px", fontSize: "12px", border: "none", color: "var(--accent-blue)" }}
                        onClick={() => handleAskAdvice(entry.id)}
                        disabled={askingEntryId === entry.id}
                        title={entry.aiComment ? "ขอคำแนะนำใหม่" : "ขอคำแนะนำเฉพาะข้อความนี้"}
                      >
                        {askingEntryId === entry.id ? <i className="fi fi-sr-spinner fa-spin"></i> : <i className="fi fi-sr-sparkles"></i>}
                      </button>
                    </div>
                    <div className="journal-text">{entry.text}</div>
                    {entry.aiComment && (
                      <div className="ai-advice-section" style={{ marginTop: "8px", padding: "12px" }}>
                        <div className="ai-advice-header" style={{ fontSize: "13px", marginBottom: "8px" }}>
                          <i className="fi fi-sr-robot"></i> คำแนะนำจากเพื่อนรู้งาน
                        </div>
                        <div className="ai-advice-text" style={{ fontSize: "13px" }}>{entry.aiComment.replace(/[*#]/g, '')}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* AI Advice Area */}
            {adviceForCurrentDay ? (
              <div className="ai-advice-section">
                <div className="ai-advice-header">
                  <i className="fi fi-sr-robot"></i> คำแนะนำจากเพื่อนรู้งาน
                </div>
                <div className="ai-advice-text">{adviceForCurrentDay.replace(/[*#]/g, '')}</div>
              </div>
            ) : (
              entriesForCurrentDay.length > 0 && (
                <button 
                  className="btn-ask-ai" 
                  onClick={() => handleAskAdvice()}
                  disabled={isAskingAI}
                >
                  <i className="fi fi-sr-sparkles"></i> 
                  {isAskingAI ? "กำลังวิเคราะห์คำแนะนำ..." : "ขอคำแนะนำจากเพื่อนรู้งาน"}
                </button>
              )
            )}
          </div>

          {/* New Entry Input (Only on Today's page, or allow on any page?) Let's allow on any page to backdate records if they forgot */}
          <div className="journal-input-area">
            <textarea
              className="diary-textarea"
              style={{ minHeight: "80px" }}
              placeholder="บันทึกภาระ ค่าใช้จ่าย หรือความสำเร็จของวันนี้..."
              value={newEntryText}
              onChange={e => setNewEntryText(e.target.value)}
            />
            <button className="btn-post" onClick={handlePostEntry} disabled={!newEntryText.trim()}>
              <i className="fi fi-sr-pencil"></i> จรดปากกาเขียน
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
