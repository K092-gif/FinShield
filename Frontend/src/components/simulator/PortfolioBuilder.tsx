"use client";
import '../ui/PortfolioBuilder.css';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiCall } from "@/lib/api";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";

import { API_BASE_URL } from "@/lib/api";
import InfoTooltip from "./InfoTooltip";

// ─── Types ────────────────────────────────────────────────────────────
interface Asset {
  id: string;
  name: string;
  risk: number;
  yield: number;
  category: string;
  badge?: string;
  paysDividend?: boolean;
  categoryDisplay?: string;
  sector?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  "thai-stock": "TH หุ้นปันผล & บลูชิพไทย",
  reit: "REITs/IFF",
  dr: "DR/DRx",
  "us-stock": "US Growth",
  "etf-bond": "ETF/ตราสารหนี้",
};

const CATEGORIES = [
  "ทั้งหมด",
  "TH หุ้นปันผล & บลูชิพไทย",
  "REITs/IFF",
  "DR/DRx",
  "US Growth",
  "ETF/ตราสารหนี้",
];

const CAT_COLORS: Record<string, string> = {
  "TH หุ้นปันผล & บลูชิพไทย": "#10b981",
  "REITs/IFF": "#f59e0b",
  "DR/DRx": "#8b5cf6",
  "US Growth": "#3b82f6",
  "ETF/ตราสารหนี้": "#06b6d4",
};

const LS_KEY = "finshield-portfolio-state";
const LS_ASSETS_KEY = "finshield-assets-cache";
const LS_MARKET_KEY = "finshield-market-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Props ────────────────────────────────────────────────────────────
interface PortfolioBuilderProps {
  storageKey?: string;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  onChange?: (data: {
    transactions: Record<string, { allocation: string; buyDate: string }[]>;
    weightedYield: number;
    riskScore: number;
    selectedAssets: Asset[];
    allAddedAssets?: Asset[];
  }) => void;
}

