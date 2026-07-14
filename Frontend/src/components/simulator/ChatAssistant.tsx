"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
import "../ui/ChatAssistant.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatAssistant() {
  const { financeData } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "สวัสดีครับ! ผมคือ 'เพื่อนรู้งาน' ผู้ช่วยส่วนตัวของคุณ 🤖\nอยากให้ผมช่วยประเมินสุขภาพการเงิน, จัดการหนี้สิน หรือแนะนำเรื่องภาษี ถามมาได้เลยครับ!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

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
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: "assistant", content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ ลองใหม่อีกครั้งนะครับ" }]);
    } finally {
      setIsLoading(false);
    }
  };

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
            เพื่อนรู้งาน (AI Assistant)
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.role}`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-typing">
                กำลังพิมพ์...
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
