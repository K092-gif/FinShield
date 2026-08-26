'use client'

import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fff9eb] text-[#1e1c10] flex flex-col selection:bg-[#fed330] selection:text-[#1e1c10]">
      {/* ── Top Header ── */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-[#1e1c10] no-underline">
          <div className="w-9 h-9 rounded-xl bg-[#1e1c10] text-[#fed330] flex items-center justify-center font-black shadow-sm">
            <i className="fi fi-sr-shield-check text-base"></i>
          </div>
          <span>FinShield</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="w-10 h-10 rounded-full bg-[#f4eedb] text-[#1e1c10] hover:bg-[#eae3ce] flex items-center justify-center transition-all no-underline"
            title="เข้าสู่ระบบเพื่อดูการแจ้งเตือน"
          >
            <i className="fi fi-rr-bell text-base"></i>
          </Link>
          <Link
            href="/login"
            className="w-10 h-10 rounded-full bg-[#fed330] text-[#1e1c10] hover:bg-[#ebc31a] flex items-center justify-center font-bold text-sm shadow-sm no-underline"
            title="เข้าสู่ระบบ"
          >
            <i className="fi fi-sr-user text-sm"></i>
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-10 sm:pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Hero Copy */}
        <div className="lg:col-span-5 flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] text-xs font-bold px-4 py-2 rounded-full shadow-sm">
            <i className="fi fi-sr-sparkling-exclamation text-[#705b00]"></i>
            แพลตฟอร์มวางแผนการเงินเพื่อวันเกษียณ
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-[#1e1c10] leading-[1.15] tracking-tight m-0">
            วางแผนการเงิน
            <br />
            เพื่อวันเกษียณอย่างสบายใจ
          </h1>
          <p className="text-base sm:text-lg text-[#747878] leading-relaxed m-0 font-normal">
            FinShield รวมทุกเครื่องมือไว้ในที่เดียว ทั้งแดชบอร์ดภาพรวม
            การตั้งเป้าหมายการเงิน การวางแผนภาษี
            และไดอารี่เกษียณพร้อมสัตว์เลี้ยงการเงินผู้ร่วมทาง
            ให้การออมและการลงทุนเป็นเรื่องสนุกและต่อเนื่อง
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-[#1e1c10] hover:bg-black text-white font-bold text-base px-8 py-4 rounded-full transition-all shadow-[0_4px_16px_rgba(30,28,16,0.18)] hover:shadow-[0_8px_24px_rgba(30,28,16,0.25)] hover:-translate-y-0.5 no-underline"
            >
              <span>เริ่มต้นใช้งาน</span>
              <i className="fi fi-rr-arrow-right text-sm mt-0.5"></i>
            </Link>
          </div>
        </div>

        {/* Right Column: Floating Mockup — แดชบอร์ดภาพรวมจริงของระบบ */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[620px] bg-white rounded-[32px] p-5 sm:p-7 shadow-[0_20px_50px_rgba(30,28,16,0.06)] border border-[rgba(0,0,0,0.06)] space-y-4">
            {/* Mockup Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs text-[#747878]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              </div>
              <div className="font-semibold text-[#1e1c10]">FinShield · แดชบอร์ดภาพรวม</div>
              <div className="flex gap-2 font-medium">
                <span className="text-[#1e1c10] font-bold">ภาพรวม</span>
                <span>เป้าหมาย</span>
                <span>ภาษี</span>
              </div>
            </div>

            {/* Mockup Body Content */}
            <div className="space-y-4 pt-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#1e1c10] m-0">ยินดีต้อนรับกลับมา 👋</h3>
                  <p className="text-xs text-[#747878] m-0">ภาพรวมการเงินของคุณวันนี้</p>
                </div>
                <div className="flex gap-1 bg-[#f4eedb] p-1 rounded-full text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#fed330] text-[#1e1c10]">1ปี</span>
                  <span className="px-2 py-0.5 text-[#747878]">3ปี</span>
                  <span className="px-2 py-0.5 text-[#747878]">10ปี</span>
                </div>
              </div>

              {/* Stat Boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#faf3e0] p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-[#747878]">สินทรัพย์รวม</div>
                  <div className="text-xl font-extrabold text-[#1e1c10] mt-0.5">฿4,250,000</div>
                  <div className="text-[10px] text-green-600 font-bold mt-1">↑ +2.38% เดือนนี้</div>
                </div>
                <div className="bg-[#ffd8e7] p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-[#747878]">หนี้สินรวม</div>
                  <div className="text-xl font-extrabold text-[#1e1c10] mt-0.5">฿180,000</div>
                  <div className="text-[10px] text-[#747878] mt-1">อัตราส่วนหนี้ต่อทรัพย์สิน 4.2%</div>
                </div>
              </div>

              {/* Chart Mock — การเจริญเงินเกษียณ */}
              <div className="bg-white border border-gray-100 p-3.5 rounded-2xl relative overflow-hidden">
                <div className="text-xs font-bold text-[#1e1c10] mb-2">การเจริญเงินเกษียณ (จำลอง 10 ปี)</div>
                <svg viewBox="0 0 400 100" className="w-full h-20 overflow-visible">
                  <path
                    d="M 0,85 Q 100,75 200,45 T 400,15"
                    fill="none"
                    stroke="#725c00"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 0,90 Q 100,85 200,65 T 400,40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle cx="200" cy="45" r="4" fill="#725c00" stroke="#fff" strokeWidth="2" />
                  <circle cx="200" cy="65" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
                  <circle cx="400" cy="15" r="4" fill="#725c00" stroke="#fff" strokeWidth="2" />
                  <circle cx="400" cy="40" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Bento Section ── */}
      <section className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-24 border-t border-[#f0e9d6]">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1e1c10] tracking-tight mb-3">
            ทุกเครื่องมือที่จำเป็น รวมไว้ในที่เดียว
          </h2>
          <p className="text-base text-[#747878] m-0">
            ออกแบบมาให้ใช้งานง่าย สบายตา และตอบโจทย์การวางแผนการเงินของคนไทย
          </p>
        </div>

        {/* 4-Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: แดชบอร์ดภาพรวม (8 cols) */}
          <div className="md:col-span-8 bg-white rounded-[32px] p-8 sm:p-10 border border-[rgba(0,0,0,0.06)] shadow-[0_4px_24px_rgba(30,28,16,0.03)] flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4 max-w-md z-10">
              <div className="w-12 h-12 rounded-full bg-[#fed330] text-[#1e1c10] flex items-center justify-center text-lg shadow-sm">
                <i className="fi fi-sr-wallet"></i>
              </div>
              <h3 className="text-2xl font-bold text-[#1e1c10] m-0">แดชบอร์ดภาพรวม</h3>
              <p className="text-sm sm:text-base text-[#747878] leading-relaxed m-0">
                เห็นภาพรวมสินทรัพย์ หนี้สิน และค่าใช้จ่ายในหน้าเดียว
                พร้อมกราฟการเจริญเงินเกษียณ เปรียบเทียบดอกเบี้ยเงินฝากธนาคาร
                และคำแนะนำการจัดพอร์ตการลงทุนจาก AI
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-[#747878]">
              <span className="font-semibold text-[#1e1c10]">พร้อมผู้ช่วย AI ให้คำแนะนำแบบเรียลไทม์</span>
              <Link href="/simulator/overview" className="text-[#725c00] font-bold hover:underline no-underline">
                เปิดแดชบอร์ด →
              </Link>
            </div>
          </div>

          {/* Card 2: วางแผนภาษี (4 cols) */}
          <div className="md:col-span-4 bg-[#ffd8e7] rounded-[32px] p-8 sm:p-10 border border-pink-200/50 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#361928] text-[#ffd8e7] flex items-center justify-center text-lg shadow-sm">
                <i className="fi fi-sr-receipt"></i>
              </div>
              <h3 className="text-2xl font-bold text-[#1e1c10] m-0">วางแผนภาษี</h3>
              <p className="text-sm sm:text-base text-[#1e1c10]/80 leading-relaxed m-0">
                คำนวณภาษีเงินได้บุคคลธรรมดา พร้อมช่องทางลดหย่อนกว่า 25 รายการ
                ทั้ง SSF, RMF, ประกันชีวิต และ EASY E-RECEIPT
                ให้จ่ายภาษีน้อยลงอย่างถูกกฎหมาย
              </p>
            </div>
            <div className="mt-8 pt-4">
              <Link href="/simulator/tax" className="text-xs font-extrabold text-[#361928] hover:underline no-underline">
                คำนวณภาษี →
              </Link>
            </div>
          </div>

          {/* Card 3: ไดอารี่เกษียณ (5 cols) */}
          <div className="md:col-span-5 bg-[#fed330] rounded-[32px] p-8 sm:p-10 border border-amber-300/60 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#705b00] text-[#fed330] flex items-center justify-center text-lg shadow-sm">
                <i className="fi fi-sr-paw"></i>
              </div>
              <h3 className="text-2xl font-bold text-[#1e1c10] m-0">ไดอารี่เกษียณ</h3>
              <p className="text-sm sm:text-base text-[#1e1c10]/85 leading-relaxed m-0">
                เขียนบันทึกประจำวัน ตั้งความฝันและคำมั่นลดหนี้
                แล้วเลี้ยง &ldquo;สัตว์เลี้ยงการเงิน&rdquo; ที่จะโตขึ้นตามวินัยของคุณ
                พร้อมรีวิวคะแนนจาก AI ทุกสิ้นเดือน
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="bg-white/80 text-[#1e1c10] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">ภารกิจรายเดือน</span>
              <span className="bg-white/80 text-[#1e1c10] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">streak ต่อเนื่อง</span>
              <Link href="/simulator/diary" className="bg-[#1e1c10] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm no-underline ml-auto">
                เปิดไดอารี่
              </Link>
            </div>
          </div>

          {/* Card 4: เป้าหมายการเงิน (7 cols) */}
          <div className="md:col-span-7 bg-white rounded-[32px] p-8 sm:p-10 border border-[rgba(0,0,0,0.06)] shadow-[0_4px_24px_rgba(30,28,16,0.03)] flex flex-col items-center text-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#1e1c10] text-white flex items-center justify-center text-xl mb-4 shadow-sm">
              <i className="fi fi-sr-bullseye"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#1e1c10] mb-2">เป้าหมายการเงิน</h3>
            <p className="text-sm sm:text-base text-[#747878] leading-relaxed max-w-lg m-0">
              ตั้งเป้าหมายเงินสำรองฉุกเฉิน บริหารหนี้ และจำลองสถานการณ์วิกฤต
              ไม่ว่าจะเป็นการว่างงาน การป่วย หรืออุบัติเหตุ
              เพื่อให้คุณเตรียมพร้อมรับมือทุกสถานการณ์
            </p>
            <Link href="/simulator/wealth-plan" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#725c00] hover:underline no-underline">
              วางแผนตอนนี้ <i className="fi fi-rr-arrow-right text-xs mt-0.5"></i>
            </Link>
          </div>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          <span className="inline-flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] text-xs font-bold text-[#1e1c10] px-4 py-2.5 rounded-full shadow-sm">
            <i className="fi fi-sr-lock text-[#725c00]"></i> ข้อมูลของคุณปลอดภัย
          </span>
          <span className="inline-flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] text-xs font-bold text-[#1e1c10] px-4 py-2.5 rounded-full shadow-sm">
            <i className="fi fi-sr-comments-question text-[#725c00]"></i> ผู้ช่วย AI &ldquo;เพื่อนรู้งาน&rdquo; ตลอด 24 ชม.
          </span>
          <span className="inline-flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] text-xs font-bold text-[#1e1c10] px-4 py-2.5 rounded-full shadow-sm">
            <i className="fi fi-sr-moon text-[#725c00]"></i> รองรับโหมดมืด
          </span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-[#f0e9d6] bg-white py-10">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#747878]">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#1e1c10]">FinShield</span>
            <span>· วางแผนการเงินและวันเกษียณอย่างมั่นคง</span>
          </div>
          <div className="flex gap-6 font-semibold">
            <Link href="/login" className="hover:text-[#1e1c10] no-underline">เข้าสู่ระบบ</Link>
            <Link href="/signup" className="hover:text-[#1e1c10] no-underline">สมัครใช้งาน</Link>
            <Link href="/simulator/overview" className="hover:text-[#1e1c10] no-underline">แดชบอร์ด</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
