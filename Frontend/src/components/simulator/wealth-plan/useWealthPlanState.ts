import { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFinance } from "@/contexts/FinanceContext";
import { API_BASE_URL } from "@/lib/api";
import { fetchBanksCached, fetchInsurancePlansCached, fetchInflationCached } from "@/lib/apiCache";
import { SCENARIOS, Scenario, Severity, MyPortfolioItem, DcaInfo } from "./wealthPlanTypes";

/**
 * Calculates all DCA executions that have arrived between startDate and today.
 * Each month whose DCA day <= today's date counts as executed.
 */
export function calculateDcaExecutions(
  monthlyInvestment: number,
  dcaDay: number,
  startDateStr?: string,
  today: Date = new Date()
): DcaInfo {
  if (!monthlyInvestment || monthlyInvestment <= 0) {
    return {
      executedCount: 0,
      totalDcaAmount: 0,
      executedDates: [],
      nextDcaDate: null,
      isDcaDueThisMonth: false,
    };
  }

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Normalize dcaDay between 1 and 31
  const cleanDcaDay = Math.min(31, Math.max(1, Number(dcaDay) || 1));

  // Determine start year and month
  let startYear = currentYear;
  let startMonth = currentMonth;
  if (startDateStr) {
    const [sy, sm] = startDateStr.split('-').map(Number);
    if (!isNaN(sy) && !isNaN(sm)) {
      startYear = sy;
      startMonth = sm - 1;
    }
  }

  const executedDates: string[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const maxDays = new Date(y, m + 1, 0).getDate();
    const actualDay = Math.min(cleanDcaDay, maxDays);
    const dcaDate = new Date(y, m, actualDay, 23, 59, 59);

    if (dcaDate <= today) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
      executedDates.push(dateStr);
    }

    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  // Next upcoming DCA date
  let nextY = currentYear;
  let nextM = currentMonth;
  const maxDaysThisMonth = new Date(nextY, nextM + 1, 0).getDate();
  const actualDayThisMonth = Math.min(cleanDcaDay, maxDaysThisMonth);

  if (currentDay >= actualDayThisMonth) {
    nextM++;
    if (nextM > 11) {
      nextM = 0;
      nextY++;
    }
  }
  const maxDaysNextMonth = new Date(nextY, nextM + 1, 0).getDate();
  const actualDayNextMonth = Math.min(cleanDcaDay, maxDaysNextMonth);
  const nextDcaDate = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(actualDayNextMonth).padStart(2, '0')}`;

  const isDcaDueThisMonth = currentDay >= actualDayThisMonth;

  return {
    executedCount: executedDates.length,
    totalDcaAmount: executedDates.length * monthlyInvestment,
    executedDates,
    nextDcaDate,
    isDcaDueThisMonth,
  };
}

export function useWealthPlanState() {
  const { financeData, loading, saveFinanceData } = useFinance();

  const [page, setPage] = useLocalStorage("wpt_page", 0);

  // My Portfolio state
  const [myPortfolio, setMyPortfolio] = useLocalStorage("wpt_myPortfolio", [] as MyPortfolioItem[]);
  const [showPortfolioBuilder, setShowPortfolioBuilder] = useState(false);
  const [myPortfolioData, setMyPortfolioData] = useState<any>(null);

  // AI Portfolio state
  const [aiPortfolio, setAiPortfolio] = useLocalStorage("wpt_aiPortfolio", [] as MyPortfolioItem[]);

  // Portfolio Modal state
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioModalTab, setPortfolioModalTab] = useState<'my' | 'ai'>('my');

  // Dashboard state
  const [myPnlData, setMyPnlData] = useLocalStorage<any>("wpt_myPnlData", null);
  const [myPnlLoading, setMyPnlLoading] = useState(false);
  const [myDivCalendar, setMyDivCalendar] = useLocalStorage<any[] | null>("wpt_myDivCalendar", null);
  const [aiDivCalendar, setAiDivCalendar] = useLocalStorage<any[] | null>("wpt_aiDivCalendar", null);
  const [aiPortfolioResult, setAiPortfolioResult] = useState<any>(null);
  const [dividendGoal, setDividendGoal] = useLocalStorage("wpt_dividendGoal", 0);
  const [investmentYears, setInvestmentYears] = useLocalStorage("wpt_investmentYears", 10);
  const [myPortfolioBuilderData, setMyPortfolioBuilderData] = useLocalStorage<any>("wpt_myPortfolioBuilderData", null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useLocalStorage("wpt_isEmergencyOpen", false);
  const [isInflationOpen, setIsInflationOpen] = useLocalStorage("wpt_isInflationOpen", false);
  const [isAllocationOpen, setIsAllocationOpen] = useLocalStorage("wpt_isAllocationOpen", true);

  // Bank Deposit state
  const [selectedBank, setSelectedBank] = useLocalStorage("wpt_selectedBank", "kkp_dime");
  const [bankTiers, setBankTiers] = useState<Record<string, { name: string; tiers: Array<{ minBalance: number; rate: number }> }>>({});
  const [projectedBankBalance, setProjectedBankBalance] = useState<number>(0);

  // Fetch Bank Tiers (Cached)
  useEffect(() => {
    fetchBanksCached().then((data) => {
      if (data && data.length > 0) {
        const banksMap: Record<string, any> = {};
        data.forEach((b: any) => {
          banksMap[b.id] = { name: b.name, tiers: b.tiers };
        });
        setBankTiers(banksMap);
      }
    });
  }, []);

  // Shared States
  const [totalCapital, setTotalCapital] = useLocalStorage("wpt_totalCapital", 0);
  const [monthlyInvestment, setMonthlyInvestment] = useLocalStorage("wpt_monthlyInvestment", 0);
  const [dcaDayType, setDcaDayType] = useLocalStorage("wpt_dcaDayType", "1");
  const [dcaDay, setDcaDay] = useLocalStorage("wpt_dcaDay", 1);
  const [dcaStartDate, setDcaStartDate] = useLocalStorage("wpt_dcaStartDate", "");

  // Effective start date for DCA
  const effectiveDcaStartDate = useMemo(() => {
    if (dcaStartDate) return dcaStartDate;
    // If user has transactions with buyDate, find the earliest
    const txs = myPortfolioBuilderData?.transactions;
    if (txs) {
      const allBuyDates: string[] = [];
      Object.values(txs).forEach((list: any) => {
        if (Array.isArray(list)) {
          list.forEach((t: any) => { if (t.buyDate) allBuyDates.push(t.buyDate); });
        }
      });
      if (allBuyDates.length > 0) {
        allBuyDates.sort();
        return allBuyDates[0];
      }
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }, [dcaStartDate, myPortfolioBuilderData]);

  const dcaInfo = useMemo(() => {
    return calculateDcaExecutions(monthlyInvestment, dcaDay, effectiveDcaStartDate);
  }, [monthlyInvestment, dcaDay, effectiveDcaStartDate]);

  const [expenses, setExpenses] = useLocalStorage("wpt_expenses", {
    food: 0, rent: 0, transport: 0, necessities: 0, other: 0, debt: 0
  });

  // Allocation specific
  const [reserveMonths, setReserveMonths] = useLocalStorage("wpt_reserveMonths", 6);

  // Emergency specific
  const [selectedScenario, setSelectedScenario] = useLocalStorage("wpt_selectedScenario", 'job_loss' as Scenario);
  const [severity, setSeverity] = useLocalStorage("wpt_severity", 'moderate' as Severity);
  const [customMedicalCost, setCustomMedicalCost] = useLocalStorage("wpt_customMedicalCost", 80000);
  const [customVehicleCost, setCustomVehicleCost] = useLocalStorage("wpt_customVehicleCost", 60000);

  // Insurance specific (Cached)
  const [insurancePlans, setInsurancePlans] = useState<any[]>([]);

  useEffect(() => {
    fetchInsurancePlansCached().then((data) => {
      if (data && data.length > 0) {
        setInsurancePlans(data);
      }
    });
  }, []);

  const [selectedHealthInsId, setSelectedHealthInsId] = useLocalStorage("wpt_healthInsId", null as number | null);
  const [selectedVehicleInsId, setSelectedVehicleInsId] = useLocalStorage("wpt_vehicleInsId", null as number | null);
  
  const [isAtFault, setIsAtFault] = useLocalStorage("wpt_isAtFault", false);
  const [customThirdPartyCost, setCustomThirdPartyCost] = useLocalStorage("wpt_customThirdPartyCost", 50000);

  const healthInsPlan = insurancePlans.find(p => p.id === selectedHealthInsId);
  const vehicleInsPlan = insurancePlans.find(p => p.id === selectedVehicleInsId);

  // Inflation specific (Cached)
  const [timeline, setTimeline] = useLocalStorage("wpt_timeline", 10);
  const [inflationRate, setInflationRate] = useLocalStorage("wpt_inflationRate", 1.95);
  const [currentInflationRate, setCurrentInflationRate] = useState<number>(1.95);
  const [salary, setSalary] = useLocalStorage("wpt_salary", 40000);
  const [salaryGrowth, setSalaryGrowth] = useLocalStorage("wpt_salaryGrowth", 5);

  useEffect(() => {
    fetchInflationCached().then((rate) => {
      if (typeof rate === 'number') {
        setCurrentInflationRate(rate);
        setInflationRate(rate);
      }
    });
  }, []);

  // Sync with Finance Data
  useEffect(() => {
    if (loading) return;
    
    if (financeData.assets.currentCapital > 0) setTotalCapital(financeData.assets.currentCapital);
    if (financeData.assets.monthlySavings > 0) setMonthlyInvestment(financeData.assets.monthlySavings);
    
    if (financeData.expenses.food > 0 || financeData.expenses.rent > 0 || financeData.expenses.transport > 0) {
      setExpenses({
        food: financeData.expenses.food || 0,
        rent: financeData.expenses.rent || 0,
        transport: financeData.expenses.transport || 0,
        necessities: financeData.expenses.necessities || 0,
        other: financeData.expenses.other || 0,
        debt: financeData.expenses.debt || 0,
      });
    }
    
    if (financeData.assets.monthlyIncome && financeData.assets.monthlyIncome > 0) setSalary(financeData.assets.monthlyIncome);

    const totalExp = Object.values(financeData.expenses).reduce((a, b) => a + (b||0), 0);
    if (totalExp > 0 && financeData.assets.emergencyFund > 0) {
        const m = Math.round(financeData.assets.emergencyFund / totalExp);
        if ([3, 6, 12].includes(m)) setReserveMonths(m);
    }
  }, [financeData.updatedAt, loading]);

  const totalMonthlyExpense = Object.values(expenses).reduce((a, b) => a + (b || 0), 0);
  const totalMonthlyExpenseNoDebt = totalMonthlyExpense - expenses.debt;
  const emergencyRequired = totalMonthlyExpense * reserveMonths;
  const initialInvestment = Math.max(0, totalCapital - emergencyRequired);

  const retirementYears = (financeData.retirement?.retirementAge && financeData.retirement?.currentAge && financeData.retirement.retirementAge > financeData.retirement.currentAge)
    ? (financeData.retirement.retirementAge - financeData.retirement.currentAge)
    : (timeline || investmentYears || 10);

  // Calculate Bank Balance Projection
  useEffect(() => {
    const bankInfo = bankTiers[selectedBank];
    if (!bankInfo) return;

    let balance = initialInvestment;
    const netMonthlySavings = monthlyInvestment;
    const years = retirementYears; 
    
    for (let month = 1; month <= years * 12; month++) {
      balance += netMonthlySavings;
      let monthlyInterest = 0;
      let remaining = balance;

      for (let i = 0; i < bankInfo.tiers.length; i++) {
        const currentTier = bankInfo.tiers[i];
        const nextTier = bankInfo.tiers[i + 1];
        const tierLimit = nextTier ? nextTier.minBalance : Number.MAX_SAFE_INTEGER;

        if (remaining > currentTier.minBalance) {
          const tierAmount = Math.min(
            remaining - currentTier.minBalance,
            tierLimit - currentTier.minBalance
          );
          monthlyInterest += (tierAmount * currentTier.rate) / 12;
        }
      }
      balance += monthlyInterest;
    }
    setProjectedBankBalance(balance);
  }, [initialInvestment, monthlyInvestment, retirementYears, selectedBank, bankTiers]);

  // Fetch P&L and Dividend Calendar for My Portfolio
  useEffect(() => {
    if (!myPortfolioBuilderData) return;
    const { selectedAssets, transactions } = myPortfolioBuilderData;
    
    let totalFeePercent = 0;
    let totalAlloc = 0;
    let thFee = 0, offshoreFee = 0, fundFee = 0;
    (selectedAssets || []).forEach((asset: any) => {
      const txns = transactions[asset.id] || [];
      const alloc = txns.reduce((sum: number, t: any) => sum + Number(t.allocation || 0), 0);
      let rate = 0;
      if (asset.type === "Mutual Fund" || asset.type?.includes("กองทุน")) {
        rate = (asset.riskLevel === "Low" || asset.riskLevel?.includes("ต่ำ")) ? 0 : 1.0;
        fundFee += rate * alloc;
      } else if (asset.market === "US" || asset.market === "Global" || asset.category === "us-stock" || asset.category === "etf-bond") {
        rate = 0.65;
        offshoreFee += rate * alloc;
      } else if (asset.market === "TH" || !asset.market) {
        rate = 0.17;
        thFee += rate * alloc;
      }
      totalFeePercent += rate * alloc;
      totalAlloc += alloc;
    });
    
    const effectiveFeeRate = totalAlloc > 0 ? (totalFeePercent / totalAlloc) : 0.157;
    const baseFee = (initialInvestment || 0) * (effectiveFeeRate / 100);
    const netCapital = Math.max(0, (initialInvestment || 0) - baseFee);
    const totalCapitalWithDca = netCapital + (dcaInfo.totalDcaAmount || 0);
    
    const assetsWithDates = (selectedAssets || []).filter(
      (a: any) => transactions && transactions[a.id] && transactions[a.id].length > 0
    );

    if (assetsWithDates.length === 0 || totalCapitalWithDca <= 0) {
      setMyPnlData(null);
      return;
    }

    const defaultDcaDayStr = String(dcaDay || 1).padStart(2, '0');
    const now = new Date();
    const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
    const defaultBuyDate = `${now.getFullYear()}-${defaultMonth}-${defaultDcaDayStr}`;

    const timer = setTimeout(async () => {
      setMyPnlLoading((prev) => {
        const cachedPnl = localStorage.getItem("wpt_myPnlData");
        return !cachedPnl; // Only show loading spinner if no cache exists
      });
      try {
        const pnlRes = await fetch(`${API_BASE_URL}/simulator/portfolio-pnl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalSavings: totalCapitalWithDca,
            allocations: assetsWithDates.map((a: any) => ({
              id: a.id,
              transactions: transactions[a.id].map((t: any) => ({
                allocation: Number(t.allocation),
                buyDate: t.buyDate || defaultBuyDate
              })).filter((t: any) => t.allocation > 0)
            })),
          }),
        });

        if (pnlRes.ok) {
          const pnlDataFetched = await pnlRes.json();
          pnlDataFetched.feeDetails = {
            thFee: totalAlloc > 0 ? (thFee / totalAlloc) : 0,
            offshoreFee: totalAlloc > 0 ? (offshoreFee / totalAlloc) : 0,
            fundFee: totalAlloc > 0 ? (fundFee / totalAlloc) : 0,
            totalFeeAmount: baseFee,
            effectiveRate: effectiveFeeRate
          };
          pnlDataFetched.dcaIncluded = true;
          pnlDataFetched.dcaAccumulated = dcaInfo.totalDcaAmount;
          pnlDataFetched.baseInvested = netCapital;
          setMyPnlData(pnlDataFetched);

          const divRes = await fetch(`${API_BASE_URL}/simulator/dividend-calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalWealth: totalCapitalWithDca,
              allocations: (pnlDataFetched.assets || []).map((a: any) => {
                const asset = selectedAssets.find((sa: any) => sa.id === a.id);
                const freshYield = a.freshDividendYield > 0 
                  ? a.freshDividendYield 
                  : (asset ? asset.yield || 0 : 0);
                return {
                  id: a.id,
                  allocation: 0,
                  expectedYield: freshYield,
                  annualDividendGross: a.annualDividendGross || 0,
                  category: asset ? (asset.category || (asset.market === "TH" ? "thai-stock" : "us-stock")) : "us-stock",
                  currentValue: a.currentValue || 0
                };
              }),
            }),
          });
          
          if (divRes.ok) {
            const divData = await divRes.json();
            setMyDivCalendar(divData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch PnL data:', err);
      } finally {
        setMyPnlLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [myPortfolioBuilderData, initialInvestment, dcaDay, monthlyInvestment, dcaInfo.totalDcaAmount]);

  // Derived - Emergency
  const scenarioDef = selectedScenario ? SCENARIOS[selectedScenario] : null;
  let e_recoveryMonths = reserveMonths;
  let e_medicalCost = 0;
  let e_vehicleCost = 0;
  let e_thirdPartyCost = 0;

  if (selectedScenario === 'job_loss') {
    e_recoveryMonths = reserveMonths; 
  } else if (selectedScenario && scenarioDef && scenarioDef.severities) {
    const sev = scenarioDef.severities[severity];
    e_recoveryMonths = sev.recoveryMonths;
    e_medicalCost = customMedicalCost;
    e_vehicleCost = selectedScenario === 'accident' ? customVehicleCost : 0;
    e_thirdPartyCost = selectedScenario === 'accident' ? customThirdPartyCost : 0;
  }

  const prbLimit = 30000;
  let netMedicalCost = e_medicalCost;
  let coveredMedicalByPrb = 0;
  let coveredMedicalByHealth = 0;
  let netVehicleCost = e_vehicleCost;
  let coveredVehicle = 0;
  let netThirdPartyCost = e_thirdPartyCost;
  let coveredThirdParty = 0;

  if (selectedScenario === "accident") {
    if (!isAtFault) {
      netVehicleCost = 0; coveredVehicle = e_vehicleCost;
      netThirdPartyCost = 0; coveredThirdParty = e_thirdPartyCost;
      coveredMedicalByPrb = Math.min(netMedicalCost, prbLimit);
      netMedicalCost -= coveredMedicalByPrb;
    } else {
      const thirdPartyPropertyLimit = vehicleInsPlan ? vehicleInsPlan.coverage.thirdPartyPropertyLimit : 0;
      const ownCarLimit = vehicleInsPlan ? vehicleInsPlan.coverage.ownCarLimit : 0;
      const vehicleInsCategory = vehicleInsPlan ? vehicleInsPlan.category : null;

      coveredThirdParty = Math.min(netThirdPartyCost, thirdPartyPropertyLimit);
      netThirdPartyCost -= coveredThirdParty;

      if (vehicleInsCategory === "car_class_1" || vehicleInsCategory === "car_class_2" || vehicleInsCategory === "car_class_3") {
        if (vehicleInsCategory !== "car_class_3") {
          coveredVehicle = Math.min(netVehicleCost, ownCarLimit);
          netVehicleCost -= coveredVehicle;
        }
      }
      coveredMedicalByPrb = Math.min(netMedicalCost, prbLimit);
      netMedicalCost -= coveredMedicalByPrb;
    }
  }

  const healthCoverageLimit = healthInsPlan ? healthInsPlan.coverage.healthLimit : 0;
  if (healthCoverageLimit > 0) {
    coveredMedicalByHealth = Math.min(netMedicalCost, healthCoverageLimit);
    netMedicalCost -= coveredMedicalByHealth;
  }

  const e_totalCost = netMedicalCost + netVehicleCost + netThirdPartyCost + (totalMonthlyExpense * (selectedScenario ? e_recoveryMonths : 0));
  const e_livingCost = totalMonthlyExpense * (selectedScenario ? e_recoveryMonths : 0);
  const e_shortfall = Math.max(0, e_totalCost - totalCapital);
  const e_survived = totalCapital >= e_totalCost;

  // Derived - Inflation
  const cumulativeInflation = Math.pow(1 + (inflationRate / 100), timeline) - 1;
  const futureExpense = (totalMonthlyExpenseNoDebt * (1 + cumulativeInflation)) + expenses.debt;
  const futureSalary = salary * Math.pow(1 + (salaryGrowth / 100), timeline);
  const realPurchasingPower = futureSalary / Math.pow(1 + (inflationRate / 100), timeline);

  const handleSave = async (showToast = true) => {
    const updatedData = {
      ...financeData,
      assets: {
        ...financeData.assets,
        currentCapital: totalCapital,
        monthlySavings: monthlyInvestment,
        emergencyFund: emergencyRequired,
        monthlyIncome: salary
      },
      expenses: {
        ...financeData.expenses,
        ...expenses
      }
    };
    await saveFinanceData(true, updatedData);
    if (showToast) alert("บันทึกข้อมูลการเงินเรียบร้อยแล้ว!");
  };

  const handleExp = (k: keyof typeof expenses, v: number) => setExpenses(prev => ({...prev, [k]: v}));

  // Context setup for AI Advisor
  const emergencyFund = reserveMonths > 0 ? reserveMonths * totalMonthlyExpense : 0;
  const investmentAmount = Math.max(0, totalCapital - emergencyFund);
  const dcaAccumulated = dcaInfo?.totalDcaAmount || 0;
  const totalInvestmentWithDca = investmentAmount + dcaAccumulated;

  const contextItems = [];
  if (totalCapital > 0) contextItems.push({ label: "เงินเก็บทั้งหมด", value: `฿${totalCapital.toLocaleString()}` });
  if (reserveMonths > 0) contextItems.push({ label: "เป้าหมายสำรอง", value: `${reserveMonths} เดือน (฿${emergencyFund.toLocaleString()})` });
  if (investmentAmount > 0) contextItems.push({ label: "เงินตั้งต้นลงทุน", value: `฿${investmentAmount.toLocaleString()}` });
  if (dcaAccumulated > 0) {
    contextItems.push({ label: "เงิน DCA สะสม", value: `+฿${dcaAccumulated.toLocaleString()} (${dcaInfo.executedCount} งวด)` });
    contextItems.push({ label: "เงินลงทุนรวม (รวม DCA)", value: `฿${totalInvestmentWithDca.toLocaleString()}` });
  }
  if (monthlyInvestment > 0) {
    contextItems.push({ label: "DCA รายเดือน", value: `฿${monthlyInvestment.toLocaleString()}/ด. (ทุกวันที่ ${dcaDay})` });
  }
  const isCrisisUncovered = selectedScenario === 'job_loss' || netMedicalCost > 0 || netVehicleCost > 0 || netThirdPartyCost > 0;
  if (selectedScenario && isCrisisUncovered) {
    const scText = selectedScenario === "job_loss" ? "ตกงาน" : selectedScenario === "illness" ? "เจ็บป่วย" : selectedScenario === "accident" ? "อุบัติเหตุ" : selectedScenario;
    contextItems.push({ label: "วิกฤตที่กังวล", value: `${scText} (${severity})` });
  }
  if (inflationRate > 0) contextItems.push({ label: "เงินเฟ้อ", value: `${inflationRate}% ต่อปี` });
  if (salary > 0) contextItems.push({ label: "รายได้ประจำ", value: `฿${salary.toLocaleString()}/ด.` });

  return {
    state: {
      page, myPortfolio, showPortfolioBuilder, myPortfolioData, aiPortfolio, showPortfolioModal,
      portfolioModalTab, myPnlData, myPnlLoading, myDivCalendar, aiDivCalendar, aiPortfolioResult,
      dividendGoal, investmentYears, myPortfolioBuilderData, isEmergencyOpen, isInflationOpen, isAllocationOpen,
      totalCapital, monthlyInvestment, dcaDayType, dcaDay, expenses, reserveMonths, selectedScenario, severity, customMedicalCost,
      customVehicleCost, insurancePlans, selectedHealthInsId, selectedVehicleInsId, isAtFault, customThirdPartyCost,
      timeline, inflationRate, currentInflationRate, salary, salaryGrowth, totalMonthlyExpense, totalMonthlyExpenseNoDebt,
      emergencyRequired, initialInvestment, e_recoveryMonths, e_medicalCost, e_vehicleCost, e_thirdPartyCost, netMedicalCost,
      coveredMedicalByPrb, coveredMedicalByHealth, netVehicleCost, coveredVehicle, netThirdPartyCost, coveredThirdParty,
      e_totalCost, e_livingCost, e_shortfall, e_survived, cumulativeInflation, futureExpense, futureSalary, realPurchasingPower,
      contextItems, selectedBank, bankTiers, projectedBankBalance, retirementYears,
      dcaStartDate, effectiveDcaStartDate, dcaInfo,
    },
    actions: {
      setPage, setMyPortfolio, setShowPortfolioBuilder, setMyPortfolioData, setAiPortfolio, setShowPortfolioModal,
      setPortfolioModalTab, setMyPnlData, setMyPnlLoading, setMyDivCalendar, setAiDivCalendar, setAiPortfolioResult,
      setDividendGoal, setInvestmentYears, setMyPortfolioBuilderData, setIsEmergencyOpen, setIsInflationOpen, setIsAllocationOpen,
      setTotalCapital, setMonthlyInvestment, setDcaDayType, setDcaDay, setDcaStartDate, setExpenses, setReserveMonths, setSelectedScenario, setSeverity, setCustomMedicalCost,
      setCustomVehicleCost, setInsurancePlans, setSelectedHealthInsId, setSelectedVehicleInsId, setIsAtFault, setCustomThirdPartyCost,
      setTimeline, setInflationRate, setCurrentInflationRate, setSalary, setSalaryGrowth, handleSave, handleExp,
      setSelectedBank
    }
  };
}
