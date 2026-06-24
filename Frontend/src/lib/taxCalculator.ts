/**
 * Thai Personal Income Tax Calculator
 * Based on Revenue Department rules for tax year 2567
 */

export interface TaxDeductionInputs {
  // Annual income
  annualIncome: number;

  // Group 1: Family
  spouseNoIncome: boolean;
  childBefore2561: number;   // จำนวนคน
  childAfter2561: number;    // จำนวนคน
  adoptedChild: number;      // จำนวนคน (max 3)
  parentCare: number;        // จำนวนคน
  pregnancyCare: number;     // บาท

  // Group 2: Investment & Savings
  pvd: number;
  nsf: number;
  rmf: number;
  ssf: number;
  thaiesg: number;
  ssfx: number;
  socialEnterprise: number;

  // Group 3: Insurance
  socialSecurity: number;
  lifeInsurance: number;
  healthInsurance: number;
  parentsHealthInsurance: number;
  pensionInsurance: number;

  // Group 4: Housing
  homeLoanInterest: number;
  homeRepair: number;

  // Group 5: Donation
  generalDonation: number;
  educationDonation: number;
  politicalDonation: number;

  // Group 6: Stimulus
  easyEReceipt: number;
  secondTierCity: number;
}

export interface TaxResult {
  // Income breakdown
  grossIncome: number;
  expenseDeduction: number;         // หักค่าใช้จ่าย (50% max 100k)
  personalDeduction: number;        // หักลดหย่อนส่วนตัว (60k)
  otherDeductions: number;          // หักลดหย่อนอื่นๆ รวม
  netIncome: number;                // เงินได้สุทธิ

  // Detailed deduction breakdown
  deductionDetails: {
    family: number;
    insurance: number;
    investment: number;
    housing: number;
    donation: number;
    stimulus: number;
  };

  // Tax calculation
  taxWithoutDeductions: number;     // ภาษีจ่าย (ไม่มีลดหย่อนเพิ่มเติม)
  taxWithDeductions: number;        // ภาษีที่ต้องชำระ (หลังลดหย่อน)
  taxSaved: number;                 // ประหยัดภาษีไปได้ทั้งหมด

  // Marginal tax rate
  marginalRate: number;             // อัตราภาษีขั้นสูงสุดที่ถูกเรียกเก็บ
}

// ── Progressive Tax Brackets ──
const TAX_BRACKETS = [
  { min: 0,         max: 150000,   rate: 0.00 },  // exempt
  { min: 150000,    max: 300000,   rate: 0.05 },
  { min: 300000,    max: 500000,   rate: 0.10 },
  { min: 500000,    max: 750000,   rate: 0.15 },
  { min: 750000,    max: 1000000,  rate: 0.20 },
  { min: 1000000,   max: 2000000,  rate: 0.25 },
  { min: 2000000,   max: 5000000,  rate: 0.30 },
  { min: 5000000,   max: Infinity, rate: 0.35 },
];

