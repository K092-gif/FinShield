"use client";
import React, { useState, useMemo } from "react";
import { calculateTax, calculateDividendTax } from "@/lib/taxCalculator";

export default function TaxOptimizer() {
  const [annualIncome, setAnnualIncome] = useState<number | ''>('');
  const [annualDividendInput, setAnnualDividendInput] = useState<number | ''>('');
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

  const [taxAccordions, setTaxAccordions] = useState({
    insurance: true,
    investment: false,
    family: false,
    stimulus: false,
    housing: false,
    donation: false
  });

  const toggleAccordion = (section: keyof typeof taxAccordions) => {
    setTaxAccordions({ ...taxAccordions, [section]: !taxAccordions[section] });
  };

  const renderTaxInput = (label: string, field: keyof typeof taxDeductions) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
        <input
          type="number"
          className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          value={taxDeductions[field] as string}
          onChange={(e) => setTaxDeductions({ ...taxDeductions, [field]: e.target.value })}
        />
      </div>
    </div>
  );

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
    return calculateDividendTax(annualDiv, taxResult.marginalRate);
  }, [annualDividendInput, taxResult.marginalRate]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-sub)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white m-0 pb-1">
            Tax <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">Optimizer</span>
          </h1>
          <p className="text-[14px] text-gray-500 m-0">
            วางแผนลดหย่อนภาษี และคำนวณเครดิตภาษีเงินปันผลอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Inputs (70%) */}
        <div className="lg:col-span-8 space-y-8 bg-[var(--bg-main)] p-6 md:p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          
          {/* Section: Income */}
          <section>
            <div className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <i className="fi fi-sr-money-bill-wave text-sm"></i>
              </div>
              ข้อมูลรายได้ต่อปี
            </div>
            <div className="max-w-md">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">รายได้รวมทั้งปี (เงินเดือน โบนัส ฯลฯ)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">฿</span>
                <input
                  type="number"
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="เช่น 1200000"
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Section: Deductions Overview */}
          <section>
            <div className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white mb-6">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                <i className="fi fi-sr-shield-plus text-sm"></i>
              </div>
              รายการลดหย่อนภาษี (Income Tax)
            </div>

            <div className="space-y-8">
              {/* Group 1: Insurance */}
              <div>
                <button 
                  onClick={() => toggleAccordion('insurance')}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-purple-500 pl-2 text-left"
                >
                  กลุ่มประกันสังคมและประกันชีวิต
                  <i className={`fi ${taxAccordions.insurance ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                </button>
                {taxAccordions.insurance && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                    {renderTaxInput('ประกันสังคม', 'socialSecurity')}
                    {renderTaxInput('ประกันชีวิตทั่วไป', 'lifeInsurance')}
                    {renderTaxInput('ประกันสุขภาพ', 'healthInsurance')}
                    {renderTaxInput('ประกันสุขภาพพ่อแม่', 'parentsHealthInsurance')}
                    {renderTaxInput('ประกันบำนาญ', 'pensionInsurance')}
                  </div>
                )}
              </div>

              {/* Group 2: Investment */}
              <div>
                <button 
                  onClick={() => toggleAccordion('investment')}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-emerald-500 pl-2 text-left"
                >
                  กลุ่มการออมและการลงทุน
                  <i className={`fi ${taxAccordions.investment ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                </button>
                {taxAccordions.investment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                    {renderTaxInput('กองทุนสำรองเลี้ยงชีพ (PVD)', 'pvd')}
                    {renderTaxInput('กองทุนรวมเพื่อการออม (SSF)', 'ssf')}
                    {renderTaxInput('กองทุนเพื่อการเลี้ยงชีพ (RMF)', 'rmf')}
                    {renderTaxInput('กองทุนรวม THAIESG', 'thaiesg')}
                    {renderTaxInput('กองทุนการออมแห่งชาติ (กอช.)', 'nsf')}
                    {renderTaxInput('กองทุน SSFX', 'ssfx')}
                  </div>
                )}
              </div>

              {/* Group 3: Family */}
              <div>
                <button 
                  onClick={() => toggleAccordion('family')}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-pink-500 pl-2 text-left"
                >
                  กลุ่มครอบครัว (จำนวนคน / จ่ายจริง)
                  <i className={`fi ${taxAccordions.family ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                </button>
                {taxAccordions.family && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mt-4 mb-6">
                    <div className="flex items-center h-[42px] px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer w-full">
                        <input 
                          type="checkbox" 
                          checked={taxDeductions.spouseNoIncome} 
                          onChange={(e) => setTaxDeductions({...taxDeductions, spouseNoIncome: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        /> 
                        คู่สมรสไม่มีรายได้
                      </label>
                    </div>
                    {renderTaxInput('บุตร (เกิดก่อนปี 2561)', 'childBefore2561')}
                    {renderTaxInput('บุตร (เกิดตั้งแต่ปี 2561)', 'childAfter2561')}
                    {renderTaxInput('บุตรบุญธรรม (คน)', 'adoptedChild')}
                    {renderTaxInput('อุปการะพ่อแม่ (คน)', 'parentCare')}
                    {renderTaxInput('ฝากครรภ์และคลอดบุตร', 'pregnancyCare')}
                  </div>
                )}
              </div>

              {/* Group 4: Stimulus */}
              <div>
                <button 
                  onClick={() => toggleAccordion('stimulus')}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-yellow-500 pl-2 text-left"
                >
                  มาตรการรัฐและกระตุ้นเศรษฐกิจ
                  <i className={`fi ${taxAccordions.stimulus ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                </button>
                {taxAccordions.stimulus && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                    {renderTaxInput('EASY E-RECEIPT 2567', 'easyEReceipt')}
                    {renderTaxInput('เที่ยวเมืองรอง 2567', 'secondTierCity')}
                    {renderTaxInput('วิสาหกิจเพื่อสังคม', 'socialEnterprise')}
                  </div>
                )}
              </div>

              {/* Group 5: Housing & Donation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <button 
                    onClick={() => toggleAccordion('housing')}
                    className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-orange-500 pl-2 text-left"
                  >
                    กลุ่มที่อยู่อาศัย
                    <i className={`fi ${taxAccordions.housing ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                  </button>
                  {taxAccordions.housing && (
                    <div className="space-y-4 mt-4 mb-6">
                      {renderTaxInput('ดอกเบี้ยเงินกู้บ้าน', 'homeLoanInterest')}
                      {renderTaxInput('ซ่อมแซมบ้าน (มาตรการรัฐ)', 'homeRepair')}
                    </div>
                  )}
                </div>
                <div>
                  <button 
                    onClick={() => toggleAccordion('donation')}
                    className="w-full flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 uppercase tracking-wider mb-2 border-l-2 border-red-500 pl-2 text-left"
                  >
                    กลุ่มเงินบริจาค
                    <i className={`fi ${taxAccordions.donation ? 'fi-sr-angle-up' : 'fi-sr-angle-down'} text-lg`}></i>
                  </button>
                  {taxAccordions.donation && (
                    <div className="space-y-4 mt-4 mb-6">
                      {renderTaxInput('บริจาคทั่วไป (1 เท่า)', 'generalDonation')}
                      {renderTaxInput('การศึกษา/รพ. (2 เท่า)', 'educationDonation')}
                      {renderTaxInput('พรรคการเมือง', 'politicalDonation')}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Sticky Summary (30%) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Income Tax Summary */}
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <i className="fi fi-sr-clipboard-list text-blue-500"></i> สรุปภาษีเงินได้
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>รายได้รวมทั้งปี</span>
                <span className="font-mono text-gray-900 dark:text-white font-bold">฿{fmt(taxResult.grossIncome)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>- หักค่าใช้จ่าย (สูงสุด 1แสน)</span>
                <span className="font-mono">- ฿{fmt(taxResult.expenseDeduction)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>- หักลดหย่อนส่วนตัว</span>
                <span className="font-mono">- ฿{fmt(taxResult.personalDeduction)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 pb-3 border-b border-gray-100 dark:border-gray-800">
                <span>- หักลดหย่อนอื่นๆ เพิ่มเติม</span>
                <span className="font-mono">- ฿{fmt(taxResult.otherDeductions)}</span>
              </div>
              
              <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white pt-2">
                <span>เงินได้สุทธิเพื่อคิดภาษีขั้นบันได</span>
                <span className="font-mono text-[16px]">฿{fmt(taxResult.netIncome)}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-500 mt-4">
                <span>ภาษีจ่าย (ไม่มีลดหย่อนเพิ่ม)</span>
                <span className="font-mono">฿{fmt(taxResult.taxWithoutDeductions)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                <span>ภาษีที่ต้องชำระ (หลังลดหย่อน)</span>
                <span className="font-mono text-[15px]">฿{fmt(taxResult.taxWithDeductions)}</span>
              </div>
              
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">ประหยัดภาษีไปได้ทั้งหมด!</div>
                <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400">฿{fmt(taxResult.taxSaved)}</div>
              </div>
            </div>
          </div>

          {/* Dividend Tax Summary */}
          <div className="bg-[var(--bg-main)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <i className="fi fi-sr-chart-pie text-emerald-500"></i> ขอคืนภาษีเงินปันผล (ม.47 ทวิ)
            </div>
            <div className="p-5 space-y-4 text-sm">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">เงินปันผลรับรวมทั้งปี (ก่อนหักภาษี)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-8 pr-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={annualDividendInput}
                    onChange={(e) => setAnnualDividendInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="เช่น 50000"
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  ระบบใช้ฐานภาษี <strong>{(taxResult.marginalRate * 100).toFixed(0)}%</strong> ของคุณมาคำนวณสิทธิขอคืน
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center text-gray-500">
                  <span>ภาษีหัก ณ ที่จ่าย (10%)</span>
                  <span className="font-mono">฿{fmt(dividendResult.withholdingTax)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500">
                  <span>เครดิตภาษี (สมมติฐาน 20%)</span>
                  <span className="font-mono">฿{fmt(dividendResult.taxCredit)}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-gray-700 dark:text-gray-300">
                  <span>ภาษีที่ต้องเสียสำหรับปันผล</span>
                  <span className="font-mono">฿{fmt(dividendResult.dividendTaxPayable)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <i className="fi fi-sr-coins text-emerald-500"></i> ขอคืนภาษีได้/ปี
                </span>
                <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-lg">฿{fmt(dividendResult.refundAmount)}</span>
              </div>

              {dividendResult.shouldClaimRefund ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5 mb-1.5">
                    <i className="fi fi-sr-check-circle"></i> กลยุทธ์ที่แนะนำ: ยื่นขอคืนภาษี
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-500 leading-relaxed">
                    ฐานภาษีคุณต่ำกว่านิติบุคคล แนะนำให้นำเงินปันผลมายื่นรวมคำนวณภาษีปลายปี เพื่อขอรับเครดิตภาษีคืน
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 p-3.5 rounded-xl border border-red-100 dark:border-red-900/50">
                  <div className="font-bold text-red-700 dark:text-red-400 text-xs flex items-center gap-1.5 mb-1.5">
                    <i className="fi fi-sr-exclamation"></i> กลยุทธ์ที่แนะนำ: หัก ณ ที่จ่าย 10%
                  </div>
                  <div className="text-[11px] text-red-600 dark:text-red-500 leading-relaxed">
                    ฐานภาษีคุณสูงกว่าเพดาน แนะนำให้เลือกหักภาษี ณ ที่จ่าย 10% (Final Tax) แทนการยื่นรวมคำนวณ เพื่อป้องกันการเสียภาษีเพิ่ม
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
