"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import "../ui/ChatAssistant.css";

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
  // Reset if user changes (e.g. logout → login as different account).
  useEffect(() => {
    sessionId.current = ""; // reset on uid change
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
      // Build context from financeData
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

  // Start a new chat session (scoped per user)
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
    // Regex that stops at whitespace, or closing brackets/parentheses commonly found wrapping URLs
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
            style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}
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
        className={`chat-assistant-btn ${isOpen ? 'open' : ''}`}
      >
        <i className={isOpen ? "fi fi-sr-cross-small" : "fi fi-sr-comment-alt"}></i>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <i className="fi fi-sr-robot"></i>
            <span style={{ flex: 1 }}>เพื่อนรู้งาน (AI Assistant)</span>
            <button 
              onClick={handleNewSession}
              className="chat-new-session-btn"
              title="เริ่มบทสนทนาใหม่"
            >
              <i className="fi fi-sr-rotate-right"></i>
            </button>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message-wrapper ${msg.role}`}>
                <div className={`chat-bubble ${msg.role}`}>
                  {renderMessageContent(msg.role === 'assistant' ? msg.content.replace(/[*#]/g, '') : msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-typing">
                <i className="fi fi-sr-search" style={{ marginRight: '4px' }}></i>
                กำลังค้นหาและวิเคราะห์...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="chat-quick-prompts">
              <button 
                onClick={() => handleSend("ประเมินสุขภาพการเงินของฉันให้หน่อย")}
                className="chat-quick-btn blue">
                ประเมินสุขภาพการเงิน
              </button>
              <button 
                onClick={() => handleSend("ฉันมีหนี้อยู่ ควรจัดการยังไงดี?")}
                className="chat-quick-btn red">
                แผนจัดการหนี้สิน
              </button>
              <button 
                onClick={() => handleSend("ปีนี้ฉันควรซื้อกองทุน SSF/RMF ดีไหม?")}
                className="chat-quick-btn green">
                ปรึกษาภาษี
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder="พิมพ์ถามข้อสงสัย..."
              className="chat-input"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="chat-send-btn"
            >
              <i className="fi fi-sr-paper-plane" style={{ transform: "translate(-1px, 1px)" }}></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