// ─── Donut Chart ──────────────────────────────────────────────────────
function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <div className="pb-chart-empty">
        เลือกสินทรัพย์เพื่อแสดงกราฟ
      </div>
    );

  const size = 130;
  const cx = size / 2,
    cy = size / 2,
    r = 48,
    strokeW = 22;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pct = d.value / total;
      const dash = circumference * pct;
      const gap = circumference - dash;
      const thisOffset = offset;
      offset += dash;
      return { ...d, dash, gap, offset: thisOffset, pct };
    });

  return (
    <div className="pb-chart-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="pb-chart-svg"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeW}
        />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeW}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="pb-chart-circle"
          />
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="var(--text-main)"
          fontSize="15"
          fontWeight="800"
          fontFamily="'Space Mono',monospace"
        >
          {total}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="9"
          fontWeight="600"
        >
          ALLOCATED
        </text>
      </svg>

      <div className="pb-chart-legend">
        {arcs.map((a, i) => (
          <div key={i} className="pb-legend-item">
            <span
              className="pb-legend-color"
              style={{ background: a.color }}
            />
            <span className="pb-legend-label">
              {a.label}
            </span>
            <span className="pb-legend-val">
              {a.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function PortfolioBuilder({
  storageKey = "finshield-portfolio-state",
  topContent,
  bottomContent,
  onChange,
}: PortfolioBuilderProps) {
  const { financeData } = useFinance();
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Record<string, { allocation: string; buyDate: string }[]>>({});
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});
  const [assets, setAssets] = useState<Asset[]>(() => {
    // Initialise immediately from cache so the table shows on first render
    try {
      const raw = localStorage.getItem(LS_ASSETS_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {}
    return [];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [marketData, setMarketData] = useState<
    Record<string, { price: number; changePercent: number }>
  >(() => {
    try {
      const raw = localStorage.getItem(LS_MARKET_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (data && typeof data === 'object') return data;
      }
    } catch {}
    return {};
  });
  const [usdThb, setUsdThb] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_MARKET_KEY);
      if (raw) {
        const { data } = JSON.parse(raw);
        if (data?.["USDTHB"]?.price) return data["USDTHB"].price;
      }
    } catch {}
    return 33;
  });
  const [savedPorts, setSavedPorts] = useState<Record<string, Record<string, { allocation: string; buyDate: string }[]>>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingFresh, setIsFetchingFresh] = useState(false);

  const handleSearchYahoo = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      // Fetch details directly which will also cache it in our DB
      const symbol = searchQuery.toUpperCase();
      const asset = await apiCall(`/simulator/assets/${encodeURIComponent(symbol)}`);
      if (asset && asset.id) {
        // Add to our local assets array if not present
        setAssets(prev => {
          if (prev.find(a => a.id === asset.id)) return prev;
          return [{
            ...asset,
            categoryDisplay: CATEGORY_MAP[asset.category] || asset.category,
            sector: asset.sector || "อื่นๆ"
          }, ...prev];
        });
        alert(`ค้นหาข้อมูล ${symbol} สำเร็จ! เพิ่มลงในรายการแล้ว`);
      }
    } catch (e) {
      console.error(e);
      alert(`ไม่พบข้อมูลหุ้น ${searchQuery} ใน Yahoo Finance`);
    } finally {
      setIsSearching(false);
    }
  };

  // Investment years from retirement page
  const investmentYears = useMemo(() => {
    const r = financeData.retirement;
    const years = (r.retirementAge || 60) - (r.currentAge || 25);
    return years > 0 ? years : 25;
  }, [financeData.retirement]);

  const totalCapital = useMemo(() => {
    return financeData.assets.currentCapital || financeData.retirement.initialCapital || 0;
  }, [financeData.assets.currentCapital, financeData.retirement.initialCapital]);

  // ── Load persisted state ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const migrated: Record<string, any> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' || typeof v === 'number') {
              migrated[k] = [{ allocation: String(v), buyDate: new Date().toISOString().split('T')[0] }];
            } else if (Array.isArray(v)) {
              migrated[k] = v;
            }
          }
          setTransactions(migrated);
        }
      }
    } catch {}
    try {
      const ports = localStorage.getItem("finshield-saved-ports");
      if (ports) setSavedPorts(JSON.parse(ports));
    } catch {}
  }, [storageKey]);

  // ── Persist on every change ──
  useEffect(() => {
    const hasAny = Object.values(transactions).some(txns => txns.some(t => Number(t.allocation) > 0));
    if (hasAny) {
      localStorage.setItem(storageKey, JSON.stringify(transactions));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [transactions, storageKey]);

  // ── Convert string allocations → numbers ──
  const numericAllocations = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, txns] of Object.entries(transactions)) {
      let sum = 0;
      if (Array.isArray(txns)) {
        txns.forEach(t => {
          const n = Number(t.allocation);
          if (n > 0) sum += n;
        });
      }
      if (sum > 0) out[id] = sum;
    }
    return out;
  }, [transactions]);

  // ── Save / Load ports ──
  // ── Save / Load Portfolios from Database ──
  const handleSavePort = async () => {
    if (Object.keys(numericAllocations).length === 0) {
      alert("กรุณาเลือกสินทรัพย์อย่างน้อย 1 ตัวก่อนบันทึกพอร์ต");
      return;
    }
    const name = prompt("ตั้งชื่อพอร์ตของคุณ:");
    if (name) {
      try {
        const firebaseUid = user?.uid || "guest";
        await apiCall("/simulator/portfolios", {
          method: "POST",
          body: JSON.stringify({ firebaseUid, name, transactions }),
        });
        const updated = { ...savedPorts, [name]: transactions };
        setSavedPorts(updated);
        localStorage.setItem("finshield-saved-ports", JSON.stringify(updated));
        alert("บันทึกพอร์ตลง Database เรียบร้อยแล้ว!");
      } catch (e) {
        console.error("Error saving portfolio:", e);
        alert("ไม่สามารถบันทึกพอร์ตลง Database ได้");
      }
    }
  };

  const handleLoadPort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (name && savedPorts[name]) {
      const loaded = savedPorts[name];
      const migrated: Record<string, any> = {};
      for (const [k, v] of Object.entries(loaded)) {
        if (typeof v === 'string' || typeof v === 'number') {
          migrated[k] = [{ allocation: String(v), buyDate: new Date().toISOString().split('T')[0] }];
        } else if (Array.isArray(v)) {
          migrated[k] = v;
        }
      }
      setTransactions(migrated);
    } else if (name === "") {
      setTransactions({});
    }
  };

  // ── Fetch assets & User Portfolios (stale-while-revalidate) ──
  useEffect(() => {
    const fetchData = async (isBackground = false) => {
      if (!isBackground) setIsFetchingFresh(true);
      try {
        const [assetsRes, marketDataRes] = await Promise.all([
          apiCall("/simulator/assets").catch(() => []),
          apiCall("/simulator/market-data").catch(() => ({})),
        ]);
        if (Array.isArray(assetsRes) && assetsRes.length > 0) {
          const mapped = assetsRes.map((a: any) => ({
            ...a,
            categoryDisplay: CATEGORY_MAP[a.category] || a.category,
            sector: a.sector || "อื่นๆ",
          }));
          setAssets(mapped);
          // Update cache
          try { localStorage.setItem(LS_ASSETS_KEY, JSON.stringify({ data: mapped, ts: Date.now() })); } catch {}
        }
        if (marketDataRes) {
          setMarketData(marketDataRes);
          if (marketDataRes["USDTHB"]?.price) setUsdThb(marketDataRes["USDTHB"].price);
          // Update cache
          try { localStorage.setItem(LS_MARKET_KEY, JSON.stringify({ data: marketDataRes, ts: Date.now() })); } catch {}
        }

        // Fetch User Portfolios from Database
        const firebaseUid = user?.uid || "guest";
        const ports = await apiCall(`/simulator/portfolios?firebaseUid=${firebaseUid}`).catch(() => null);
        if (ports && typeof ports === 'object') {
          setSavedPorts(ports);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsFetchingFresh(false);
      }
    };

    // Check if cache is still fresh (< CACHE_TTL_MS old)
    let cacheIsFresh = false;
    try {
      const raw = localStorage.getItem(LS_ASSETS_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw);
        cacheIsFresh = (Date.now() - ts) < CACHE_TTL_MS;
      }
    } catch {}

    if (cacheIsFresh) {
      // Cache is fresh: fetch in background silently, no loading spinner
      fetchData(true);
    } else {
      // Cache is stale or missing: fetch normally (shows fresh indicator)
      fetchData(false);
    }

    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Allocation change ──
  const handleAddTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      const txns = prev[id] || [];
      return { ...prev, [id]: [...txns, { allocation: "", buyDate: new Date().toISOString().split('T')[0] }] };
    });
    setExpandedAssets(prev => ({ ...prev, [id]: true }));
  }, []);

  const handleRemoveTransaction = useCallback((id: string, index: number) => {
    setTransactions(prev => {
      const txns = [...(prev[id] || [])];
      txns.splice(index, 1);
      return { ...prev, [id]: txns };
    });
  }, []);

  const handleTransactionChange = useCallback((id: string, index: number, field: 'allocation' | 'buyDate', value: string) => {
    setTransactions(prev => {
      const txns = [...(prev[id] || [])];
      if (txns[index]) {
        if (field === 'allocation') {
          const num = Math.max(0, Math.min(100, Number(value) || 0));
          txns[index] = { ...txns[index], [field]: value === "" ? "" : String(num) };
        } else {
          txns[index] = { ...txns[index], [field]: value };
        }
      }
      return { ...prev, [id]: txns };
    });
  }, []);

  const handleStep = useCallback((id: string, index: number, delta: number) => {
    setTransactions((prev) => {
      const txns = [...(prev[id] || [])];
      if (txns[index]) {
        const cur = Number(txns[index].allocation) || 0;
        const next = Math.max(0, Math.min(100, cur + delta));
        txns[index] = { ...txns[index], allocation: next > 0 ? String(next) : "" };
      }
      return { ...prev, [id]: txns };
    });
  }, []);

  // ── Computed portfolio metrics ──
  const totalAllocation = Object.values(numericAllocations).reduce(
    (s, v) => s + v,
    0
  );

  let weightedYield = 0;
  let riskScore = 0;
  const selectedAssets: Asset[] = [];
  const allAddedAssets: Asset[] = [];

  assets.forEach((asset) => {
    if (transactions[asset.id] && transactions[asset.id].length > 0) {
      allAddedAssets.push(asset);
    }
  });

  if (totalAllocation > 0) {
    assets.forEach((asset) => {
      const alloc = numericAllocations[asset.id] || 0;
      if (alloc > 0) {
        weightedYield += (asset.yield * alloc) / totalAllocation;
        riskScore += (asset.risk * alloc) / totalAllocation;
        selectedAssets.push(asset);
      }
    });
  }



  // ── Notify parent ──
  useEffect(() => {
    if (onChange) {
      onChange({
        transactions,
        weightedYield,
        riskScore,
        selectedAssets,
        allAddedAssets,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, assets]);

  // ── Category allocation for donut ──
  const categoryData = useMemo(() => {
    const catAlloc: Record<string, number> = {};
    assets.forEach((a) => {
      const alloc = numericAllocations[a.id] || 0;
      if (alloc > 0) {
        const catLabel = a.categoryDisplay || CATEGORY_MAP[a.category] || a.category;
        catAlloc[catLabel] = (catAlloc[catLabel] || 0) + alloc;
      }
    });
    return Object.entries(catAlloc).map(([label, value]) => ({
      label,
      value,
      color: CAT_COLORS[label] || "#888",
    }));
  }, [numericAllocations, assets]);

  // ── Profit Calculation (from changePercent) ──
  const profitData = useMemo(() => {
    if (totalCapital <= 0 || totalAllocation <= 0) return null;
    let totalProfit = 0;
    let totalInvested = 0;
    const items: { id: string; invested: number; profit: number; pct: number }[] = [];
    selectedAssets.forEach((a) => {
      const alloc = numericAllocations[a.id] || 0;
      const invested = totalCapital * (alloc / 100);
      const live = marketData[a.id];
      const changePct = live?.changePercent || 0;
      const profit = invested * (changePct / 100);
      totalProfit += profit;
      totalInvested += invested;
      items.push({ id: a.id, invested, profit, pct: changePct });
    });
    return { totalProfit, totalInvested, items };
  }, [totalCapital, totalAllocation, selectedAssets, numericAllocations, marketData]);

  // ── Dividend Projection ──
  const dividendData = useMemo(() => {
    if (totalCapital <= 0 || totalAllocation <= 0) return null;
    let annualDivBeforeTax = 0;
    const divAssets: { id: string; annual: number; yieldPct: number }[] = [];
    selectedAssets.forEach((a) => {
      if (!a.paysDividend || a.yield <= 0) return;
      const alloc = numericAllocations[a.id] || 0;
      const invested = totalCapital * (alloc / 100);
      const annualDiv = invested * (a.yield / 100);
      annualDivBeforeTax += annualDiv;
      divAssets.push({ id: a.id, annual: annualDiv, yieldPct: a.yield });
    });

    if (annualDivBeforeTax <= 0) return null;

    const taxRate = 0.1; // 10% withholding tax
    const annualDivAfterTax = annualDivBeforeTax * (1 - taxRate);

    // Projection timeline
    const milestones = [1, 3, 5, 10, investmentYears].filter(
      (v, i, arr) => arr.indexOf(v) === i && v > 0
    );

    const timeline = milestones.map((y) => ({
      year: y,
      cumulative: Math.round(annualDivAfterTax * y),
    }));

    return {
      annualBeforeTax: Math.round(annualDivBeforeTax),
      annualAfterTax: Math.round(annualDivAfterTax),
      monthlyAfterTax: Math.round(annualDivAfterTax / 12),
      timeline,
      divAssets,
      investmentYears,
    };
  }, [totalCapital, totalAllocation, selectedAssets, numericAllocations, investmentYears]);

  // ── Filtered + paginated ──
  const filteredAssets = assets.filter((asset: any) => {
    const matchesCat =
      activeCategory === "ทั้งหมด" || asset.categoryDisplay === activeCategory;
    const matchesSearch =
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAssets = filteredAssets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="portfolio-builder pb-wrap">
      {topContent && <div className="pb-top-content">{topContent}</div>}

      {/* ── Summary + Donut ── */}
      <div className="grid2 pb-grid2">
        <div className="card">
          <div className="card-title pb-card-title">
            <i className="fi fi-sr-chart-bar" style={{ fontSize: '18px' }}></i> พอร์ตรวม (PORTFOLIO)
          </div>
          <div className="stat-row">
            <span className="stat-label">Weighted Yield</span>
            <span className="stat-val pb-stat-val-main">
              {weightedYield.toFixed(2)}%
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Risk Score</span>
            <span className="stat-val pb-stat-val-main">
              {riskScore.toFixed(1)} / 10
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">สินทรัพย์ที่เลือก</span>
            <span className="stat-val pb-stat-val-blue">
              {selectedAssets.length} ตัว
            </span>
          </div>
          <div className="progress-wrap pb-prog-wrap">
            <div className="progress-label">
              <span>สัดส่วนรวม</span>
              <span className={totalAllocation > 100 ? "pb-prog-red" : "pb-prog-main"}>
                {totalAllocation}%
              </span>
            </div>
            <div className="progress-track pb-prog-track">
              <div
                className={`progress-fill ${totalAllocation > 100 ? "over pb-prog-fill-red" : "ok pb-prog-fill-blue"}`}
                style={{ width: `${Math.min(100, totalAllocation)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title pb-card-title">
            <i className="fi fi-sr-chart-pie" style={{ fontSize: '18px' }}></i> การกระจายประเภทสินทรัพย์
          </div>
          <div className="pb-donut-wrap">
            <DonutChart data={categoryData} />
          </div>
        </div>
      </div>


                  {/* ── Filter Bar (Line 1: Categories, Line 2: Fav, Search, Currency) ── */}
      <div className="filter-bar pb-filter-bar space-y-3 my-4">
        {/* Line 1: Categories spanning long across */}
        <div className="cat-tabs pb-cat-tabs flex flex-wrap items-center gap-2 w-full">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  isActive
                    ? "bg-[#fed330] text-[#1e1c10] border-[#fed330] shadow-[0_2px_8px_rgba(254,211,48,0.35)]"
                    : "bg-white dark:bg-gray-800 text-[#747878] dark:text-gray-300 border-[#e0dac7] dark:border-gray-700 hover:bg-[#faf3e0] hover:text-[#1e1c10]"
                }`}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Line 2: Fav/Presets, Search, Exchange rate */}
        <div className="pb-action-group flex flex-wrap items-center justify-between gap-3 w-full pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Fav / Presets */}
            <div className="flex items-center gap-2 bg-[#f4eedb] dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 px-4 py-2 rounded-full shadow-sm">
              <i className="fi fi-sr-folder-open text-[#d97706] text-xs"></i>
              <select
                onChange={handleLoadPort}
                className="bg-transparent border-0 outline-none text-xs font-bold text-[#1e1c10] dark:text-white cursor-pointer"
              >
                <option value="">เลือกพอร์ตที่บันทึกไว้</option>
                {Object.keys(savedPorts).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSavePort}
              title="บันทึกพอร์ตนี้"
              className="w-9 h-9 rounded-full bg-[#f4eedb] dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 flex items-center justify-center text-[#1e1c10] dark:text-white hover:bg-[#e8e0cc] transition-all cursor-pointer shadow-sm text-sm"
            >
              <i className="fi fi-rr-plus"></i>
            </button>

            {/* Search */}
            <div className="flex items-center bg-[#f4eedb] dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 rounded-full pl-3.5 pr-1.5 py-1 shadow-sm">
              <i className="fi fi-rr-search text-[#747878] text-xs mr-2"></i>
              <input
                type="text"
                placeholder="ค้นหา Ticker (เช่น PTT.BK, AAPL)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 outline-none text-xs font-semibold text-[#1e1c10] dark:text-white placeholder:text-[#a09a88] w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchYahoo();
                }}
              />
              <button
                onClick={handleSearchYahoo}
                disabled={isSearching || !searchQuery}
                className="bg-[#1e1c10] hover:bg-black disabled:opacity-40 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all border-0 cursor-pointer"
              >
                {isSearching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </div>
          </div>

          {/* Currency / Exchange rate */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-[#e0dac7] dark:border-gray-700 rounded-full px-4 py-2 text-xs font-bold text-[#747878] dark:text-gray-300 shadow-sm">
            <span>USD/THB:</span>
            <span className="text-[#10b981] font-mono font-extrabold text-xs">฿{usdThb.toFixed(2)}</span>
            {isFetchingFresh && (
              <span
                title="กำลังโหลดข้อมูลล่าสุด..."
                className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-1 inline-block"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Asset Table ── */}
      <div className="asset-table-wrap pb-table-wrap">
        <table className="pb-table">
          <thead>
            <tr className="pb-th-tr">
              <th className="pb-th-1"></th>
              <th className="pb-th-default">สินทรัพย์</th>
              <th className="pb-th-default">หมวดหมู่</th>
              <th className="pb-th-right">ราคา (THB)</th>
              <th className="pb-th-right">เปลี่ยนแปลง (%)</th>
              <th className="pb-th-right">
                Yield / Risk
                <InfoTooltip title="ข้อควรระวังเรื่องผลตอบแทน (Yield)" iconColor="var(--accent-blue)" align="right">
                  ตัวเลข %Yield ที่แสดงเป็นเพียงข้อมูลอ้างอิงเบื้องต้น สำหรับหุ้นปันผล %Yield จะแปรผกผันกับราคาหุ้นปัจจุบัน ส่วนกองทุนและ ETF เป็นผลตอบแทนในอดีตซึ่งไม่การันตีอนาคต ควรศึกษาประวัติการจ่ายปันผลย้อนหลังประกอบด้วย
                </InfoTooltip>
              </th>
              <th className="pb-th-center">สัดส่วน (%)</th>
              <th className="pb-th-center">วันที่ซื้อ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.map((asset: any) => {
              const liveData = marketData[asset.id] || {
                price: 0,
                changePercent: 0,
              };
              const isUsd =
                asset.category === "us-stock" || asset.category === "etf-bond";
              const displayPrice = isUsd
                ? liveData.price * usdThb
                : liveData.price;
              const changeColor =
                liveData.changePercent > 0
                  ? "var(--green)"
                  : liveData.changePercent < 0
                  ? "var(--red)"
                  : "var(--text-muted)";
              const isSelected = (numericAllocations[asset.id] || 0) > 0;
              const txns = transactions[asset.id] || [];
              const isExpanded = expandedAssets[asset.id];

              return (
                <React.Fragment key={asset.id}>
                  <tr
                    className={`pb-tr-asset ${isSelected ? 'pb-tr-asset-selected' : 'pb-tr-asset-unselected'}`}
                  >
                    <td
                      className={`pb-td-indicator ${isSelected ? 'pb-td-indicator-active' : 'pb-td-indicator-inactive'}`}
                    />
                    <td className="pb-td-pad">
                      <div className="pb-asset-title-wrap">
                        {asset.id}
                        {asset.badge === "div" && (
                          <span className="pb-badge-div">
                            DIV
                          </span>
                        )}
                        {asset.badge === "growth" && (
                          <span className="pb-badge-growth">
                            GROWTH
                          </span>
                        )}
                      </div>
                      <div className="pb-asset-name">
                        {asset.name}
                      </div>
                    </td>
                    <td className="pb-td-muted">
                      <span className="pb-sector-pill">
                        {asset.sector}
                      </span>
                    </td>
                    <td className="pb-td-price">
                      {displayPrice > 0
                        ? `${displayPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                      {isUsd && liveData.price > 0 && (
                        <div className="pb-price-usd">
                          ${liveData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td
                      className="pb-td-change"
                      style={{ color: changeColor }}
                    >
                      {liveData.changePercent !== 0
                        ? `${liveData.changePercent > 0 ? "+" : ""}${liveData.changePercent.toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="pb-td-right">
                      <div className="pb-yield-val">
                        {Number(asset.yield || 0).toFixed(1)}%
                      </div>
                      <div className="pb-risk-val">
                        R: {asset.risk}/10
                      </div>
                    </td>
                    <td className="pb-td-center">
                      <div className={`pb-alloc-val ${isSelected ? 'pb-alloc-active' : 'pb-alloc-inactive'}`}>
                        {numericAllocations[asset.id] || 0}%
                      </div>
                    </td>
                    <td className="pb-td-center">
                      <button
                        onClick={() => {
                          if (txns.length === 0) handleAddTransaction(asset.id);
                          else setExpandedAssets(prev => ({ ...prev, [asset.id]: !prev[asset.id] }));
                        }}
                        className="pb-txn-btn"
                      >
                        {txns.length > 0 ? (isExpanded ? "▼ ซ่อน" : `▶ ไม้ (${txns.length})`) : "+ เพิ่มไม้"}
                      </button>
                    </td>
                  </tr>
                  
                  {isExpanded && txns.map((txn, index) => (
                    <tr key={index} style={{ background: "rgba(255,255,255,0.02)", borderBottom: index === txns.length - 1 ? "1px solid var(--border)" : "1px dashed rgba(255,255,255,0.1)" }}>
                      <td colSpan={6} style={{ padding: "8px 12px 8px 32px", color: "var(--text-muted)", fontSize: "12px" }}>
                        ไม้ที่ {index + 1}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <button onClick={() => handleStep(asset.id, index, -5)} style={{ width: "20px", height: "20px", borderRadius: "4px", background: "var(--bg)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="fi fi-rr-minus" style={{ fontSize: '10px', color: 'var(--text-main)' }}></i>
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={txn.allocation}
                            placeholder="-"
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, "");
                              handleTransactionChange(asset.id, index, 'allocation', v);
                            }}
                            style={{
                              width: "40px",
                              textAlign: "center",
                              background: "transparent",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              padding: "2px",
                              color: "var(--green)",
                              fontWeight: 700,
                              fontFamily: "'Space Mono',monospace",
                              fontSize: "12px",
                            }}
                          />
                          <button onClick={() => handleStep(asset.id, index, 5)} style={{ width: "20px", height: "20px", borderRadius: "4px", background: "var(--bg)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="fi fi-rr-plus" style={{ fontSize: '10px', color: 'var(--text-main)' }}></i>
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <input
                            type="date"
                            value={txn.buyDate}
                            onChange={(e) => handleTransactionChange(asset.id, index, 'buyDate', e.target.value)}
                            style={{
                              background: "var(--bg-sub)",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              color: "var(--green)",
                              fontSize: "11px",
                              padding: "2px 4px",
                              outline: "none"
                            }}
                          />
                          <button 
                            onClick={() => handleRemoveTransaction(asset.id, index)}
                            style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
                            title="ลบไม้นี้"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {isExpanded && (
                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={8} style={{ padding: "8px 12px", textAlign: "center" }}>
                         <button 
                           onClick={() => handleAddTransaction(asset.id)}
                           style={{ background: "transparent", border: "1px dashed var(--border)", borderRadius: "4px", padding: "4px 12px", fontSize: "11px", color: "var(--text-main)", cursor: "pointer" }}
                         >
                           + เพิ่มไม้อื่น (DCA)
                         </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--bg-sub)",
                border: "1px solid var(--border)",
                color: "var(--text-main)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              ← ก่อนหน้า
            </button>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              หน้า {currentPage} จาก {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--bg-sub)",
                border: "1px solid var(--border)",
                color: "var(--text-main)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>



      {bottomContent && <div>{bottomContent}</div>}
    </div>
  );
}