function calculateProgressiveTax(netIncome: number): { tax: number; marginalRate: number } {
  if (netIncome <= 0) return { tax: 0, marginalRate: 0 };

  let tax = 0;
  let marginalRate = 0;

  for (const bracket of TAX_BRACKETS) {
    if (netIncome <= bracket.min) break;
    const taxableInBracket = Math.min(netIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
    if (taxableInBracket > 0) {
      marginalRate = bracket.rate;
    }
  }

  return { tax: Math.round(tax), marginalRate };
}

// ── Main Tax Calculation ──
export function calculateTax(inputs: TaxDeductionInputs): TaxResult {
  const income = Math.max(0, inputs.annualIncome || 0);

  // ─── Step 1: Expense Deduction (50% max 100,000) ───
  const expenseDeduction = Math.min(income * 0.5, 100000);

  // ─── Step 2: Personal Deduction (60,000) ───
  const personalDeduction = 60000;

  // ─── Step 3: Calculate Group Deductions ───

  // --- Group 1: Family ---
  let familyDeduction = 0;

  // คู่สมรสไม่มีรายได้
  if (inputs.spouseNoIncome) {
    familyDeduction += 60000;
  }

  // บุตร (เกิดก่อนปี 2561) — 30,000/คน
  familyDeduction += Math.max(0, inputs.childBefore2561 || 0) * 30000;

  // บุตร (เกิดตั้งแต่ปี 2561) — 60,000/คน (ไม่จำกัดจำนวน)
  familyDeduction += Math.max(0, inputs.childAfter2561 || 0) * 60000;

  // บุตรบุญธรรม — 30,000/คน (max 3 คน)
  familyDeduction += Math.min(Math.max(0, inputs.adoptedChild || 0), 3) * 30000;

  // อุปการะพ่อแม่ — 30,000/คน
  familyDeduction += Math.max(0, inputs.parentCare || 0) * 30000;

  // ฝากครรภ์และคลอดบุตร — ตามจริง max 60,000
  familyDeduction += Math.min(Math.max(0, inputs.pregnancyCare || 0), 60000);

  // --- Group 3: Insurance ---
  let insuranceDeduction = 0;

  // ประกันสังคม — ตามจริง max 9,000
  insuranceDeduction += Math.min(Math.max(0, inputs.socialSecurity || 0), 9000);

  // ประกันชีวิต — ตามจริง max 100,000
  const lifeIns = Math.min(Math.max(0, inputs.lifeInsurance || 0), 100000);
  insuranceDeduction += lifeIns;

  // ประกันสุขภาพ — ตามจริง max 25,000 แต่รวมกับประกันชีวิตไม่เกิน 100,000
  const healthIns = Math.min(Math.max(0, inputs.healthInsurance || 0), 25000);
  const combinedLifeHealth = Math.min(lifeIns + healthIns, 100000);
  insuranceDeduction = insuranceDeduction - lifeIns + combinedLifeHealth;

  // ประกันสุขภาพพ่อแม่ — ตามจริง max 15,000
  insuranceDeduction += Math.min(Math.max(0, inputs.parentsHealthInsurance || 0), 15000);

  // ประกันบำนาญ — max 15% ของเงินได้ และไม่เกิน 200,000
  const pensionIns = Math.min(
    Math.max(0, inputs.pensionInsurance || 0),
    income * 0.15,
    200000
  );
  insuranceDeduction += pensionIns;

  // --- Group 2: Investment & Savings ---
  let investmentDeduction = 0;

  // PVD — max 15% ของค่าจ้าง, cap 500,000
  const pvd = Math.min(Math.max(0, inputs.pvd || 0), income * 0.15, 500000);

  // NSF (กอช.) — ตามจริง max 30,000
  const nsf = Math.min(Math.max(0, inputs.nsf || 0), 30000);

  // RMF — max 30% ของเงินได้, cap 500,000
  const rmf = Math.min(Math.max(0, inputs.rmf || 0), income * 0.30, 500000);

  // SSF — max 30% ของเงินได้, cap 200,000
  const ssf = Math.min(Math.max(0, inputs.ssf || 0), income * 0.30, 200000);

  // Shared Retirement Cap: PVD + NSF + RMF + SSF + Pension Ins. ≤ 500,000
  const retirementTotal = pvd + nsf + rmf + ssf + pensionIns;
  const retirementCap = 500000;
  let retirementScale = 1;
  if (retirementTotal > retirementCap) {
    retirementScale = retirementCap / retirementTotal;
  }

  investmentDeduction += pvd * retirementScale;
  investmentDeduction += nsf * retirementScale;
  investmentDeduction += rmf * retirementScale;
  investmentDeduction += ssf * retirementScale;

  // Note: pensionIns already counted in insuranceDeduction,
  // but the cap affects the combined group.
  // We need to adjust if the retirement total exceeds cap.
  if (retirementTotal > retirementCap) {
    // Scale back pensionIns in insurance deduction too
    const adjustedPensionIns = pensionIns * retirementScale;
    insuranceDeduction = insuranceDeduction - pensionIns + adjustedPensionIns;
  }

  // THAIESG — ตามจริง max 300,000 (THAIESG has its own separate cap)
  investmentDeduction += Math.min(Math.max(0, inputs.thaiesg || 0), 300000);

  // SSFX — ตามจริง max 200,000
  investmentDeduction += Math.min(Math.max(0, inputs.ssfx || 0), 200000);

  // Social Enterprise — ตามจริง max 100,000
  investmentDeduction += Math.min(Math.max(0, inputs.socialEnterprise || 0), 100000);

  // --- Group 4: Housing ---
  let housingDeduction = 0;
  housingDeduction += Math.min(Math.max(0, inputs.homeLoanInterest || 0), 100000);
  housingDeduction += Math.min(Math.max(0, inputs.homeRepair || 0), 100000);

  // --- Group 6: Stimulus ---
  let stimulusDeduction = 0;
  stimulusDeduction += Math.min(Math.max(0, inputs.easyEReceipt || 0), 50000);
  stimulusDeduction += Math.min(Math.max(0, inputs.secondTierCity || 0), 15000);

  // --- Group 5: Donation ---
  let donationDeduction = 0;
  const incomeAfterExpense = income - expenseDeduction;

  // เงินบริจาคการศึกษา/สาธารณสุข — 2 เท่า แต่ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่าย
  const eduDonation = Math.max(0, inputs.educationDonation || 0);
  const eduDouble = eduDonation * 2;
  const eduCap = incomeAfterExpense * 0.10;
  donationDeduction += Math.min(eduDouble, eduCap);

  // เงินบริจาคทั่วไป — ตามจริง ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่าย
  const generalDonation = Math.max(0, inputs.generalDonation || 0);
  const generalCap = incomeAfterExpense * 0.10;
  donationDeduction += Math.min(generalDonation, generalCap);

  // เงินบริจาคพรรคการเมือง — ตามจริง max 10,000
  donationDeduction += Math.min(Math.max(0, inputs.politicalDonation || 0), 10000);

  // ─── Combine all deductions (excluding personal & expense) ───
  const otherDeductions = Math.round(
    familyDeduction +
    insuranceDeduction +
    investmentDeduction +
    housingDeduction +
    stimulusDeduction +
    donationDeduction
  );

  // ─── Net Income ───
  const netIncome = Math.max(0, income - expenseDeduction - personalDeduction - otherDeductions);

  // ─── Tax With Deductions ───
  const { tax: taxWithDeductions, marginalRate } = calculateProgressiveTax(netIncome);

  // ─── Tax Without Any Deductions (only expense + personal) ───
  const netIncomeNoDeductions = Math.max(0, income - expenseDeduction - personalDeduction);
  const { tax: taxWithoutDeductions } = calculateProgressiveTax(netIncomeNoDeductions);

  // ─── Tax Saved ───
  const taxSaved = Math.max(0, taxWithoutDeductions - taxWithDeductions);

  return {
    grossIncome: income,
    expenseDeduction: Math.round(expenseDeduction),
    personalDeduction,
    otherDeductions,
    netIncome: Math.round(netIncome),
    deductionDetails: {
      family: Math.round(familyDeduction),
      insurance: Math.round(insuranceDeduction),
      investment: Math.round(investmentDeduction),
      housing: Math.round(housingDeduction),
      donation: Math.round(donationDeduction),
      stimulus: Math.round(stimulusDeduction),
    },
    taxWithoutDeductions,
    taxWithDeductions,
    taxSaved,
    marginalRate,
  };
}

/**
 * Dividend Tax Credit Calculator (Section 47 bis)
 * ระบบคำนวณสิทธิขอคืนเครดิตภาษีเงินปันผล
 */
export interface DividendTaxResult {
  withholdingTax: number;       // ภาษีหัก ณ ที่จ่าย (10%)
  taxCredit: number;            // เครดิตภาษี (สมมติฐาน 20%)
  dividendTaxPayable: number;   // ภาษีที่ต้องเสียสำหรับเงินปันผล
  refundAmount: number;         // ขอเงินคืนภาษีได้/ปี
  shouldClaimRefund: boolean;   // ควรยื่นขอคืนหรือไม่
  userMarginalRate: number;     // อัตราภาษีของผู้ใช้
}

export function calculateDividendTax(
  annualDividend: number,
  userMarginalRate: number
): DividendTaxResult {
  const dividend = Math.max(0, annualDividend || 0);

  // ภาษีหัก ณ ที่จ่าย 10%
  const withholdingTax = Math.round(dividend * 0.10);

  // เครดิตภาษี — สมมติอัตราภาษีนิติบุคคล 20%
  const corporateTaxRate = 0.20;
  // เงินปันผลก่อนหักภาษีนิติบุคคล = dividend / (1 - corporateTaxRate)
  const grossDividend = dividend / (1 - corporateTaxRate);
  const taxCredit = Math.round(grossDividend - dividend);

  // ภาษีที่ต้องจ่ายจริงสำหรับเงินปันผล = grossDividend * userMarginalRate
  const actualTax = Math.round(grossDividend * userMarginalRate);

  // ภาษีที่ต้องเสียเพิ่ม = actualTax - withholdingTax - taxCredit
  const dividendTaxPayable = Math.max(0, actualTax - withholdingTax - taxCredit);

  // จำนวนเงินที่ขอคืนได้ = withholdingTax + taxCredit - actualTax
  const refundAmount = Math.max(0, withholdingTax + taxCredit - actualTax);

  // ถ้าอัตราภาษีส่วนตัวต่ำกว่า corporate tax rate → ควรยื่นขอคืน
  const shouldClaimRefund = userMarginalRate < corporateTaxRate + 0.10; // 30% threshold

  return {
    withholdingTax,
    taxCredit,
    dividendTaxPayable,
    refundAmount,
    shouldClaimRefund,
    userMarginalRate,
  };
}
