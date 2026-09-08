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

// ─── Format inline bold text & clean markdown ───
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold text-[#1e1c10] dark:text-white">
          {content}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function cleanTaxAdviceText(raw: string): string {
  return raw
    .replace(/```(?:markdown|json)?/gi, '')
    .replace(/```/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ParsedAdviceSection {
  type: 'dividend' | 'deductions' | 'steps' | 'general';
  title: string;
  items: string[];
}

function parseTaxAdvice(text: string): ParsedAdviceSection[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections: ParsedAdviceSection[] = [];
  let currentSection: ParsedAdviceSection = {
    type: 'general',
    title: '',
    items: [],
  };

  for (const line of lines) {
    const isHeader = /^#{1,4}\s+/.test(line) || /^[🎯💡📌]/.test(line) || /^\d+\.\s*(กลยุทธ์|ช่องทาง|ทางเลือก|ขั้นตอน)/.test(line);
    
    if (isHeader) {
      if (currentSection.title || currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      const cleanTitle = line.replace(/^#{1,4}\s+/, '').trim();
      let type: ParsedAdviceSection['type'] = 'general';
      if (/ปันผล|dividend|🎯/i.test(cleanTitle)) {
        type = 'dividend';
      } else if (/ลดหย่อน|recommendation|ทางเลือก|ช่องทาง|💡/i.test(cleanTitle)) {
        type = 'deductions';
      } else if (/ขั้นตอน|เอกสาร|ยื่นแบบ|📌/i.test(cleanTitle)) {
        type = 'steps';
      }
      currentSection = { type, title: cleanTitle, items: [] };
    } else {
      const cleanItem = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanItem) {
        currentSection.items.push(cleanItem);
      }
    }
  }

  if (currentSection.title || currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

function extractItemHeading(item: string): string {
  const match = item.match(/^\*\*([^*]+)\*\*[:：]?/);
  if (match) return match[1].replace(/[:：]/g, '').trim();
  const colonMatch = item.match(/^([^:：]+)[:：]/);
  if (colonMatch && colonMatch[1].length < 30) return colonMatch[1].trim();
  return 'คำแนะนำ';
}

function stripItemHeading(item: string): string {
  if (!item) return '';
  const boldMatch = item.match(/^\*\*([^*]+)\*\*[:：\-]?\s*/);
  if (boldMatch) {
    const stripped = item.substring(boldMatch[0].length).trim();
    return stripped || boldMatch[1].trim();
  }
  const colonMatch = item.match(/^([^:：]+)[:：]\s*/);
  if (colonMatch && colonMatch[1].length < 30) {
    const stripped = item.substring(colonMatch[0].length).trim();
    return stripped || colonMatch[1].trim();
  }
  return item.trim();
}

interface RecommendationDropdownItem {
  id: string;
  icon: string;
  iconColor: string;
  badgeBg: string;
  title: string;
  highlightBadge?: string;
  content: string;
}

function getRecommendationItems(
  taxAdviceText: string,
  taxResult: any,
  taxDeductions: any
): RecommendationDropdownItem[] {
  const rate = taxResult?.marginalRate || 0;
  const gross = taxResult?.grossIncome || 0;

  // Real data calculations
  const thaiEsgUsed = Number(taxDeductions?.thaiesg) || 0;
  const thaiEsgMax = Math.min(300000, Math.round(gross * 0.3));
  const thaiEsgRem = Math.max(0, thaiEsgMax - thaiEsgUsed);
  const thaiEsgSave = Math.round(thaiEsgRem * rate);

  const rmfUsed = Number(taxDeductions?.rmf) || 0;
  const ssfUsed = Number(taxDeductions?.ssf) || 0;
  const rmfMax = Math.min(500000, Math.round(gross * 0.3));
  const rmfRem = Math.max(0, rmfMax - rmfUsed - ssfUsed);
  const rmfSave = Math.round(rmfRem * rate);

  const totalFundSave = thaiEsgSave + rmfSave;

  const lifeUsed = Number(taxDeductions?.lifeInsurance) || 0;
  const healthUsed = Number(taxDeductions?.healthInsurance) || 0;
  const lifeRem = Math.max(0, 100000 - lifeUsed - healthUsed);
  const lifeSave = Math.round(lifeRem * rate);

  const items: RecommendationDropdownItem[] = [];

  // 1. กลุ่มกองทุนลดหย่อนภาษี (ThaiESG / RMF / SSF)
  const defaultFundContent = [
    `• **กองทุน ThaiESG (Thailand ESG Fund)**: โควตาคงเหลือ **฿${thaiEsgRem.toLocaleString()}** (สิทธิสูงสุด 300,000 บาท ไม่เกิน 30% ของเงินได้พึงประเมิน) ➔ **จุดเด่นพิเศษ:** วงเงินแยกอิสระ ไม่ถูกนับรวมในเพดานกลุ่มเกษียณ 500,000 บาท และมีระยะเวลาถือครองเพียง **5 ปีปฏิทิน** (นับปีที่ซื้อเป็นปีที่ 1 สภาพคล่องสูงที่สุดในบรรดากองทุนลดหย่อน) หากลงทุนเต็มสิทธิจะช่วยประหยัดภาษีได้ **฿${thaiEsgSave.toLocaleString()}** ตามฐานภาษี (${(rate * 100).toFixed(0)}%)`,
    `• **กองทุน RMF (Retirement Mutual Fund)**: โควตากลุ่มเพื่อการเกษียณคงเหลือ **฿${rmfRem.toLocaleString()}** (สิทธิสูงสุด 30% ของเงินได้ รวม PVD/กบข./ประกันบำนาญ ไม่เกิน 500,000 บาท) ➔ เงื่อนไขต้องลงทุนต่อเนื่องทุกปี (หรือปีเว้นปี) และถือครองจนถึงอายุ **55 ปีบริบูรณ์** (ระยะเวลาลงทุนรวมไม่น้อยกว่า 5 ปีเต็ม) เหมาะสำหรับการสะสมความมั่งคั่งระยะยาวและสร้างเงินเกษียณ`,
    `• **กองทุน SSF (Super Savings Fund)**: สิทธิซื้อสูงสุด 30% ของเงินได้ ไม่เกิน 200,000 บาท (อยู่ในเพดานกลุ่มเกษียณ 500,000 บาท) ➔ เงื่อนไขถือครอง **10 ปีเต็มวันชนวัน** ไม่มีข้อผูกมัดเรื่องการซื้อต่อเนื่องทุกปี เหมาะสำหรับผู้ที่ต้องการออมเงินระยะกลางถึงยาว`,
    `• **กลยุทธ์การจัดสรรเพื่อประโยชน์สูงสุด**: แนะนำเลือกลงทุนใน **ThaiESG เป็นลำดับแรก** เพื่อใช้สิทธิวงเงินพิเศษและได้เงินคืนเร็วที่สุด (5 ปี) จากนั้นจัดสรรเงินส่วนที่เหลือไปยัง **RMF ในสินทรัพย์ที่มีโอกาสเติบโตสูง** (เช่น กองทุนดัชนีหุ้นโลกหรือหุ้นสหรัฐฯ) เพื่อสร้างผลตอบแทนชนะเงินเฟ้อ ➔ หากใช้สิทธิเต็มโควตาทั้งหมดจะประหยัดภาษีได้รวมถึง **฿${totalFundSave.toLocaleString()}**`,
  ];

  items.push({
    id: 'topic_funds',
    title: 'กองทุนลดหย่อนภาษี (ThaiESG / RMF / SSF)',
    icon: 'fi-sr-leaf',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40',
    highlightBadge: totalFundSave > 0 ? `ประหยัดภาษีได้สูงสุด ฿${totalFundSave.toLocaleString()}` : undefined,
    content: defaultFundContent.join('\n'),
  });

  // 2. กลุ่มเบี้ยประกันชีวิตและสุขภาพ
  const defaultInsuranceContent = [
    `• **เบี้ยประกันชีวิตทั่วไปและเงินฝากสงเคราะห์ชีวิต**: หักลดหย่อนได้ตามที่จ่ายจริง สูงสุดไม่เกิน **100,000 บาท** ➔ เงื่อนไขสำคัญคือกรมธรรม์ต้องมีระยะเวลาคุ้มครองตั้งแต่ **10 ปีขึ้นไป** และหากมีเงินคืนระหว่างสัญญา เงินคืนต้องไม่เกิน 20% ของเบี้ยประกันสะสม`,
    `• **เบี้ยประกันสุขภาพตนเอง**: หักลดหย่อนได้ตามจ่ายจริง สูงสุดไม่เกิน **25,000 บาท** (เมื่อรวมกับประกันชีวิตทั่วไปแล้วต้องไม่เกิน 100,000 บาท) ➔ **ข้อควรระวัง:** ต้องแจ้งความยินยอม (Consent) ให้บริษัทประกันส่งข้อมูลเบี้ยประกันเข้าสู่ระบบของกรมสรรพากรโดยตรง จึงจะสามารถใช้สิทธิลดหย่อนได้`,
    `• **เบี้ยประกันสุขภาพบิดามารดา**: ลดหย่อนได้ตามจ่ายจริงสูงสุด **15,000 บาทต่อคน** ➔ เงื่อนไขคือบิดามารดาต้องมีเงินได้พึงประเมินทั้งปีไม่เกิน 30,000 บาท (ใช้สิทธิได้ทั้งของตนเองและคู่สมรส)`,
    `• **เบี้ยประกันชีวิตแบบบำนาญ (Annuity Insurance)**: ลดหย่อนได้สูงสุด 15% ของเงินได้ ไม่เกิน **200,000 บาท** (อยู่ในเพดานกลุ่มเกษียณ 500,000 บาท ร่วมกับ RMF/PVD) ➔ ให้เงินบำนาญจ่ายคืนสม่ำเสมอหลังเกษียณ (อายุ 55-85 ปีขึ้นไป) มีความมั่นคงสูง`,
    `• **กลยุทธ์การวางแผนความคุ้มครอง**: แนะนำถือประกันสุขภาพแบบเหมาจ่ายอย่างน้อย 1 ฉบับ เพื่อทำหน้าที่เป็น "Financial Shield" ปกป้องเงินออมไม่ให้สูญหายจากค่ารักษาพยาบาลยามฉุกเฉิน โควตาคงเหลือของคุณอยู่ที่ **฿${lifeRem.toLocaleString()}** ซึ่งหากใช้เต็มสิทธิจะช่วยประหยัดภาษีได้ **฿${lifeSave.toLocaleString()}**`,
  ];

  items.push({
    id: 'topic_insurance',
    title: 'เบี้ยประกันชีวิตและสุขภาพ',
    icon: 'fi-sr-shield-check',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40',
    highlightBadge: lifeSave > 0 ? `ประหยัดภาษีได้สูงสุด ฿${lifeSave.toLocaleString()}` : undefined,
    content: defaultInsuranceContent.join('\n'),
  });

  // 3. กลุ่มขั้นตอนการยื่นแบบและเอกสารสำคัญ
  const defaultFilingContent = [
    `• **เอกสารสำคัญที่ต้องรวบรวมก่อนยื่นแบบ**: หนังสือรับรองหัก ณ ที่จ่าย (ใบ 50 ทวิ) จากนายจ้าง (มาตรา 40(1)) หรือรายได้เสริม (มาตรา 40(2)), หนังสือรับรองการซื้อกองทุนลดหย่อนภาษี (ThaiESG / RMF / SSF), และหนังสือรับรองการชำระเบี้ยประกันภัย ➔ ปัจจุบันสามารถตรวจสอบข้อมูลส่วนใหญ่ได้ผ่านระบบ **My Tax Account** ของกรมสรรพากรก่อนยื่นจริง`,
    `• **ช่องทางและกำหนดเวลาการยื่นแบบ**: ยื่นแบบออนไลน์ผ่านระบบ **E-FILING ของกรมสรรพากร (efiling.rd.go.th)** หรือแอป **RD Smart Tax** ได้ตั้งแต่วันที่ **1 มกราคม ถึง 8 เมษายน** ของปีถัดไป (ได้เวลาเพิ่ม 8 วันจากการยื่นแบบกระดาษ)`,
    `• **การเลือกแบบแสดงรายการภาษี**: มนุษย์เงินเดือนที่มีรายได้จากเงินเดือนประจำอย่างเดียวใช้ **ภ.ง.ด. 91** / หากมีเงินได้อื่นๆ ร่วมด้วย (เช่น เงินปันผลหุ้น, ค่าจ้างฟรีแลนซ์, ค่าเช่า) ต้องยื่นแบบ **ภ.ง.ด. 90**`,
    `• **เทคนิคการขอคืนภาษีให้ได้เงินเร็วที่สุด**: แนะนำให้ผูกบัญชี **พร้อมเพย์ (PromptPay) ด้วยเลขบัตรประชาชน 13 หลัก** กับธนาคารหลัก กรมสรรพากรจะโอนเงินภาษีคืนเข้าบัญชีโดยตรง รวดเร็วภายใน 3–7 วันทำการหลังการอนุมัติแบบ`,
    `• **การยื่นขอเครดิตภาษีเงินปันผล (ม.47 ทวิ)**: สามารถดาวน์โหลดไฟล์สรุปเงินปันผลจากระบบ **Investor Portal ของ TSD** แล้วนำมาอัปโหลดเข้าระบบ E-Filing ระบบจะดึงข้อมูลเงินปันผลและคำนวณเครดิตภาษีให้แบบอัตโนมัติ ไม่ต้องกรอกตัวเลขทีละบริษัท`,
  ];

  items.push({
    id: 'topic_filing',
    title: 'ขั้นตอนการยื่นแบบและเอกสารสำคัญ',
    icon: 'fi-sr-document-signed',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-800/40',
    highlightBadge: 'ภ.ง.ด. 90/91',
    content: defaultFilingContent.join('\n'),
  });

  // 4. กลุ่มสิทธิประโยชน์และค่าลดหย่อนอื่นๆ
  const defaultOtherContent = [
    `• **ค่าลดหย่อนกลุ่มครอบครัวและส่วนตัว**: ค่าลดหย่อนส่วนตัว **60,000 บาท** (ทุกคนได้รับสิทธิอัตโนมัติ), ค่าลดหย่อนคู่สมรสที่ไม่มีเงินได้ **60,000 บาท**, ค่าลดหย่อนบุตรคนละ **30,000 บาท** (บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561 ได้รับสิทธิคนละ **60,000 บาท** ไม่จำกัดจำนวนบุตร), ค่าอุปการะเลี้ยงดูบิดามารดาคนละ **30,000 บาท** (อายุ 60 ปีขึ้นไปและมีรายได้ไม่เกิน 30,000 บาท/ปี สูงสุด 4 คน รวม 120,000 บาท), และค่าฝากครรภ์/คลอดบุตรตามจ่ายจริงไม่เกิน **60,000 บาทต่อการตั้งครรภ์**`,
    `• **ค่าลดหย่อนกลุ่มที่อยู่อาศัย**: ดอกเบี้ยเงินกู้ยืมเพื่อซื้อ เช่าซื้อ หรือสร้างที่อยู่อาศัย หักลดหย่อนได้ตามจ่ายจริงสูงสุดไม่เกิน **100,000 บาท** (สามารถนำหนังสือรับรองดอกเบี้ยจากสถาบันการเงินมายื่นได้ และกรณีกู้ร่วมสามารถเฉลี่ยสิทธิได้)`,
    `• **ค่าลดหย่อนกลุ่มเงินบริจาค**: เงินบริจาคเพื่อการศึกษา การกีฬา สถานพยาบาลรัฐ และกองทุนเพื่อความเสมอภาคทางการศึกษา (กสศ.) ลดหย่อนได้ **2 เท่าของยอดจ่ายจริง** สูงสุดไม่เกิน 10% ของเงินได้สุทธิหลังหักลดหย่อนอื่นๆ (แนะนำบริจาคผ่านระบบ **e-Donation** ข้อมูลจะส่งตรงเข้าสรรพากรโดยไม่ต้องเก็บหลักฐานใบเสร็จกระดาษ) / เงินบริจาคทั่วไปหักได้ตามจริงไม่เกิน 10%`,
    `• **มาตรการกระตุ้นเศรษฐกิจของภาครัฐ (Easy E-Receipt)**: หักลดหย่อนค่าซื้อสินค้าหรือบริการในประเทศตามจ่ายจริง พร้อมใบกำกับภาษีเต็มรูปแบบอิเล็กทรอนิกส์ (e-Tax Invoice & e-Receipt) ตามวงเงินและช่วงเวลาที่รัฐบาลประกาศบังคับใช้ในแต่ละปี`,
  ];

  items.push({
    id: 'topic_other',
    title: 'สิทธิประโยชน์และค่าลดหย่อนอื่นๆ',
    icon: 'fi-sr-sparkles',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40',
    highlightBadge: 'ค่าลดหย่อนเพิ่มเติม',
    content: defaultOtherContent.join('\n'),
  });

  return items;
}

// ─── AI Overview Unified Summary ──────────────────────────────────────────
interface AiOverviewNote {
  title: string;
  desc: string;
  icon: string;
  iconColor: string;
  badge?: string;
  highlight?: boolean;
}

interface AiOverviewResult {
  notes: AiOverviewNote[];
}

function getAiOverviewData(
  _taxAdviceText?: string,
  _taxResult?: any,
  _taxDeductions?: any
): AiOverviewResult {
  const notes: AiOverviewNote[] = [
    {
      title: 'การคุมเพดานกลุ่มเกษียณ (ระวังซื้อเกินสิทธิ)',
      desc: `สิทธิลดหย่อน **RMF, SSF, กองทุนสำรองเลี้ยงชีพ (PVD/กบข.), และประกันบำนาญ** นับรวมกันต้อง **ไม่เกิน 500,000 บาท** (และไม่เกิน 15–30% ของเงินได้) ➔ **จุดที่คนพลาดบ่อยที่สุด:** หากบริษัทมีหักเงินสะสม PVD อยู่แล้ว ต้องนำยอดสะสมทั้งปีมาหักออกจาก 500,000 บาทก่อนซื้อ RMF เพิ่ม มิฉะนั้นส่วนที่เกินจะไม่สามารถนำไปลดหย่อนได้ และกำไรตอนขายคืนอาจต้องเสียภาษี`,
      icon: 'fi-sr-vault',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badge: 'เพดานรวม 500,000 บ.',
    },
    {
      title: 'ลำดับความสำคัญในการจัดสรรกองทุน',
      desc: `แนะนำเลือกลงทุนใน **ThaiESG เป็นลำดับแรก** เนื่องจากมีระยะเวลาถือครองเพียง **5 ปีปฏิทิน** (สั้นที่สุดและมีสภาพคล่องสูง) อีกทั้งเป็นวงเงินแยกพิเศษ 300,000 บาท ไม่ถูกนำไปรวมกับเพดาน 500,000 บาทของกลุ่มเกษียณ (RMF/SSF/PVD)`,
      icon: 'fi-sr-leaf',
      iconColor: 'text-teal-600 dark:text-teal-400',
      badge: 'ThaiESG ลำดับแรก',
    },
    {
      title: 'เงื่อนไขถือครองและบทลงโทษ (เงินเย็นเท่านั้น)',
      desc: `กองทุนลดหย่อนภาษีมีเงื่อนไขระยะเวลาถือครองเข้มงวด (ThaiESG **5 ปีปฏิทิน**, SSF **10 ปีวันชนวัน**, RMF **จนถึงอายุ 55 ปีบริบูรณ์ และไม่น้อยกว่า 5 ปี**) ➔ **ข้อควรระวังสูงสุด:** หากขายคืนก่อนกำหนด จะต้อง **คืนเงินภาษีที่เคยได้รับยกเว้นย้อนหลังทั้งหมด พร้อมเงินเพิ่ม 1.5% ต่อเดือน** นับแต่วันที่ยื่นแบบ จึงควรนำเฉพาะ "เงินเย็น" ที่ไม่ต้องใช้ฉุกเฉินมาลงทุน`,
      icon: 'fi-sr-triangle-warning',
      iconColor: 'text-rose-600 dark:text-rose-400',
      badge: 'ค่าปรับ 1.5%/เดือน',
    },
    {
      title: 'จุดควรระวังสำคัญก่อนยื่นแบบ',
      desc: `• **เบี้ยประกันสุขภาพ:** ต้องแจ้งความยินยอม (Consent) ให้บริษัทประกันส่งข้อมูลเข้าระบบกรมสรรพากรโดยตรง มิฉะนั้นจะไม่สามารถใช้สิทธิได้\n• **การขอคืนภาษี:** ผูกบัญชี **พร้อมเพย์ด้วยเลขบัตรประชาชน** ไว้ล่วงหน้า จะได้รับเงินโอนคืนรวดเร็วภายใน 3–7 วันทำการ`,
      icon: 'fi-sr-shield-exclamation',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badge: 'ข้อควรระวัง',
    },
  ];

  return {
    notes,
  };
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

  // ─── AI Advice Dropdown Accordion state ────────────────────────────
  const [openAdviceAccordions, setOpenAdviceAccordions] = useState<Record<string, boolean>>({
    status_card: false,
    ai_overview: false,
    topic_funds: false,
  });

  const toggleAdviceAccordion = (id: string) => {
    setOpenAdviceAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold text-[#1e1c10] dark:text-gray-200">{label}</label>
        {hint && <span className="text-[11px] text-[#747878] dark:text-gray-400 font-medium">{hint}</span>}
      </div>
      <div className="relative">
        {unit === '฿' && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] font-bold text-xs font-mono">฿</span>
        )}
        <input
          type="number"
          placeholder={placeholder || "0"}
          className={`w-full bg-[#faf3e0]/40 dark:bg-gray-800/60 border border-[#e0dac7] dark:border-gray-700 rounded-xl py-2 ${unit === '฿' ? 'pl-8 pr-3' : 'px-3.5'} text-xs sm:text-sm font-semibold font-mono text-[#1e1c10] dark:text-white focus:ring-2 focus:ring-[#fed330] focus:border-[#fed330] transition-all outline-none`}
          value={taxDeductions[field] as string}
          onChange={(e) => setTaxDeductions({ ...taxDeductions, [field]: e.target.value })}
        />
        {unit !== '฿' && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#747878] font-bold text-xs">{unit}</span>
        )}
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
            content: `ช่วยสรุปข้อมูลภาษีเป็น 3 ข้อตามนี้จากข้อมูลจริง: ${JSON.stringify(payload)}.
1. สรุปสถานะภาษีปัจจุบัน: เอาแค่ รายได้รวม, เงินได้สุทธิ, จ่ายภาษีเท่าไหร่, ที่ฐานภาษีกี่เปอร์เซ็นต์
2. วิเคราะห์กลยุทธ์เงินปันผลและเครดิตภาษี (มาตรา 47 ทวิ): เอาแค่ เงินปันผลประจำปี, หัก 10%, ควรเลือกยื่นแบบไหน, จ่ายหรือได้คืนเท่าไหร่
3. คำแนะนำที่สำคัญ: รวมคำแนะนำในเรื่องเดียวกันไว้ด้วยกันเป็น 3 หัวข้อ (1. กองทุนลดหย่อนภาษี ThaiESG / RMF / SSF รวมไว้ด้วยกัน, 2. เบี้ยประกันชีวิตและสุขภาพ, 3. ขั้นตอนการยื่นแบบและเอกสารสำคัญ) อธิบายข้อมูลรวมในแต่ละหัวข้อ พร้อมโควตาคงเหลือและภาษีที่ประหยัดได้`,
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
    // Check local cache first for instant display
    if (user?.uid) {
      try {
        const cached = localStorage.getItem(`finshield-tax-histories-${user.uid}`);
        if (cached) setTaxHistories(JSON.parse(cached));
      } catch {}
    }
    const headers = await getAuthHeader();
    if (!headers) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tax-history`, { headers });
      if (res.ok) {
        const data = await res.json();
        const records = data.data || [];
        setTaxHistories(records);
        if (user?.uid) {
          try {
            localStorage.setItem(`finshield-tax-histories-${user.uid}`, JSON.stringify(records));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load tax histories:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [getAuthHeader, user]);

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
    const snap = JSON.stringify({ annualIncome: record.annualIncome, taxDeductions: d, selectedTaxYear: record.taxYear });
    setLastSavedSnapshot(snap);
    setTaxSubTab('deductions');
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`finshield-tax-ai-advice-${user?.uid || 'guest'}`);
    if (saved) setTaxAdvice(cleanTaxAdviceText(saved));
  }, [user]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs font-sans">
        <div className="font-bold text-[#1e1c10] dark:text-white mb-2">พ.ศ. {label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-[#747878] dark:text-gray-400">{p.name}:</span>
            <span className="font-mono font-bold text-[#1e1c10] dark:text-white">฿{Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderTaxAdvice = (text: string) => {
    const annualDiv = typeof annualDividendInput === 'number' ? annualDividendInput : 0;
    const recommendationItems = getRecommendationItems(text, taxResult, taxDeductions);
    const aiOverview = getAiOverviewData(text, taxResult, taxDeductions);

    return (
      <div className="space-y-4">
        {/* ─── การ์ดรวม: สถานะภาษีปัจจุบัน (Dropdown Accordion) ─── */}
        <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleAdviceAccordion('status_card')}
            className="w-full flex items-center justify-between p-4 sm:px-5 text-left bg-transparent border-0 cursor-pointer hover:bg-[#faf3e0]/40 dark:hover:bg-gray-800/40 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#1e1c10] dark:text-white block">
                  สถานะภาษีปัจจุบัน
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-full shrink-0">
                  พ.ศ. {selectedTaxYear}
                </span>
              </div>
              <span className="text-[11px] text-[#747878] dark:text-gray-400 block truncate">
                สรุปตัวเลขภาษีและวิเคราะห์กลยุทธ์เงินปันผลประจำปี
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 font-mono">
                จ่ายภาษี ฿{fmt(taxResult.taxWithDeductions)} ({(taxResult.marginalRate * 100).toFixed(0)}%)
              </span>
              <div className="w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-gray-800 flex items-center justify-center text-[#747878] dark:text-gray-400 shrink-0">
                <i className={`fi ${openAdviceAccordions['status_card'] ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-xs transition-transform duration-200`} />
              </div>
            </div>
          </button>

          {openAdviceAccordions['status_card'] && (
            <div className="p-4 sm:p-5 border-t border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/15 dark:bg-gray-900/30 space-y-4">
              {/* ส่วนที่ 1: สรุปสถานะภาษี */}
              <div>
                <div className="text-xs font-bold text-[#747878] dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <i className="fi fi-sr-receipt text-[11px] text-amber-600 dark:text-amber-400" />
                  <span>สรุปตัวเลขภาษี</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* รายได้รวม */}
                  <div className="bg-[#faf3e0]/40 dark:bg-gray-800/50 rounded-xl p-3 border border-[#e0dac7]/70 dark:border-gray-700/60">
                    <div className="text-[11px] text-[#747878] dark:text-gray-400 font-bold mb-1">รายได้รวม</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-[#1e1c10] dark:text-white">
                      ฿{fmt(taxResult.grossIncome)}
                    </div>
                  </div>

                  {/* เงินได้สุทธิ */}
                  <div className="bg-[#faf3e0]/40 dark:bg-gray-800/50 rounded-xl p-3 border border-[#e0dac7]/70 dark:border-gray-700/60">
                    <div className="text-[11px] text-[#747878] dark:text-gray-400 font-bold mb-1">เงินได้สุทธิ</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-[#1e1c10] dark:text-white">
                      ฿{fmt(taxResult.netIncome)}
                    </div>
                  </div>

                  {/* จ่ายภาษีเท่าไหร่ */}
                  <div className="bg-rose-50/50 dark:bg-rose-950/30 rounded-xl p-3 border border-rose-200/70 dark:border-rose-900/60">
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 font-bold mb-1">จ่ายภาษีเท่าไหร่</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-rose-600 dark:text-rose-400">
                      ฿{fmt(taxResult.taxWithDeductions)}
                    </div>
                  </div>

                  {/* ฐานภาษีกี่เปอร์เซ็นต์ */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200/70 dark:border-amber-900/60">
                    <div className="text-[11px] text-amber-800 dark:text-amber-400 font-bold mb-1">ฐานภาษีกี่เปอร์เซ็นต์</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
                      {(taxResult.marginalRate * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 2: วิเคราะห์กลยุทธ์เงินปันผลและเครดิตภาษี (มาตรา 47 ทวิ) */}
              <div className="pt-3 border-t border-[#f0e9d6] dark:border-gray-700/60">
                <div className="text-xs font-bold text-[#747878] dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <i className="fi fi-sr-coins text-[11px] text-amber-600 dark:text-amber-400" />
                  <span>วิเคราะห์กลยุทธ์เงินปันผลและเครดิตภาษี (มาตรา 47 ทวิ)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* เงินปันผลประจำปี */}
                  <div className="bg-[#faf3e0]/40 dark:bg-gray-800/50 rounded-xl p-3 border border-[#e0dac7]/70 dark:border-gray-700/60">
                    <div className="text-[11px] text-[#747878] dark:text-gray-400 font-bold mb-1">เงินปันผลประจำปี</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-[#1e1c10] dark:text-white">
                      {annualDiv > 0 ? `฿${fmt(annualDiv)}` : 'ไม่มีเงินปันผล (฿0)'}
                    </div>
                  </div>

                  {/* หัก 10% */}
                  <div className="bg-[#faf3e0]/40 dark:bg-gray-800/50 rounded-xl p-3 border border-[#e0dac7]/70 dark:border-gray-700/60">
                    <div className="text-[11px] text-[#747878] dark:text-gray-400 font-bold mb-1">หัก 10%</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-[#1e1c10] dark:text-white">
                      {annualDiv > 0 ? `฿${fmt(dividendResult.withholdingTax)}` : '฿0'}
                    </div>
                  </div>

                  {/* ควรเลือกยื่นแบบไหน */}
                  <div className={`rounded-xl p-3 border ${
                    annualDiv > 0 && dividendResult.shouldClaimRefund
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                      : annualDiv > 0
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/60'
                  }`}>
                    <div className="text-[11px] font-bold text-[#747878] dark:text-gray-400 mb-1">ควรเลือกยื่นแบบไหน</div>
                    <div className="text-xs sm:text-sm font-extrabold">
                      {annualDiv > 0 ? (
                        dividendResult.shouldClaimRefund ? (
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <i className="fi fi-sr-check-circle text-xs" /> ยื่นรวมเพื่อขอคืนภาษี
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <i className="fi fi-sr-shield-check text-xs" /> หัก 10% (Final Tax)
                          </span>
                        )
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">
                          ไม่มีเงินปันผลในปีนี้
                        </span>
                      )}
                    </div>
                  </div>

                  {/* จ่ายเท่าไหร่ / ได้คืนเท่าไหร่ */}
                  <div className={`rounded-xl p-3 border ${
                    annualDiv > 0 && dividendResult.shouldClaimRefund
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                      : annualDiv > 0 && dividendResult.additionalTaxPayable > 0
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/60'
                  }`}>
                    <div className="text-[11px] font-bold text-[#747878] dark:text-gray-400 mb-1">จ่าย / ได้คืนสุทธิ</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono">
                      {annualDiv > 0 ? (
                        dividendResult.shouldClaimRefund ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ได้คืน ฿{fmt(dividendResult.refundAmount)}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            จ่ายเพิ่ม ฿{fmt(dividendResult.additionalTaxPayable)}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-500 font-mono">฿0</span>
                      )}
                    </div>
                  </div>
                </div>

                {annualDiv === 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <i className="fi fi-sr-bulb text-amber-600 shrink-0" />
                    <span>
                      ที่ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) หากมีหุ้นปันผลในอนาคต การเลือกยื่นรวมเพื่อขอเครดิตภาษีจะได้คืนเงินภาษีส่วนต่างอย่างคุ้มค่า
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── การ์ดรวม: สรุปข้อสังเกตสำคัญจาก AI (Dropdown Accordion) ─── */}
        <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-amber-200/80 dark:border-amber-800/60 overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => toggleAdviceAccordion('ai_overview')}
            className="w-full flex items-center justify-between p-4 sm:px-5 text-left bg-transparent border-0 cursor-pointer hover:bg-[#faf3e0]/40 dark:hover:bg-gray-800/40 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#1e1c10] dark:text-white block">
                  สรุปข้อสังเกตสำคัญจาก AI
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                  ภาพรวมที่ควรรู้
                </span>
              </div>
              <span className="text-[11px] text-[#747878] dark:text-gray-400 block truncate">
                สรุปภาพรวมสิ่งที่ต้องรู้และข้อควรระวังในการวางแผนภาษีเฉพาะสำหรับคุณ
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="hidden sm:inline-flex text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                4 ข้อสังเกตสำคัญ
              </span>
              <div className="w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-gray-800 flex items-center justify-center text-[#747878] dark:text-gray-400 shrink-0">
                <i className={`fi ${openAdviceAccordions['ai_overview'] ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-xs transition-transform duration-200`} />
              </div>
            </div>
          </button>

          {openAdviceAccordions['ai_overview'] && (
            <div className="p-4 sm:p-5 border-t border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/15 dark:bg-gray-900/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiOverview.notes.map((note, nIdx) => (
                  <div
                    key={nIdx}
                    className="bg-white/80 dark:bg-gray-800/60 border border-[#e0dac7]/70 dark:border-gray-700/60 p-3.5 rounded-xl transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#1e1c10] dark:text-white">
                        <i className={`fi ${note.icon} ${note.iconColor} text-xs shrink-0`} />
                        <span>{note.title}</span>
                      </div>
                      {note.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 border border-[#e0dac7] dark:border-gray-700 text-[#747878] dark:text-gray-300 shrink-0">
                          {note.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#555] dark:text-gray-300 leading-relaxed pl-5 whitespace-pre-line">
                      {renderFormattedText(note.desc)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── คำแนะนำที่สำคัญ (Dropdown Accordions) ─── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0">
                <i className="fi fi-sr-lightbulb-on" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#1e1c10] dark:text-white">
                คำแนะนำที่สำคัญ (กดเพื่อ Drop Down ดูข้อมูล)
              </h3>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
              ลดหย่อนภาษี
            </span>
          </div>

          <div className="space-y-2.5">
            {recommendationItems.map((item, idx) => {
              const isOpen = !!openAdviceAccordions[item.id || `item_${idx}`];
              const lines = item.content.split('\n').map(l => l.trim()).filter(Boolean);

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 overflow-hidden shadow-2xs transition-all"
                >
                  {/* Dropdown Header */}
                  <button
                    type="button"
                    onClick={() => toggleAdviceAccordion(item.id || `item_${idx}`)}
                    className="w-full flex items-center justify-between p-4 sm:px-5 text-left bg-transparent border-0 cursor-pointer hover:bg-[#faf3e0]/40 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#1e1c10] dark:text-white block">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.highlightBadge && (
                        <span className="hidden sm:inline-flex text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          {item.highlightBadge}
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-full bg-[#faf3e0] dark:bg-gray-800 flex items-center justify-center text-[#747878] dark:text-gray-400 shrink-0">
                        <i className={`fi ${isOpen ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-xs transition-transform duration-200`} />
                      </div>
                    </div>
                  </button>

                  {/* Dropdown Content */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-3 border-t border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/15 dark:bg-gray-900/30 text-xs sm:text-sm text-[#333] dark:text-gray-200 leading-relaxed space-y-3">
                      {lines.map((line, lIdx) => {
                        const textContent = line.replace(/^[•\-]\s*/, '');
                        const isHighlight = /กลยุทธ์|เทคนิค|ข้อควรระวัง|จุดเด่น|ข้อสังเกต/i.test(textContent);

                        return (
                          <div
                            key={lIdx}
                            className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                              isHighlight
                                ? 'bg-amber-500/10 dark:bg-amber-400/10 border border-amber-300/50 dark:border-amber-700/50'
                                : 'bg-white/60 dark:bg-gray-800/40 border border-[#e0dac7]/60 dark:border-gray-700/40'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              isHighlight
                                ? 'bg-amber-500 dark:bg-amber-400 ring-4 ring-amber-500/20'
                                : 'bg-emerald-600 dark:bg-emerald-400'
                            }`} />
                            <div className="flex-1 leading-relaxed">
                              {renderFormattedText(textContent)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* ── Header & Sub-tab Navigation (Serene Pulse Header) ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-[#f0e9d6] dark:border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e1c10] dark:text-white tracking-tight flex items-center gap-2">
            Tax <span className="font-medium text-[#747878] dark:text-gray-400">Optimizer</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#747878] dark:text-gray-400 mt-0.5">
            วางแผนลดหย่อนภาษี และคำนวณเครดิตภาษีเงินปันผลอัตโนมัติ
          </p>
        </div>

        <div className="flex w-full sm:w-auto bg-[#faf3e0] dark:bg-gray-800/80 p-1.5 rounded-full border border-[#e0dac7] dark:border-gray-700 shadow-xs">
          <button
            onClick={() => setTaxSubTab('deductions')}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'deductions'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
            }`}
          >
            ลดหย่อนภาษี
          </button>
          <button
            onClick={() => setTaxSubTab('ai-analysis')}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'ai-analysis'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
            }`}
          >
            วิเคราะห์ด้วย AI
          </button>
          <button
            onClick={() => setTaxSubTab('history')}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              taxSubTab === 'history'
                ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                : 'text-[#747878] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
            }`}
          >
            ประวัติ & แนวโน้ม
          </button>
        </div>
      </div>

      {/* ═══════════════ TAB 1: DEDUCTIONS ═══════════════ */}
      {taxSubTab === 'deductions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ── LEFT COLUMN (7/12): Form & Accordions ── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Section 1: Annual Income + Tax Year + Save (Unified Clean Bento Card) */}
            <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0e9d6] dark:border-gray-700/60 mb-4">
                <div className="w-9 h-9 rounded-2xl bg-[#faf3e0] dark:bg-gray-700 text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-base shadow-sm border border-[#e0dac7]/60 shrink-0">
                  <i className="fi fi-sr-money-bill-wave"></i>
                </div>
                <div>
                  <div className="text-base font-bold text-[#1e1c10] dark:text-white">
                    ข้อมูลรายได้ต่อปี
                  </div>
                  <div className="text-xs text-[#747878] dark:text-gray-400 mt-0.5">
                    ระบุรายได้ทั้งปีเพื่อคำนวณฐานภาษีและบันทึกประวัติภาษี
                  </div>
                </div>
              </div>

              {/* 2-Column Row: Income input + Year Selector & Save Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-gray-200 mb-1.5">
                    รายได้รวมทั้งปี (เงินเดือน โบนัส ฯลฯ)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] font-bold text-sm font-mono">฿</span>
                    <input
                      type="number"
                      className="w-full bg-[#faf3e0]/40 dark:bg-gray-900/60 border border-[#e0dac7] dark:border-gray-700 rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-bold text-[#1e1c10] dark:text-white font-mono focus:ring-2 focus:ring-[#fed330] focus:border-[#fed330] transition-all outline-none"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="เช่น 1200000"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#747878] dark:text-gray-400 mb-1.5">
                      ปีภาษี (พ.ศ.)
                    </label>
                    <select
                      className="w-full bg-[#faf3e0]/40 dark:bg-gray-900/60 border border-[#e0dac7] dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white focus:ring-2 focus:ring-[#fed330] outline-none"
                      value={selectedTaxYear}
                      onChange={(e) => setSelectedTaxYear(Number(e.target.value))}
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>พ.ศ. {y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="shrink-0">
                    <label className="block text-xs font-bold text-transparent select-none mb-1.5">
                      บันทึก
                    </label>
                    <button
                      onClick={saveTaxHistory}
                      disabled={savingHistory || !user}
                      className="py-2.5 px-4 bg-[#1e1c10] hover:bg-black disabled:bg-gray-400 text-white dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:cursor-not-allowed border-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <i className="fi fi-sr-disk"></i>
                      <span>{savingHistory ? 'บันทึก...' : 'บันทึก'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Alert Banners */}
              {saveMessage && (
                <div className={`mt-3.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border flex items-center gap-2 ${
                  saveMessage.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}>
                  <i className={`fi ${saveMessage.type === 'success' ? 'fi-sr-check-circle text-emerald-600' : 'fi-sr-exclamation text-rose-600'}`} />
                  <span>{saveMessage.text}</span>
                </div>
              )}

              {showUnsavedWarning && (
                <div className="mt-3.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
                  <i className="fi fi-sr-triangle-warning text-amber-600 shrink-0" />
                  <span>มีข้อมูลที่แก้ไขแต่ยังไม่ได้บันทึก อย่าลืมกดปุ่ม "บันทึก" เพื่ออัปเดตประวัติ</span>
                </div>
              )}
            </div>

            {/* Section 2: Deductions Overview & Accordion Groups */}
            <div className="space-y-4">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#faf3e0] dark:bg-gray-700 text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-sm shadow-xs border border-[#e0dac7]/60">
                    <i className="fi fi-sr-shield-plus"></i>
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#1e1c10] dark:text-white">
                      รายการลดหย่อนภาษี
                    </span>
                    <span className="text-xs text-[#747878] dark:text-gray-400 ml-1.5">
                      (Income Tax Deductions)
                    </span>
                  </div>
                </div>
                
                <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#faf3e0] dark:bg-gray-800 text-[#1e1c10] dark:text-white border border-[#e0dac7] dark:border-gray-700 w-fit">
                  รวมลดหย่อนเพิ่ม: <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">฿{fmt(taxResult.otherDeductions)}</span>
                </span>
              </div>

              {/* ── Accordion 1: ประกันสังคม & ประกันชีวิต ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('insurance')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
                      <i className="fi fi-sr-shield-check text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        กลุ่มประกันสังคมและประกันชีวิต
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        ประกันสังคม ประกันสุขภาพ ประกันชีวิต และประกันบำนาญ
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.insurance > 0 && (
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                        ฿{fmt(taxResult.deductionDetails.insurance)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.insurance ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.insurance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    {renderTaxInput('ประกันสังคม', 'socialSecurity', '฿', 'สูงสุด 9,000 บาท')}
                    {renderTaxInput('ประกันชีวิตทั่วไป', 'lifeInsurance', '฿', 'รวมสุขภาพสูงสุด 1 แสน')}
                    {renderTaxInput('ประกันสุขภาพตนเอง', 'healthInsurance', '฿', 'สูงสุด 25,000 บาท')}
                    {renderTaxInput('ประกันสุขภาพพ่อแม่', 'parentsHealthInsurance', '฿', 'สูงสุด 15,000 บาท')}
                    <div className="sm:col-span-2">
                      {renderTaxInput('ประกันบำนาญ', 'pensionInsurance', '฿', 'สูงสุด 15% ไม่เกิน 2 แสน (cap รวมเกษียณ 5 แสน)')}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Accordion 2: การออมและการลงทุนเพื่อเกษียณ ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('investment')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
                      <i className="fi fi-sr-chart-line-up text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        กลุ่มการออมและการลงทุนเพื่อการเกษียณ
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        PVD, SSF, RMF, ThaiESG, กอช. และวิสาหกิจเพื่อสังคม
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.investment > 0 && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        ฿{fmt(taxResult.deductionDetails.investment)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.investment ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.investment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    {renderTaxInput('กองทุนสำรองเลี้ยงชีพ (PVD/กบข.)', 'pvd', '฿', 'สูงสุด 15% (cap 5 แสน)')}
                    {renderTaxInput('กองทุนรวมเพื่อการออม (SSF)', 'ssf', '฿', 'สูงสุด 30% (cap 2 แสน)')}
                    {renderTaxInput('กองทุนเพื่อการเลี้ยงชีพ (RMF)', 'rmf', '฿', 'สูงสุด 30% (cap 5 แสน)')}
                    {renderTaxInput('กองทุนรวม ThaiESG', 'thaiesg', '฿', 'วงเงินแยกพิเศษ สูงสุด 3 แสน')}
                    {renderTaxInput('กองทุนการออมแห่งชาติ (กอช.)', 'nsf', '฿', 'สูงสุด 30,000 บาท')}
                    {renderTaxInput('กองทุน SSFX', 'ssfx', '฿', 'สูงสุด 200,000 บาท')}
                    <div className="sm:col-span-2">
                      {renderTaxInput('วิสาหกิจเพื่อสังคม', 'socialEnterprise', '฿', 'สูงสุด 100,000 บาท')}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Accordion 3: ครอบครัวและการดูแล ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('family')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-200/60 dark:border-pink-800/40">
                      <i className="fi fi-sr-users text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        กลุ่มครอบครัวและการดูแล
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        คู่สมรส บุตร บิดามารดา และค่าฝากครรภ์คลอดบุตร
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.family > 0 && (
                      <span className="text-xs font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/40 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-800">
                        ฿{fmt(taxResult.deductionDetails.family)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.family ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.family && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    <div className="flex items-center h-[38px] px-3.5 border border-[#e0dac7] dark:border-gray-700 rounded-xl bg-[#faf3e0]/40 dark:bg-gray-800/60">
                      <label className="flex items-center gap-2.5 text-xs font-bold text-[#1e1c10] dark:text-white cursor-pointer w-full">
                        <input 
                          type="checkbox" 
                          checked={taxDeductions.spouseNoIncome} 
                          onChange={(e) => setTaxDeductions({...taxDeductions, spouseNoIncome: e.target.checked})}
                          className="w-4 h-4 text-[#fed330] accent-[#fed330] rounded border-gray-300 focus:ring-[#fed330]"
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

              {/* ── Accordion 4: มาตรการกระตุ้นเศรษฐกิจ ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('stimulus')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40">
                      <i className="fi fi-sr-shop text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        มาตรการรัฐและกระตุ้นเศรษฐกิจ
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        Easy E-Receipt และท่องเที่ยวเมืองรอง
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.stimulus > 0 && (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                        ฿{fmt(taxResult.deductionDetails.stimulus)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.stimulus ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.stimulus && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    {renderTaxInput('EASY E-RECEIPT 2567', 'easyEReceipt', '฿', 'ตามจริง สูงสุด 50,000 บาท')}
                    {renderTaxInput('เที่ยวเมืองรอง 2567', 'secondTierCity', '฿', 'ตามจริง สูงสุด 15,000 บาท')}
                  </div>
                )}
              </div>

              {/* ── Accordion 5: ที่อยู่อาศัย ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('housing')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-800/40">
                      <i className="fi fi-sr-home text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        กลุ่มที่อยู่อาศัย
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        ดอกเบี้ยเงินกู้ยืมเพื่อซื้อที่อยู่อาศัยและค่าซ่อมแซม
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.housing > 0 && (
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/40 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                        ฿{fmt(taxResult.deductionDetails.housing)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.housing ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.housing && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    {renderTaxInput('ดอกเบี้ยเงินกู้บ้าน', 'homeLoanInterest', '฿', 'ตามจริง สูงสุด 100,000 บาท')}
                    {renderTaxInput('ซ่อมแซมบ้าน (มาตรการรัฐ)', 'homeRepair', '฿', 'ตามจริง สูงสุด 100,000 บาท')}
                  </div>
                )}
              </div>

              {/* ── Accordion 6: เงินบริจาค ── */}
              <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-4 sm:p-5 shadow-xs transition-all hover:border-[#cfc9b6]">
                <div 
                  onClick={() => toggleAccordion('donation')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-800/40">
                      <i className="fi fi-sr-heart text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                        กลุ่มเงินบริจาค
                      </div>
                      <div className="text-[11px] text-[#747878] dark:text-gray-400">
                        การศึกษา โรงพยาบาล บริจาคทั่วไป และพรรคการเมือง
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taxResult.deductionDetails.donation > 0 && (
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                        ฿{fmt(taxResult.deductionDetails.donation)}
                      </span>
                    )}
                    <i className={`fi ${taxAccordions.donation ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs`}></i>
                  </div>
                </div>
                {taxAccordions.donation && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    {renderTaxInput('บริจาคการศึกษา/รพ. (2 เท่า)', 'educationDonation', '฿', 'ลดหย่อน 2 เท่า (cap 10% รายได้)')}
                    {renderTaxInput('บริจาคทั่วไป (1 เท่า)', 'generalDonation', '฿', 'ลดหย่อน 1 เท่า (cap 10% รายได้)')}
                    <div className="sm:col-span-2">
                      {renderTaxInput('พรรคการเมือง', 'politicalDonation', '฿', 'ตามจริง สูงสุด 10,000 บาท')}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── RIGHT COLUMN (5/12): Sticky Summary Panels ── */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* Card 1: สรุปภาษีเงินได้บุคคลธรรมดา */}
            <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 sm:px-5 border-b border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/50 dark:bg-gray-800/50 flex items-center justify-between font-bold text-[#1e1c10] dark:text-white">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-clipboard-list text-amber-600"></i>
                  <span className="text-sm">สรุปภาษีเงินได้</span>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fed330] text-[#1e1c10] shadow-xs">
                  ฐานภาษี {(taxResult.marginalRate * 100).toFixed(0)}%
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>รายได้รวมทั้งปี</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white font-bold">฿{fmt(taxResult.grossIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>- หักค่าใช้จ่าย (50% สูงสุด 1 แสน)</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">- ฿{fmt(taxResult.expenseDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>- หักลดหย่อนส่วนตัว</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">- ฿{fmt(taxResult.personalDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400 pb-2.5 border-b border-[#f0e9d6] dark:border-gray-700/60">
                  <span>- หักลดหย่อนอื่นๆ เพิ่มเติม</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">- ฿{fmt(taxResult.otherDeductions)}</span>
                </div>
                
                <div className="flex justify-between items-center font-bold text-[#1e1c10] dark:text-white pt-1">
                  <span>เงินได้สุทธิเพื่อคิดภาษีขั้นบันได</span>
                  <span className="font-mono text-sm sm:text-base">฿{fmt(taxResult.netIncome)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>ภาษีจ่าย (ไม่มีลดหย่อนเพิ่ม)</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">฿{fmt(taxResult.taxWithoutDeductions)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-[#1e1c10] dark:text-white pb-2">
                  <span>ภาษีที่ต้องชำระ (หลังลดหย่อน)</span>
                  <span className="font-mono text-sm sm:text-base text-rose-600 dark:text-rose-400">฿{fmt(taxResult.taxWithDeductions)}</span>
                </div>
                
                {/* Big Tax Saved Highlight Box */}
                <div className="bg-[#e8f5e9] dark:bg-emerald-950/40 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ประหยัดภาษีไปได้ทั้งหมด!
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      จากการใช้สิทธิลดหย่อนที่ระบุ
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    ฿{fmt(taxResult.taxSaved)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: ขอคืนภาษีเงินปันผล (ม.47 ทวิ) */}
            <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 sm:px-5 border-b border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/50 dark:bg-gray-800/50 flex items-center justify-between font-bold text-[#1e1c10] dark:text-white">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-chart-pie text-emerald-600"></i>
                  <span className="text-sm">ขอคืนภาษีเงินปันผล (ม.47 ทวิ)</span>
                </div>
                <span className="text-[11px] font-semibold text-[#747878] dark:text-gray-400 bg-white dark:bg-gray-800 px-2.5 py-0.5 rounded-full border border-[#e0dac7] dark:border-gray-700">
                  มาตรา 47 ทวิ
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                
                {/* Dividend Input */}
                <div>
                  <label className="block text-xs font-bold text-[#1e1c10] dark:text-gray-200 mb-1">
                    เงินปันผลรับรวมทั้งปี (ก่อนหัก 10%)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747878] font-bold text-xs font-mono">฿</span>
                    <input
                      type="number"
                      className="w-full bg-[#faf3e0]/40 dark:bg-gray-900/60 border border-[#e0dac7] dark:border-gray-700 rounded-xl py-2 pl-8 pr-3 text-xs sm:text-sm font-bold text-[#1e1c10] dark:text-white font-mono focus:ring-2 focus:ring-[#fed330] outline-none"
                      value={annualDividendInput}
                      onChange={(e) => setAnnualDividendInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="เช่น 50000"
                    />
                  </div>
                </div>

                {/* Corporate Tax Rate Selector */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-[#1e1c10] dark:text-gray-200">
                      อัตราภาษีนิติบุคคลของหุ้น
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {(corporateTaxRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <select
                    className="w-full bg-[#faf3e0]/40 dark:bg-gray-900/60 border border-[#e0dac7] dark:border-gray-700 rounded-xl py-2 px-3 text-xs font-bold text-[#1e1c10] dark:text-white focus:ring-2 focus:ring-[#fed330] outline-none"
                    value={corporateTaxRate}
                    onChange={(e) => setCorporateTaxRate(Number(e.target.value))}
                  >
                    <option value={0.20}>20% (มาตรฐานบริษัทจดทะเบียน SET ทั่วไป)</option>
                    <option value={0.25}>25% (บริษัทอัตราพิเศษ 25%)</option>
                    <option value={0.30}>30% (บริษัทอัตราเดิม 30%)</option>
                    <option value={0.00}>0% (BOI / ยกเว้นภาษีนิติบุคคล)</option>
                  </select>
                </div>

                {/* Detailed Calculations */}
                <div className="space-y-1.5 pt-2.5 border-t border-[#f0e9d6] dark:border-gray-700/60 text-xs">
                  <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                    <span>ภาษีหัก ณ ที่จ่าย (10%)</span>
                    <span className="font-mono text-[#1e1c10] dark:text-white">฿{fmt(dividendResult.withholdingTax)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                    <span>เครดิตภาษีเงินปันผล ({(corporateTaxRate * 100).toFixed(0)}%)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(dividendResult.taxCredit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                    <span>เงินปันผลรวมเครดิตภาษี</span>
                    <span className="font-mono text-[#1e1c10] dark:text-white">฿{fmt(dividendResult.grossedDividend)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold text-[#1e1c10] dark:text-white pt-1 border-t border-dashed border-[#f0e9d6] dark:border-gray-700/60">
                    <span>ภาษีที่ต้องเสียจริงสำหรับเงินปันผล</span>
                    <span className="font-mono">฿{fmt(dividendResult.dividendTaxPayable)}</span>
                  </div>
                </div>

                {/* Result Callout & Recommendation Banner */}
                {dividendResult.shouldClaimRefund ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                      <div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <i className="fi fi-sr-coins text-emerald-600"></i> ขอคืนภาษีได้สุทธิ/ปี
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">เมื่อนำมายื่นรวมคำนวณปลายปี</div>
                      </div>
                      <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                        +฿{fmt(dividendResult.refundAmount)}
                      </span>
                    </div>

                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                      💡 <strong>กลยุทธ์ที่แนะนำ:</strong> ฐานภาษีของคุณ ({(taxResult.marginalRate * 100).toFixed(0)}%) ต่ำกว่า 20% แนะนำให้นำเงินปันผลมายื่นรวมคำนวณปลายปีเพื่อรับเครดิตภาษีคืนสุทธิ
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                      <div>
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <i className="fi fi-sr-exclamation text-amber-600"></i> เสียภาษีเพิ่มหากยื่นรวม
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">ควรเลือก Final Tax (หัก 10%)</div>
                      </div>
                      <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-lg">
                        -฿{fmt(dividendResult.additionalTaxPayable)}
                      </span>
                    </div>

                    <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                      💡 <strong>กลยุทธ์ที่แนะนำ:</strong> ฐานภาษีของคุณสูง หากนำเงินปันผลมายื่นรวมจะต้องเสียภาษีเพิ่ม แนะนำให้เลือกหักภาษี ณ ที่จ่าย 10% (Final Tax) จบในตัว
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Card 3: AI Deep Analysis Prompt Card */}
            <div className="bg-[#fff9eb] dark:bg-gray-800/80 rounded-2xl border border-[#fed330]/60 dark:border-yellow-600/40 p-5 flex flex-col items-center text-center gap-2.5 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-[#fed330] text-[#1e1c10] flex items-center justify-center text-lg shadow-sm">
                <i className="fi fi-sr-sparkles"></i>
              </div>
              <div>
                <div className="font-bold text-[#1e1c10] dark:text-white text-sm">
                  ต้องการคำแนะนำภาษีเฉพาะบุคคล?
                </div>
                <div className="text-xs text-[#747878] dark:text-gray-400 mt-1 max-w-xs">
                  ให้ AI วิเคราะห์โควตาลดหย่อนที่ยังเหลือ และแนะนำแผนภาษีที่คุ้มค่าที่สุด
                </div>
              </div>
              <button
                onClick={() => setTaxSubTab('ai-analysis')}
                className="w-full py-2.5 px-4 bg-[#1e1c10] hover:bg-black dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] active:scale-[0.99] text-white text-xs font-bold rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 mt-1"
              >
                <i className="fi fi-sr-sparkles text-xs text-[#fed330] dark:text-[#1e1c10]"></i>
                <span>เริ่มการวิเคราะห์ด้วย AI</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: AI DEEP ANALYSIS ═══════════════ */}
      {taxSubTab === 'ai-analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* ── LEFT COLUMN: AI Analysis Card (8/12) ── */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] shadow-sm overflow-hidden">

              {/* Card Header */}
              <div className="p-5 border-b border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/40 dark:bg-gray-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 font-bold text-[#1e1c10] dark:text-white">
                  <div className="w-9 h-9 rounded-2xl bg-[#fed330] text-[#1e1c10] flex items-center justify-center shadow-xs">
                    <i className="fi fi-sr-sparkles text-base"></i>
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#1e1c10] dark:text-white">AI วิเคราะห์ภาษีเชิงลึก</div>
                    <div className="text-xs text-[#747878] dark:text-gray-400 font-normal">ประเมินสิทธิประโยชน์และโควตาลดหย่อนรายบุคคล</div>
                  </div>
                </div>

                <button
                  onClick={analyzeTaxWithAI}
                  disabled={isTaxAdviceLoading || !annualIncome}
                  className="px-4 py-2 bg-[#1e1c10] hover:bg-black disabled:bg-gray-300 text-white dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] dark:disabled:bg-gray-800 dark:disabled:text-gray-500 text-xs font-bold rounded-full transition-all shadow-sm flex items-center gap-1.5 disabled:cursor-not-allowed cursor-pointer border-0 shrink-0"
                >
                  {isTaxAdviceLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-[#1e1c10]/30 dark:border-t-[#1e1c10] rounded-full animate-spin" />
                      กำลังวิเคราะห์...
                    </>
                  ) : taxAdvice ? (
                    <>
                      <i className="fi fi-rr-refresh text-xs text-white dark:text-[#1e1c10]" />
                      วิเคราะห์ใหม่
                    </>
                  ) : (
                    <>
                      <i className="fi fi-sr-sparkles text-xs text-[#fed330] dark:text-[#1e1c10]" />
                      วิเคราะห์ด้วย AI
                    </>
                  )}
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6">
                {isTaxAdviceLoading ? (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                      <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin shrink-0" />
                      <div className="text-sm font-bold">FinShield AI กำลังประมวลผลข้อมูลภาษีและสิทธิลดหย่อนของคุณ...</div>
                    </div>
                    <div className="space-y-3 p-5 rounded-2xl bg-[#faf3e0]/30 dark:bg-gray-800/40 border border-[#f0e9d6] dark:border-gray-700/60">
                      <div className="w-48 h-5 rounded skeleton-box" />
                      <div className="w-full h-3.5 rounded skeleton-box" />
                      <div className="w-5/6 h-3.5 rounded skeleton-box" />
                      <div className="w-3/4 h-3.5 rounded skeleton-box" />
                      <div className="w-36 h-5 rounded skeleton-box mt-4" />
                      <div className="w-full h-3.5 rounded skeleton-box" />
                      <div className="w-4/5 h-3.5 rounded skeleton-box" />
                    </div>
                  </div>
                ) : taxAdvice ? (
                  <div className="space-y-5">
                    {renderTaxAdvice(taxAdvice)}
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={analyzeTaxWithAI}
                        disabled={isTaxAdviceLoading}
                        className="px-6 py-2.5 bg-white dark:bg-[#201f1a] hover:bg-[#faf3e0] dark:hover:bg-gray-800 text-[#1e1c10] dark:text-white border border-[#e0dac7] dark:border-gray-700 text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <i className="fi fi-rr-refresh text-xs" /> ขอคำแนะนำใหม่อีกครั้ง
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#faf3e0] text-[#1e1c10] flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#e0dac7]/60">
                      <i className="fi fi-sr-bulb text-2xl text-amber-500"></i>
                    </div>

                    <div className="text-base sm:text-lg font-extrabold text-[#1e1c10] dark:text-white mb-2">
                      วางแผนภาษีอย่างชาญฉลาดด้วย AI
                    </div>
                    <div className="text-xs sm:text-sm text-[#747878] dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
                      ให้ AI วิเคราะห์ข้อมูลภาษีจริงของคุณ เพื่อให้แน่ใจว่าคุณจะไม่พลาดสิทธิลดหย่อนใด ๆ
                      และได้รับประโยชน์สูงสุดจากการวางแผนภาษีที่ดี
                    </div>

                    <div className="max-w-sm mx-auto space-y-2 mb-8 text-left">
                      {[
                        'วิเคราะห์โควตาลดหย่อนที่ยังเหลืออยู่',
                        'เปรียบเทียบกลยุทธ์เงินปันผล (ยื่นรวม vs Final Tax)',
                        'คำแนะนำแผนภาษีเฉพาะสำหรับข้อมูลของคุณ',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#1e1c10] dark:text-gray-200">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <i className="fi fi-sr-check text-[10px]"></i>
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {annualIncome ? (
                      <button
                        onClick={analyzeTaxWithAI}
                        className="px-8 py-3 bg-[#1e1c10] hover:bg-black dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] text-white text-xs sm:text-sm font-bold rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer border-0"
                      >
                        <i className="fi fi-sr-sparkles mr-2 text-[#fed330] dark:text-[#1e1c10]" /> เริ่มการวิเคราะห์ภาษีด้วย AI
                      </button>
                    ) : (
                      <div className="inline-flex flex-col items-center gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-5 py-4">
                        <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <i className="fi fi-sr-triangle-warning text-amber-600" />
                          กรุณากรอกข้อมูลรายได้ในแท็บ "ลดหย่อนภาษี" ก่อนเริ่มการวิเคราะห์
                        </div>
                        <button
                          onClick={() => setTaxSubTab('deductions')}
                          className="px-4 py-1.5 bg-[#1e1c10] hover:bg-black dark:bg-[#fed330] dark:text-[#1e1c10] dark:hover:bg-[#fec810] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-0"
                        >
                          ไปที่แท็บลดหย่อนภาษี
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Data Context Summary (4/12) ── */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 shadow-sm overflow-hidden">
              <div className="p-4 sm:px-5 border-b border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/50 dark:bg-gray-800/50 flex items-center justify-between font-bold text-[#1e1c10] dark:text-white">
                <div className="flex items-center gap-2">
                  <i className="fi fi-sr-database text-amber-600"></i>
                  <span className="text-sm">ข้อมูลที่ใช้วิเคราะห์</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#fed330] text-[#1e1c10]">
                  พ.ศ. {selectedTaxYear}
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>รายได้รวมทั้งปี</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white font-bold">฿{fmt(taxResult.grossIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>เงินได้สุทธิ</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">฿{fmt(taxResult.netIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>ลดหย่อนรวมทั้งหมด</span>
                  <span className="font-mono text-[#1e1c10] dark:text-white">- ฿{fmt(taxResult.expenseDeduction + taxResult.personalDeduction + taxResult.otherDeductions)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400">
                  <span>ภาษีที่ต้องชำระ</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">฿{fmt(taxResult.taxWithDeductions)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold text-xs">ประหยัดภาษีได้</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">฿{fmt(taxResult.taxSaved)}</span>
                </div>
                <div className="flex justify-between items-center text-[#747878] dark:text-gray-400 pt-1 border-t border-[#f0e9d6] dark:border-gray-700/60">
                  <span>ฐานภาษีขั้นสูงสุด</span>
                  <span className="font-mono font-bold text-[#1e1c10] dark:text-white">{(taxResult.marginalRate * 100).toFixed(0)}%</span>
                </div>
                {typeof annualDividendInput === 'number' && annualDividendInput > 0 && (
                  <div className="flex justify-between items-center text-[#747878] dark:text-gray-400 pt-1 border-t border-[#f0e9d6] dark:border-gray-700/60">
                    <span>เงินปันผลรับทั้งปี</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">฿{fmt(annualDividendInput)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#faf3e0]/60 dark:bg-gray-800/60 rounded-2xl border border-[#e0dac7] dark:border-gray-700 p-4 flex items-start gap-2.5 text-xs text-[#747878] dark:text-gray-400 leading-relaxed">
              <i className="fi fi-sr-info text-amber-600 mt-0.5 shrink-0"></i>
              <div>
                AI จะประมวลผลข้อมูลจากแท็บ "ลดหย่อนภาษี" เพื่อค้นหาจุดประหยัดภาษีที่คุ้มค่าที่สุดสำหรับคุณโดยอัตโนมัติ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: HISTORY & TRENDS ═══════════════ */}
      {taxSubTab === 'history' && (
        <div className="space-y-6">
          
          {/* Chart Section */}
          <div className="rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 bg-white dark:bg-[#201f1a] p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-[#f0e9d6] dark:border-gray-700/60 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-[#faf3e0] dark:bg-gray-700 text-[#1e1c10] dark:text-[#fed330] flex items-center justify-center text-base shadow-sm border border-[#e0dac7]/60 shrink-0">
                <i className="fi fi-sr-chart-histogram"></i>
              </div>
              <div>
                <div className="text-base font-bold text-[#1e1c10] dark:text-white">
                  กราฟเปรียบเทียบภาษีย้อนหลัง (สูงสุด 5 ปี)
                </div>
                <div className="text-xs text-[#747878] dark:text-gray-400 mt-0.5">
                  ติดตามแนวโน้มภาษีที่จ่ายและภาษีที่ประหยัดได้ในแต่ละปี
                </div>
              </div>
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
                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                    <Bar yAxisId="left" dataKey="taxPaid" name="ภาษีที่ต้องจ่าย" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={28} />
                    <Bar yAxisId="left" dataKey="taxSaved" name="ภาษีที่ประหยัดได้" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
                    <Line yAxisId="right" type="monotone" dataKey="income" name="รายได้รวม" stroke="#fed330" strokeWidth={3} dot={{ r: 4, fill: '#1e1c10' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#747878] dark:text-gray-400">
                <i className="fi fi-sr-chart-histogram text-4xl mb-2 opacity-40" />
                <div className="text-sm font-semibold">ยังไม่มีประวัติภาษีที่บันทึกไว้</div>
                <div className="text-xs mt-1">กรุณากรอกข้อมูลและกดบันทึกในแท็บ "ลดหย่อนภาษี"</div>
              </div>
            )}
          </div>

          {/* History List Section */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 font-bold text-[#1e1c10] dark:text-white text-base">
              <i className="fi fi-sr-time-past text-amber-600"></i>
              <span>ประวัติการเสียภาษีแต่ละปี</span>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 p-5 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="w-28 h-5 rounded-lg skeleton-box" />
                      <div className="w-48 h-3.5 rounded skeleton-box" />
                    </div>
                    <div className="w-24 h-7 rounded-full skeleton-box" />
                  </div>
                ))}
              </div>
            ) : taxHistories.length === 0 ? (
              <div className="bg-white dark:bg-[#201f1a] rounded-2xl border border-[#e0dac7] dark:border-gray-700/60 p-8 text-center text-[#747878]">
                <i className="fi fi-sr-folder-open text-3xl mb-2 opacity-40 block" />
                <div className="text-sm font-bold text-[#1e1c10] dark:text-white">ยังไม่มีประวัติภาษี</div>
                <div className="text-xs mt-1">เริ่มต้นบันทึกข้อมูลเพื่อเปรียบเทียบการวางแผนภาษีย้อนหลัง</div>
              </div>
            ) : (
              <div className="space-y-3">
                {taxHistories.map((record) => {
                  const isExpanded = expandedYear === record.taxYear;
                  const deductions = (record.deductions || {}) as Record<string, any>;
                  const activeDeductions = Object.entries(deductions).filter(([key, val]) => {
                    if (key === 'spouseNoIncome') return val === true;
                    return val && Number(val) > 0;
                  });

                  return (
                    <div 
                      key={record.id} 
                      className={`rounded-2xl border bg-white dark:bg-[#201f1a] transition-all overflow-hidden ${
                        isExpanded 
                          ? 'border-[#fed330] shadow-md' 
                          : 'border-[#e0dac7] dark:border-gray-700/60 hover:border-[#cfc9b6] shadow-xs'
                      }`}
                    >
                      {/* Card Header */}
                      <div 
                        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none"
                        onClick={() => setExpandedYear(isExpanded ? null : record.taxYear)}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-[#1e1c10] dark:bg-gray-800 flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                            <div className="text-[9px] font-semibold opacity-75">พ.ศ.</div>
                            <div className="text-base font-extrabold text-[#fed330] font-mono leading-none">{record.taxYear}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#747878] dark:text-gray-400">ภาษีที่ต้องชำระ</div>
                            <div className="text-lg font-extrabold font-mono text-[#1e1c10] dark:text-white">
                              ฿{fmt(Math.round(record.taxWithDeductions))}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-0.5 text-[11px] text-[#747878] dark:text-gray-400">
                              <span>รายได้: <strong className="text-[#1e1c10] dark:text-white font-mono">฿{fmt(Math.round(record.annualIncome))}</strong></span>
                              <span>ประหยัด: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">฿{fmt(Math.round(record.taxSaved))}</strong></span>
                              <span>ฐานภาษี: <strong className="font-mono">{(record.marginalRate * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); loadHistoryForEdit(record); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747878] hover:text-[#1e1c10] dark:hover:text-white hover:bg-[#faf3e0] dark:hover:bg-gray-800 transition-all cursor-pointer border-0 bg-transparent"
                            title="แก้ไขข้อมูลนี้"
                          >
                            <i className="fi fi-sr-pencil text-xs" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTaxHistoryYear(record.taxYear); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747878] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer border-0 bg-transparent"
                            title="ลบข้อมูลนี้"
                          >
                            <i className="fi fi-sr-trash text-xs" />
                          </button>
                          <i className={`fi ${isExpanded ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-[#747878] text-xs ml-1`} />
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="border-t border-[#f0e9d6] dark:border-gray-700/60 bg-[#faf3e0]/30 dark:bg-gray-900/30 p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-[#e0dac7] dark:border-gray-700">
                              <div className="text-[10px] text-[#747878] dark:text-gray-400 font-bold mb-0.5">เงินได้สุทธิ</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-[#1e1c10] dark:text-white">฿{fmt(Math.round(record.netIncome))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-[#e0dac7] dark:border-gray-700">
                              <div className="text-[10px] text-[#747878] dark:text-gray-400 font-bold mb-0.5">ภาษีก่อนลดหย่อน</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-[#1e1c10] dark:text-white">฿{fmt(Math.round(record.taxWithoutDeductions))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-[#e0dac7] dark:border-gray-700">
                              <div className="text-[10px] text-[#747878] dark:text-gray-400 font-bold mb-0.5">ภาษีหลังลดหย่อน</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">฿{fmt(Math.round(record.taxWithDeductions))}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-[#e0dac7] dark:border-gray-700">
                              <div className="text-[10px] text-[#747878] dark:text-gray-400 font-bold mb-0.5">ลดหย่อนรวม</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">฿{fmt(Math.round(record.totalDeductions))}</div>
                            </div>
                          </div>

                          {activeDeductions.length > 0 && (
                            <div>
                              <div className="text-[11px] font-bold text-[#747878] dark:text-gray-400 mb-2">
                                รายการลดหย่อนที่ใช้ในปีนี้
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {activeDeductions.map(([key, val]) => {
                                  const isPersonCount = ['childBefore2561', 'childAfter2561', 'adoptedChild', 'parentCare'].includes(key);
                                  return (
                                    <div key={key} className="flex justify-between items-center text-xs py-1.5 px-3 rounded-xl bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700">
                                      <span className="text-[#747878] dark:text-gray-400">{DEDUCTION_LABELS[key] || key}</span>
                                      <span className="font-mono font-bold text-[#1e1c10] dark:text-white">
                                        {key === 'spouseNoIncome' ? 'ใช่' : isPersonCount ? `${fmt(Number(val))} คน` : `฿${fmt(Number(val))}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="text-[10px] text-[#747878] dark:text-gray-400 text-right">
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
