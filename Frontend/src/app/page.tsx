'use client'

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Real Mini Previews of FinShield Feature Pages ─── */
const SLIDES = [
  {
    id: 'overview',
    label: 'แดชบอร์ดภาพรวม',
    path: 'finshield.app/simulator/overview',
    href: '/simulator/overview',
    content: (
      <div className="space-y-3 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#fed330] text-[#1e1c10] flex items-center justify-center text-xs shadow-xs">
              <i className="fi fi-sr-apps"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-[#1e1c10] leading-tight">Dashboard &amp; Comparison</div>
              <div className="text-[10px] text-[#747878]">สรุปภาพรวมทางการเงินและเปรียบเทียบพอร์ต</div>
            </div>
          </div>
          <div className="flex gap-1 bg-[#faf3e0] p-1 rounded-full text-[9px] font-bold border border-[#e0dac7]">
            <span className="px-2 py-0.5 rounded-full text-[#747878]">1 ปี</span>
            <span className="px-2 py-0.5 rounded-full text-[#747878]">5 ปี</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10] shadow-xs">10 ปี</span>
          </div>
        </div>

        {/* 3 Summary Stat Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#faf3e0]/80 p-2.5 rounded-xl border border-[#e0dac7]">
            <div className="text-[9px] font-bold text-[#747878] flex items-center gap-1">
              <i className="fi fi-sr-wallet text-amber-600 text-[8px]"></i> เงินเก็บตั้งต้น
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-[#1e1c10] mt-0.5">฿300,000</div>
          </div>
          <div className="bg-[#e8f5e9]/70 p-2.5 rounded-xl border border-emerald-200">
            <div className="text-[9px] font-bold text-emerald-800 flex items-center gap-1">
              <i className="fi fi-sr-shield-check text-emerald-600 text-[8px]"></i> สำรองฉุกเฉิน
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-emerald-700 mt-0.5">฿120,000</div>
            <div className="text-[8px] text-emerald-600 font-semibold">6 เดือน ปลอดภัย ✓</div>
          </div>
          <div className="bg-[#ffd8e7]/40 p-2.5 rounded-xl border border-[#ffd8e7]">
            <div className="text-[9px] font-bold text-rose-800 flex items-center gap-1">
              <i className="fi fi-sr-receipt text-rose-600 text-[8px]"></i> รายจ่าย/เดือน
            </div>
            <div className="text-xs sm:text-sm font-black font-mono text-[#1e1c10] mt-0.5">฿25,000</div>
            <div className="text-[8px] text-rose-600 font-semibold">6 หมวดค่าใช้จ่าย</div>
          </div>
        </div>

        {/* Graph Preview: Invest vs Bank */}
        <div className="bg-white rounded-xl border border-[#e0dac7] p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#1e1c10]">
            <span className="flex items-center gap-1.5">
              <i className="fi fi-sr-chart-line-up text-[#3b82f6] text-[10px]"></i>
              เปรียบเทียบการลงทุน vs ฝากธนาคาร (10 ปี)
            </span>
            <span className="font-mono text-emerald-600 font-bold">+7.8% คาดการณ์/ปี</span>
          </div>
          {/* SVG Smooth Curves */}
          <div className="w-full h-14 relative">
            <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="55" x2="300" y2="55" stroke="#f0e9d6" strokeWidth="1" />
              <line x1="0" y1="30" x2="300" y2="30" stroke="#f0e9d6" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="5" x2="300" y2="5" stroke="#f0e9d6" strokeWidth="1" strokeDasharray="3 3" />
              {/* Bank Line (Muted Gray) */}
              <path d="M 0 50 Q 150 46 300 40" fill="none" stroke="#9ca3af" strokeWidth="2" />
              {/* User Portfolio Line (Emerald) */}
              <path d="M 0 50 Q 140 38 300 20" fill="none" stroke="#10b981" strokeWidth="2.5" />
              {/* AI Portfolio Area + Line (Blue) */}
              <path d="M 0 50 Q 130 30 300 8 L 300 55 L 0 55 Z" fill="url(#aiGrad)" />
              <path d="M 0 50 Q 130 30 300 8" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              {/* Highlight Endpoints */}
              <circle cx="300" cy="8" r="3.5" fill="#3b82f6" />
              <circle cx="300" cy="20" r="3" fill="#10b981" />
              <circle cx="300" cy="40" r="2.5" fill="#9ca3af" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-[8px] text-[#747878] font-semibold pt-1 border-t border-[#f0e9d6]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>AI Portfolio (฿1.45M)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span>พอร์ตของคุณ (฿1.18M)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9ca3af]"></span>ฝากธนาคาร (฿520K)</span>
          </div>
        </div>

        {/* Side-by-side Portfolio Allocation */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#faf3e0]/60 rounded-xl p-2 border border-[#e0dac7] space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-[#1e1c10]">
              <span>พอร์ตของคุณ</span>
              <span className="text-emerald-600 font-mono">+6.2%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-100">
              <div className="bg-[#fed330]" style={{ width: '40%' }}></div>
              <div className="bg-[#ffd8e7]" style={{ width: '35%' }}></div>
              <div className="bg-[#dbeafe]" style={{ width: '25%' }}></div>
            </div>
            <div className="text-[8px] text-[#747878]">หุ้นไทย 40% · REIT 35% · US 25%</div>
          </div>
          <div className="bg-[#fed330]/25 rounded-xl p-2 border border-[#fed330] space-y-1">
            <div className="flex justify-between items-center text-[9px] font-bold text-[#1e1c10]">
              <span className="flex items-center gap-1">
                <i className="fi fi-sr-sparkles text-amber-600 text-[8px]"></i> AI แนะนำ
              </span>
              <span className="text-emerald-600 font-mono font-bold">+7.8%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-100">
              <div className="bg-[#fed330]" style={{ width: '45%' }}></div>
              <div className="bg-[#10b981]" style={{ width: '30%' }}></div>
              <div className="bg-amber-600" style={{ width: '15%' }}></div>
              <div className="bg-slate-400" style={{ width: '10%' }}></div>
            </div>
            <div className="text-[8px] text-[#747878]">ปันผล 45% · กองทุน 30% · ทอง 15%</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'tax',
    label: 'Tax Optimizer',
    path: 'finshield.app/simulator/tax',
    href: '/simulator/tax',
    content: (
      <div className="space-y-3 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shadow-xs border border-emerald-200">
              <i className="fi fi-sr-receipt"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-[#1e1c10] leading-tight">Tax Optimizer</div>
              <div className="text-[10px] text-[#747878]">คำนวณภาษีและลดหย่อนกว่า 25 รายการ</div>
            </div>
          </div>
          <div className="flex gap-1 bg-[#faf3e0] p-1 rounded-full text-[9px] font-bold border border-[#e0dac7]">
            <span className="px-2.5 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10] shadow-xs">ลดหย่อนภาษี</span>
            <span className="px-2 py-0.5 rounded-full text-[#747878]">AI วิเคราะห์</span>
          </div>
        </div>

        {/* 4 Deduction Groups (Matching Accordions in TaxOptimizer) */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🛡️</span>
              <div>
                <div className="text-[9px] font-bold text-sky-950">ประกัน &amp; เงินออม</div>
                <div className="text-[8px] text-sky-700">ประกันชีวิต, สุขภาพ</div>
              </div>
            </div>
            <span className="text-[9px] font-bold font-mono text-sky-800">฿75K</span>
          </div>
          <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📈</span>
              <div>
                <div className="text-[9px] font-bold text-violet-950">กองทุนเกษียณ</div>
                <div className="text-[8px] text-violet-700">SSF, RMF, ThaiESG</div>
              </div>
            </div>
            <span className="text-[9px] font-bold font-mono text-violet-800">฿190K</span>
          </div>
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">👨‍👩‍👧</span>
              <div>
                <div className="text-[9px] font-bold text-amber-950">ครอบครัว</div>
                <div className="text-[8px] text-amber-700">ส่วนตัว, คู่สมรส, บุตร</div>
              </div>
            </div>
            <span className="text-[9px] font-bold font-mono text-amber-800">฿120K</span>
          </div>
          <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🛍️</span>
              <div>
                <div className="text-[9px] font-bold text-orange-950">กระตุ้น ศก.</div>
                <div className="text-[8px] text-orange-700">Easy E-Receipt</div>
              </div>
            </div>
            <span className="text-[9px] font-bold font-mono text-orange-800">฿50K</span>
          </div>
        </div>

        {/* Tax Calculation Breakdown */}
        <div className="bg-white rounded-xl border border-[#e0dac7] p-2.5 space-y-1 text-[10px]">
          <div className="flex justify-between items-center text-[#747878]">
            <span>รายได้รวมทั้งปี</span>
            <span className="font-mono font-bold text-[#1e1c10]">฿840,000</span>
          </div>
          <div className="flex justify-between items-center text-[#747878]">
            <span>- หักค่าใช้จ่าย &amp; ลดหย่อนรวม</span>
            <span className="font-mono text-[#1e1c10]">- ฿390,000</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-[#f0e9d6] font-bold text-[#1e1c10]">
            <span>เงินได้สุทธิ (ฐานภาษี 15%)</span>
            <span className="font-mono">฿450,000</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#747878]">ภาษีที่ต้องชำระหลังลดหย่อน</span>
            <span className="font-mono font-bold text-rose-600">฿22,500</span>
          </div>
        </div>

        {/* Big Tax Saved Highlight Box (Matching TaxOptimizer) */}
        <div className="bg-emerald-600 rounded-xl p-3 text-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-bold text-emerald-100">ประหยัดภาษีไปได้ทั้งหมด!</div>
            <div className="text-[8px] text-emerald-200 mt-0.5">จากการใช้สิทธิลดหย่อนที่ระบุ</div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold font-mono text-white">฿32,500</div>
        </div>

        {/* Section 47 ทวิ Dividend Credit */}
        <div className="bg-[#faf3e0]/80 rounded-xl p-2 border border-[#e0dac7] flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-1.5">
            <i className="fi fi-sr-chart-pie text-emerald-600 text-xs"></i>
            <div>
              <div className="font-bold text-[#1e1c10]">ขอคืนภาษีเงินปันผล (ม.47 ทวิ)</div>
              <div className="text-[#747878]">เครดิตภาษีปันผลหุ้นไทย 20%</div>
            </div>
          </div>
          <span className="font-bold font-mono text-emerald-600 text-[10px]">+฿5,000</span>
        </div>
      </div>
    ),
  },
  {
    id: 'wealth',
    label: 'เป้าหมายการเงิน',
    path: 'finshield.app/simulator/wealth-plan',
    href: '/simulator/wealth-plan',
    content: (
      <div className="space-y-3 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-[#361928] flex items-center justify-center text-xs shadow-xs border border-pink-200">
              <i className="fi fi-sr-chart-line-up"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-[#1e1c10] leading-tight">Integrated Wealth Plan</div>
              <div className="text-[10px] text-[#747878]">จัดสรรเงินสำรอง DCA และจำลองวิกฤต</div>
            </div>
          </div>
          <div className="flex gap-1 bg-[#faf3e0] p-1 rounded-full text-[9px] font-bold border border-[#e0dac7]">
            <span className="px-2 py-0.5 rounded-full text-[#747878]">Wealth Plan</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10] shadow-xs">Dashboard</span>
          </div>
        </div>

        {/* 3 Stat Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-2.5 rounded-xl border border-[#e0dac7]">
            <div className="text-[8px] font-bold text-[#747878]">เงินลงทุนรวม</div>
            <div className="text-xs font-black font-mono text-[#1e1c10] mt-0.5">฿300,000</div>
            <div className="text-[8px] text-[#747878]">DCA ฿5,000/ด.</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#e0dac7]">
            <div className="text-[8px] font-bold text-[#747878]">มูลค่าปัจจุบัน</div>
            <div className="text-xs font-black font-mono text-[#1e1c10] mt-0.5">฿324,500</div>
            <div className="text-[8px] text-emerald-600 font-bold">↗ +฿24.5K (+8.1%)</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#e0dac7]">
            <div className="text-[8px] font-bold text-[#747878]">เงินสำรองฉุกเฉิน</div>
            <div className="text-xs font-black font-mono text-emerald-700 mt-0.5">฿150,000</div>
            <div className="text-[8px] text-emerald-600 font-bold">6 เดือน ✓</div>
          </div>
        </div>

        {/* Allocation Split Bar (Reserve vs Investment) */}
        <div className="bg-[#faf3e0]/60 rounded-xl p-2.5 border border-[#e0dac7] space-y-1.5">
          <div className="flex justify-between text-[9px] font-bold text-[#1e1c10]">
            <span>แผนจัดสรรเงิน (Allocation)</span>
            <span className="text-emerald-700">เงินเหลือเก็บ: +฿20,000/เดือน</span>
          </div>
          <div className="flex h-3.5 rounded-full overflow-hidden text-[7px] font-bold text-center leading-[14px]">
            <div className="bg-[#1e1c10] text-white" style={{ width: '50%' }}>สำรองฉุกเฉิน 50%</div>
            <div className="bg-[#fed330] text-[#1e1c10]" style={{ width: '50%' }}>ลงทุน DCA 50%</div>
          </div>
        </div>

        {/* Stress Test Box */}
        <div className="bg-rose-50/80 rounded-xl p-2.5 border border-rose-200 space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-rose-900">
            <span className="flex items-center gap-1">
              <i className="fi fi-sr-shield-exclamation text-rose-600 text-[10px]"></i>
              Stress Test: จำลองวิกฤตตกงาน 6 เดือน
            </span>
            <span className="text-emerald-700 font-mono">ความพร้อม 78%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full" style={{ width: '78%' }}></div>
          </div>
          <div className="text-[8px] text-rose-700">เงินสำรองฉุกเฉินรับมือค่าใช้จ่ายได้ 4.8 เดือน</div>
        </div>

        {/* Holdings Table Mini with Real Category Badges */}
        <div className="bg-white rounded-xl border border-[#e0dac7] p-2 space-y-1 text-[8px]">
          <div className="text-[9px] font-bold text-[#1e1c10] pb-0.5">สินทรัพย์ในพอร์ต</div>
          <div className="flex items-center justify-between py-0.5 border-b border-[#f0e9d6]">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md bg-[#fed330] text-[#1e1c10] font-bold font-mono">CPALL</span>
              <span className="text-[#747878]">หุ้นไทย</span>
            </div>
            <span className="font-mono font-bold text-emerald-600">฿85,000 (+9.4%)</span>
          </div>
          <div className="flex items-center justify-between py-0.5 border-b border-[#f0e9d6]">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md bg-[#ffd8e7] text-[#361928] font-bold font-mono">FTREIT</span>
              <span className="text-[#747878]">REIT</span>
            </div>
            <span className="font-mono font-bold text-emerald-600">฿65,000 (+4.2%)</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md bg-[#dbeafe] text-[#1e40af] font-bold font-mono">QQQ</span>
              <span className="text-[#747878]">US ETF</span>
            </div>
            <span className="font-mono font-bold text-emerald-600">฿100,000 (+14.8%)</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'diary',
    label: 'ไดอารี่เกษียณ',
    path: 'finshield.app/simulator/diary',
    href: '/simulator/diary',
    content: (
      <div className="space-y-3 font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1e1c10] text-[#fed330] flex items-center justify-center text-xs shadow-xs">
              <i className="fi fi-sr-book-alt"></i>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-[#1e1c10] leading-tight">ไดอารี่เกษียณสุข</div>
              <div className="text-[10px] text-[#747878]">สมุดบันทึกดิจิทัล &amp; สัตว์เลี้ยงการเงิน</div>
            </div>
          </div>
          <div className="flex gap-1 bg-[#faf3e0] p-1 rounded-full text-[9px] font-bold border border-[#e0dac7]">
            <span className="px-2 py-0.5 rounded-full text-[#747878]">ไดอารี่</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10] shadow-xs">สรุป &amp; สัตว์เลี้ยง</span>
          </div>
        </div>

        {/* 2-Page Digital Journal Spread */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left Page: Vision & Debt */}
          <div className="space-y-2">
            {/* Vision Board */}
            <div className="p-2.5 bg-gradient-to-br from-[#faf3e0] to-[#fed330]/20 rounded-xl border border-[#fed330]/60 space-y-1">
              <div className="text-[8px] font-extrabold text-[#705b00] uppercase flex items-center gap-1">
                <i className="fi fi-sr-star text-[8px]"></i> ภาพฝันวันเกษียณ
              </div>
              <p className="text-[9px] text-[#1e1c10] font-medium m-0 pl-1.5 border-l-2 border-[#fed330]">
                เกษียณอายุ 60 มีเงินปันผลเดือนละ ฿40,000 พักผ่อนและท่องเที่ยวอย่างสบายใจ
              </p>
            </div>

            {/* Debt Pledge Card */}
            <div className="p-2 bg-white rounded-xl border border-[#e0dac7] space-y-1">
              <div className="text-[8px] font-bold text-[#747878] flex items-center justify-between">
                <span>🏦 ปลดหนี้: บัตรเครดิต</span>
                <span className="text-emerald-600 font-bold">62%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '62%' }}></div>
              </div>
              <div className="flex justify-between text-[7px]">
                <span className="text-emerald-600 font-bold">ชำระแล้ว ฿24,800</span>
                <span className="text-rose-500 font-mono font-bold">เหลือ ฿15,200</span>
              </div>
            </div>
          </div>

          {/* Right Page: Virtual Pet & Missions */}
          <div className="space-y-2">
            {/* Virtual Pet Avatar Card */}
            <div className="p-2.5 bg-[#faf3e0] rounded-xl border border-[#e0dac7] flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#fed330] flex items-center justify-center text-lg shadow-xs shrink-0">
                🐱
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-[#1e1c10]">น้องถุงเงิน</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10]">Lv.3</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
                <div className="text-[7px] text-[#747878] mt-0.5 flex justify-between">
                  <span>EXP 650/1000</span>
                  <span className="text-amber-700 font-bold">Streak 14 วัน 🔥</span>
                </div>
              </div>
            </div>

            {/* AI Behavioral Score */}
            <div className="p-2 bg-white rounded-xl border border-[#e0dac7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#e8f5e9] border border-emerald-300 flex items-center justify-center font-black font-mono text-xs text-emerald-700">
                  92
                </div>
                <div>
                  <div className="text-[8px] font-bold text-[#1e1c10]">AI Score เดือน ส.ค.</div>
                  <div className="text-[7px] text-emerald-600 font-semibold">เกรด A+ วินัยยอดเยี่ยม</div>
                </div>
              </div>
              <span className="text-base">🏆</span>
            </div>
          </div>
        </div>

        {/* Journal Entry Sample */}
        <div className="bg-white rounded-xl border border-[#e0dac7] p-2.5 space-y-1 text-[9px]">
          <div className="text-[8px] text-[#747878] font-semibold">📅 1 ก.ย. 2569 — บันทึกล่าสุด</div>
          <div className="text-[#1e1c10] font-medium">
            &ldquo;วันนี้ชงกาแฟดื่มเอง ออมเพิ่มได้ 80 บาท โอนเข้าบัญชี DCA เรียบร้อย!&rdquo;
          </div>
          <div className="text-[8px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 flex items-center gap-1">
            <i className="fi fi-sr-sparkles text-[8px]"></i>
            <span>AI: วินัยเล็กๆ แต่ทำทุกวัน จะเติบโตเป็นผลตอบแทนมหาศาลครับ 👏</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const getFeatureHref = (path: string) => {
    if (loading) return path;
    return user ? path : `/login?redirect=${encodeURIComponent(path)}`;
  };

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  // Auto-play every 5s
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const slide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#fff9eb] text-[#1e1c10] flex flex-col selection:bg-[#fed330] selection:text-[#1e1c10] font-sans">
      
      {/* ── Top Header ── */}
      <header className="w-full max-w-7xl mx-auto px-5 sm:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-xl sm:text-2xl font-black tracking-tight text-[#1e1c10] no-underline">
          <img src="/finshield_logo.svg" alt="FinShield Logo" className="w-9 h-9 object-contain rounded-full shadow-xs" />
          <span>FinShield</span>
        </Link>
        <div className="flex items-center gap-2.5">
          {user ? (
            <Link href="/simulator/overview" className="px-5 py-2.5 rounded-full bg-[#fed330] hover:bg-[#fcd020] text-[#1e1c10] font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 no-underline">
              <i className="fi fi-rr-apps text-xs"></i>
              <span>เข้าสู่แดชบอร์ด</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-[#e0dac7] hover:bg-[#faf3e0] text-[#1e1c10] font-bold text-xs sm:text-sm transition-all no-underline">
                เข้าสู่ระบบ
              </Link>
              <Link href="/signup" className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#1e1c10] hover:bg-black text-white font-bold text-xs sm:text-sm shadow-xs transition-all no-underline">
                สมัครใช้งาน
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-10 pt-8 sm:pt-16 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        
        {/* Left Column: Hero Text */}
        <div className="lg:col-span-5 flex flex-col items-start gap-5 sm:gap-6">
          <span className="inline-flex items-center gap-2 bg-[#fed330] text-[#1e1c10] text-xs font-bold px-4 py-1.5 rounded-full shadow-xs">
            แพลตฟอร์มวางแผนการเงินเพื่อวันเกษียณ
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#1e1c10] leading-[1.1] tracking-tight m-0">
            วางแผนการเงิน
            <br />
            เพื่อวันเกษียณ
            <br />
            อย่างสบายใจ
          </h1>

          <p className="text-sm sm:text-base text-[#747878] leading-relaxed m-0 max-w-md">
            FinShield รวมทุกเครื่องมือไว้ในที่เดียว ทั้งแดชบอร์ดภาพรวม
            การตั้งเป้าหมายการเงิน การวางแผนภาษี และไดอารี่เกษียณพร้อม
            สัตว์เลี้ยงการเงินผู้ร่วมทาง ให้การออมและการลงทุนเป็นเรื่อง
            สนุกและต่อเนื่อง
          </p>

          <Link
            href={user ? "/simulator/overview" : "/login"}
            className="inline-flex items-center gap-3 bg-[#1e1c10] hover:bg-black text-white font-bold text-sm sm:text-base px-8 py-4 rounded-full transition-all shadow-[0_4px_16px_rgba(30,28,16,0.18)] hover:shadow-[0_8px_24px_rgba(30,28,16,0.25)] hover:-translate-y-0.5 no-underline"
          >
            <span>{user ? "เข้าสู่แดชบอร์ด" : "เริ่มต้นใช้งาน"}</span>
            <i className="fi fi-rr-arrow-right text-xs mt-0.5"></i>
          </Link>
        </div>

        {/* Right Column: Feature Preview Mockup in Serene Pulse */}
        <div className="lg:col-span-7 flex justify-center">
          <div
            className="w-full max-w-[580px]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <Link
              href={getFeatureHref(slide.href)}
              className="block bg-white rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(30,28,16,0.08)] border border-[#e0dac7] no-underline text-[#1e1c10] transition-all hover:shadow-[0_25px_60px_rgba(30,28,16,0.12)] cursor-pointer group"
            >
              {/* Browser Chrome Header */}
              <div className="flex items-center justify-between border-b border-[#f0e9d6] pb-3 mb-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1e1c10] bg-[#faf3e0] px-3 py-1 rounded-full border border-[#e0dac7]">
                  <img src="/finshield_logo.svg" alt="logo" className="w-3.5 h-3.5 object-contain" />
                  <span>{slide.label}</span>
                </div>
                <div className="w-12"></div>
              </div>

              {/* Slide Content (Real Feature Preview) */}
              <div className="min-h-[310px] flex flex-col justify-between">
                {slide.content}
              </div>

              {/* Bottom CTA bar */}
              <div className="text-center text-[11px] font-bold text-[#747878] group-hover:text-[#1e1c10] flex items-center justify-center gap-1.5 pt-3 mt-2 border-t border-[#f0e9d6] transition-colors">
                <span>{user ? "คลิกเพื่อเปิดหน้านี้" : "เข้าสู่ระบบเพื่อใช้งาน"}</span>
                <i className="fi fi-rr-arrow-right text-[10px] transition-transform group-hover:translate-x-1"></i>
              </div>
            </Link>

            {/* Dot Indicators (No Arrows) */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all cursor-pointer border-0 ${
                    i === currentSlide
                      ? 'w-7 h-2.5 bg-[#fed330]'
                      : 'w-2.5 h-2.5 bg-[#e0dac7] hover:bg-[#cfc9b6]'
                  }`}
                  aria-label={`Go to ${s.label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Section (Serene Pulse Style matching user reference) ── */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-10 py-14 sm:py-20 border-t border-[#f0e9d6]">
        <div className="text-center max-w-lg mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1e1c10] tracking-tight mb-2">
            ฟีเจอร์ทั้งหมดของ FinShield
          </h2>
          <p className="text-sm text-[#747878] m-0">ครบทุกเครื่องมือ เชื่อมต่อกันอย่างลงตัว</p>
        </div>

        {/* 2×2 Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          
          {/* Card 1: แดชบอร์ดภาพรวม (Top-Left: Pure White Card) */}
          <Link
            href={getFeatureHref("/simulator/overview")}
            className="bg-white rounded-3xl p-7 sm:p-9 border border-[#e0dac7] flex flex-col justify-between no-underline text-[#1e1c10] group hover:-translate-y-1 transition-all shadow-xs hover:shadow-md min-h-[280px]"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1e1c10] text-white flex items-center justify-center text-lg mb-5 shadow-xs">
                <i className="fi fi-sr-apps"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold m-0 mb-3 text-[#1e1c10]">
                แดชบอร์ดภาพรวม
              </h3>
              <p className="text-sm text-[#747878] m-0 leading-relaxed font-normal">
                เห็นภาพรวมสินทรัพย์ หนี้สิน และค่าใช้จ่ายในหน้าเดียว พร้อมกราฟการ เจริญเติบโตเกษียณ เปรียบเทียบดอกเบี้ยเงินฝากธนาคาร และคำแนะนำ การจัดพอร์ตการลงทุนจาก AI
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f0e9d6] flex items-center justify-between text-xs">
              <span className="text-[#747878] font-medium">พร้อมผู้ช่วย AI ให้คำแนะนำแบบเรียลไทม์</span>
              <span className="font-bold text-[#1e1c10] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                เปิดแดชบอร์ด <i className="fi fi-rr-arrow-right text-[10px]"></i>
              </span>
            </div>
          </Link>

          {/* Card 2: วางแผนภาษี (Top-Right: Soft Blush Pink Card) */}
          <Link
            href={getFeatureHref("/simulator/tax")}
            className="bg-[#fce4ec] rounded-3xl p-7 sm:p-9 flex flex-col justify-between no-underline text-[#1e1c10] group hover:-translate-y-1 transition-all shadow-xs hover:shadow-md min-h-[280px]"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1e1c10] text-white flex items-center justify-center text-lg mb-5 shadow-xs">
                <i className="fi fi-sr-receipt"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold m-0 mb-3 text-[#1e1c10]">
                วางแผนภาษี
              </h3>
              <p className="text-sm text-[#1e1c10]/75 m-0 leading-relaxed font-normal">
                คำนวณภาษีเงินได้บุคคลธรรมดา พร้อมช่อง ทางลดหย่อนกว่า 25 รายการ ทั้ง SSF, RMF, ประกันชีวิต และ Easy E-Receipt ให้จ่ายภาษี น้อยลงอย่างถูกกฎหมาย
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1e1c10]/10 flex items-center justify-end text-xs">
              <span className="font-bold text-[#1e1c10] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                คำนวณภาษี <i className="fi fi-rr-arrow-right text-[10px]"></i>
              </span>
            </div>
          </Link>

          {/* Card 3: ไดอารี่เกษียณ (Bottom-Left: Buttercup Yellow Card) */}
          <Link
            href={getFeatureHref("/simulator/diary")}
            className="bg-[#fed330] rounded-3xl p-7 sm:p-9 flex flex-col justify-between no-underline text-[#1e1c10] group hover:-translate-y-1 transition-all shadow-xs hover:shadow-md min-h-[280px]"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1e1c10] text-[#fed330] flex items-center justify-center text-lg mb-5 shadow-xs">
                <i className="fi fi-sr-paw"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold m-0 mb-3 text-[#1e1c10]">
                ไดอารี่เกษียณ
              </h3>
              <p className="text-sm text-[#1e1c10]/80 m-0 leading-relaxed font-normal">
                เขียนบันทึกประจำวัน ตั้งความฝันและคำมั่นลดหนี้ แล้วเลี้ยง &ldquo;สัตว์เลี้ยงการเงิน&rdquo; ที่จะโตขึ้นตามวินัยของคุณ พร้อมรีวิว คะแนนจาก AI ทุกสิ้นเดือน
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1e1c10]/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full border border-[#1e1c10]/25 font-bold text-xs">ภารกิจรายเดือน</span>
                <span className="px-3.5 py-1.5 rounded-full border border-[#1e1c10]/25 font-bold text-xs">streak ต่อเนื่อง</span>
              </div>
              <span className="font-bold bg-[#1e1c10] text-white px-5 py-2 rounded-full text-xs flex items-center gap-1.5 group-hover:gap-2.5 transition-all shadow-xs">
                เปิดไดอารี่ <i className="fi fi-rr-arrow-right text-[10px]"></i>
              </span>
            </div>
          </Link>

          {/* Card 4: เป้าหมายการเงิน (Bottom-Right: White Card, Center-Aligned as in user reference) */}
          <Link
            href={getFeatureHref("/simulator/wealth-plan")}
            className="bg-white rounded-3xl p-7 sm:p-9 border border-[#e0dac7] flex flex-col justify-between no-underline text-[#1e1c10] group hover:-translate-y-1 transition-all shadow-xs hover:shadow-md min-h-[280px] text-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#1e1c10] text-white flex items-center justify-center text-lg mb-5 shadow-xs">
                <i className="fi fi-sr-bullseye"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold m-0 mb-3 text-[#1e1c10]">
                เป้าหมายการเงิน
              </h3>
              <p className="text-sm text-[#747878] m-0 leading-relaxed font-normal max-w-md mx-auto">
                ตั้งเป้าหมายเงินสำรองฉุกเฉิน บริหารหนี้ และจำลองสถานการณ์วิกฤต ไม่ว่าจะเป็นการว่างงาน การป่วย หรืออุบัติเหตุ เพื่อให้คุณเตรียมพร้อมรับมือทุกสถานการณ์
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f0e9d6] flex items-center justify-center text-xs">
              <span className="font-bold text-[#1e1c10] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                วางแผนตอนนี้ <i className="fi fi-rr-arrow-right text-[10px]"></i>
              </span>
            </div>
          </Link>

        </div>

        {/* Guarantee / Security Trust Chips */}
        <div className="flex flex-wrap justify-center gap-2.5 mt-10">
          <span className="inline-flex items-center gap-2 bg-white border border-[#e0dac7] text-xs font-bold text-[#1e1c10] px-4 py-2 rounded-full shadow-xs">
            <i className="fi fi-sr-lock text-emerald-600"></i> ปลอดภัยด้วย Firebase Auth
          </span>
          <span className="inline-flex items-center gap-2 bg-white border border-[#e0dac7] text-xs font-bold text-[#1e1c10] px-4 py-2 rounded-full shadow-xs">
            <i className="fi fi-sr-sparkles text-amber-600"></i> ผู้ช่วย AI วิเคราะห์ภาษีและพอร์ต
          </span>
          <span className="inline-flex items-center gap-2 bg-white border border-[#e0dac7] text-xs font-bold text-[#1e1c10] px-4 py-2 rounded-full shadow-xs">
            <i className="fi fi-sr-check-circle text-emerald-600"></i> อ้างอิงสรรพากรไทยปี 2567
          </span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-[#f0e9d6] bg-white py-8 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#747878]">
          <div className="flex items-center gap-2.5">
            <img src="/finshield_logo.svg" alt="FinShield" className="w-5 h-5 object-contain" />
            <span className="font-black text-sm text-[#1e1c10]">FinShield</span>
            <span>· วางแผนการเงินอย่างมั่นคง</span>
          </div>
          <div className="flex items-center gap-5 font-bold">
            {user ? (
              <Link href="/simulator/overview" className="text-[#1e1c10] hover:underline no-underline">แดชบอร์ด</Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-[#1e1c10] no-underline">เข้าสู่ระบบ</Link>
                <Link href="/signup" className="hover:text-[#1e1c10] no-underline">สมัครใช้งาน</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
