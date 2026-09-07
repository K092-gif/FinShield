"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";

type Source = {
  title: string;
  url: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

// Generate a unique session ID per user (persisted in localStorage)
function getOrCreateSessionId(userId: string): string {
  if (typeof window === "undefined" || !userId) return "";
  const key = `finshield_chat_session_id_${userId}`; // scoped per user
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function ChatAssistant() {
  const { financeData } = useFinance();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "สวัสดีครับ! ผมคือ 'เพื่อนรู้งาน' ผู้ช่วยส่วนตัวของคุณ 🤖\nอยากให้ผมช่วยประเมินสุขภาพการเงิน, จัดการหนี้สิน หรือแนะนำเรื่องภาษี ถามมาได้เลยครับ!\n\nตอนนี้ผมสามารถค้นหาข้อมูลเรียลไทม์จากอินเทอร์เน็ตได้ด้วยนะครับ เช่น ถามหาสถานที่ ร้านอาหาร หรือข่าวสารล่าสุด",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef("");

  // Initialize session ID on client side, scoped to current user.
  useEffect(() => {
    sessionId.current = "";
    setHistoryLoaded(false);
    if (user?.uid) {
      sessionId.current = getOrCreateSessionId(user.uid);
    }
  }, [user?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Load chat history from DB on first open
  const loadHistory = useCallback(async () => {
    if (historyLoaded || !user?.uid) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${API_BASE_URL}/ai/chat/history?sessionId=${sessionId.current}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            sources: m.sources || undefined,
          }));
          setMessages([
            {
              role: "assistant",
              content: "สวัสดีครับ! ผมคือ 'เพื่อนรู้งาน' ผู้ช่วยส่วนตัวของคุณ 🤖\nอยากให้ผมช่วยประเมินสุขภาพการเงิน, จัดการหนี้สิน หรือแนะนำเรื่องภาษี ถามมาได้เลยครับ!",
            },
            ...loadedMessages,
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
    setHistoryLoaded(true);
  }, [user, historyLoaded]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const context = {
        currentCapital: financeData?.assets?.currentCapital || 0,
        monthlyIncome: financeData?.assets?.monthlyIncome || 0,
        monthlyExpense: Object.values(financeData?.expenses || {}).reduce((a: any, b: any) => a + (b || 0), 0),
        debt: financeData?.expenses?.debt || 0,
        monthlySavings: financeData?.assets?.monthlySavings || 0,
        emergencyFund: financeData?.assets?.emergencyFund || 0,
      };

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context,
          firebaseUid: user?.uid || null,
          sessionId: sessionId.current,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      const aiMessage: Message = { 
        role: "assistant", 
        content: data.reply,
        sources: data.sources || undefined,
      };
      setMessages([...newMessages, aiMessage]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: "assistant", content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ ลองใหม่อีกครั้งนะครับ" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    if (!user?.uid) return;
    const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    sessionId.current = newId;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`finshield_chat_session_id_${user.uid}`, newId);
    }
    setHistoryLoaded(false);
    setMessages([
      {
        role: "assistant",
        content: "สวัสดีครับ! เริ่มบทสนทนาใหม่แล้วนะครับ 🤖\nมีอะไรให้ช่วยถามมาได้เลยครับ!",
      },
    ]);
  };

  const renderMessageContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#fed330] hover:bg-[#fcd020] text-[#1e1c10] shadow-[0_8px_24px_rgba(0,0,0,0.15)] border border-[#1e1c10]/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-[99999]`}
        aria-label="AI Assistant"
      >
        <i className={`${isOpen ? 'fi fi-sr-cross' : 'fi fi-sr-comment-alt'} text-xl sm:text-2xl text-[#1e1c10] flex items-center justify-center`}></i>
      </button>

      {/* Chat Window Floating Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-120px)] bg-[#fff9eb] dark:bg-[#201f1a] border border-[#e0dac7] dark:border-[#423e35] rounded-[28px] shadow-[0_20px_50px_rgba(30,28,16,0.22)] z-[99998] flex flex-col overflow-hidden animate-fade-in font-sans">
          
          {/* Header */}
          <div className="p-4 sm:px-5 bg-[#1e1c10] text-white font-bold text-sm flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <i className="fi fi-sr-robot text-[#fed330] text-lg"></i>
              <span>เพื่อนรู้งาน (AI Assistant)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleNewSession}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-all cursor-pointer border-0"
                title="เริ่มบทสนทนาใหม่"
              >
                <i className="fi fi-sr-rotate-right"></i>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-all cursor-pointer border-0"
                title="ปิด"
              >
                <i className="fi fi-sr-cross-small"></i>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fff9eb] dark:bg-[#201f1a]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-medium ${
                  msg.role === 'user'
                    ? 'bg-[#1e1c10] dark:bg-[#fed330] text-white dark:text-[#1e1c10] rounded-tr-xs shadow-xs'
                    : 'bg-white dark:bg-[#282620] text-[#1e1c10] dark:text-[#f5f3eb] border border-[#e0dac7]/70 dark:border-[#423e35] rounded-tl-xs shadow-xs'
                }`}>
                  {renderMessageContent(msg.role === 'assistant' ? msg.content.replace(/[*#]/g, '') : msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#747878] p-2.5 bg-white/80 dark:bg-[#282620] rounded-xl w-fit border border-[#e0dac7]/50 dark:border-[#423e35]">
                <i className="fi fi-sr-search text-xs animate-spin"></i>
                <span>กำลังค้นหาและวิเคราะห์...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="p-2.5 px-4 flex gap-2 overflow-x-auto whitespace-nowrap border-t border-[#f0e9d6] dark:border-[#35332b] bg-[#faf3e0] dark:bg-[#282620] shrink-0">
              <button 
                onClick={() => handleSend("ประเมินสุขภาพการเงินของฉันให้หน่อย")}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe] border-0 cursor-pointer transition-all shrink-0">
                ประเมินสุขภาพการเงิน
              </button>
              <button 
                onClick={() => handleSend("ฉันมีหนี้อยู่ ควรจัดการยังไงดี?")}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca] border-0 cursor-pointer transition-all shrink-0">
                แผนจัดการหนี้สิน
              </button>
              <button 
                onClick={() => handleSend("ปีนี้ฉันควรซื้อกองทุน SSF/RMF ดีไหม?")}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] border-0 cursor-pointer transition-all shrink-0">
                ปรึกษาภาษี
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-[#201f1a] border-t border-[#f0e9d6] dark:border-[#35332b] flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder="พิมพ์ถามข้อสงสัย..."
              className="flex-1 bg-[#faf3e0] dark:bg-[#2d2b24] border border-[#e0dac7] dark:border-[#423e35] rounded-full py-2 px-4 text-xs sm:text-sm text-[#1e1c10] dark:text-[#f5f3eb] outline-none focus:ring-2 focus:ring-[#fed330]"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-full bg-[#1e1c10] dark:bg-[#fed330] hover:bg-black text-[#fed330] dark:text-[#1e1c10] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer border-0 shrink-0"
            >
              <i className="fi fi-sr-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
