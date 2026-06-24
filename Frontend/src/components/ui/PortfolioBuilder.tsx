"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiCall } from "@/lib/api";
import { useFinance } from "@/contexts/FinanceContext";
import {
  ChartBar,
  ChartDonut,
  FolderOpen,
  Star,
  MagnifyingGlass,
  Minus,
  Plus,
  TrendUp,
  TrendDown,
  Coins,
} from "@phosphor-icons/react";

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

// ─── Props ────────────────────────────────────────────────────────────
interface PortfolioBuilderProps {
  storageKey?: string;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  onChange?: (data: {
    allocations: Record<string, number>;
    weightedYield: number;
    riskScore: number;
    selectedAssets: Asset[];
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted)",
          fontSize: "12px",
        }}
      >
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        width: "100%",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0 }}
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
            style={{ transition: "all 0.4s ease" }}
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
        {arcs.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                background: a.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                color: "var(--text-muted)",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {a.label}
            </span>
            <span
              style={{
                fontFamily: "'Space Mono',monospace",
                fontWeight: 700,
                color: "var(--text-main)",
              }}
            >
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

  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [marketData, setMarketData] = useState<
    Record<string, { price: number; changePercent: number }>
  >({});
  const [usdThb, setUsdThb] = useState(33);
  const [savedPorts, setSavedPorts] = useState<Record<string, Record<string, string>>>({});

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
        if (parsed && typeof parsed === "object") setAllocations(parsed);
      }
    } catch {}
    try {
      const ports = localStorage.getItem("finshield-saved-ports");
      if (ports) setSavedPorts(JSON.parse(ports));
    } catch {}
  }, [storageKey]);

  // ── Persist on every change ──
  useEffect(() => {
    // only persist if there's at least one allocation
    const hasAny = Object.values(allocations).some((v) => Number(v) > 0);
    if (hasAny) {
      localStorage.setItem(storageKey, JSON.stringify(allocations));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [allocations, storageKey]);

  // ── Convert string allocations → numbers ──
  const numericAllocations = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(allocations)) {
      const n = Number(v);
      if (n > 0) out[k] = n;
    }
    return out;
  }, [allocations]);

  // ── Save / Load ports ──
  const handleSavePort = () => {
    if (Object.keys(numericAllocations).length === 0) {
      alert("กรุณาเลือกสินทรัพย์อย่างน้อย 1 ตัวก่อนบันทึกพอร์ต");
      return;
    }
    const name = prompt("ตั้งชื่อพอร์ตของคุณ:");
    if (name) {
      const updated = { ...savedPorts, [name]: allocations };
      setSavedPorts(updated);
      localStorage.setItem("finshield-saved-ports", JSON.stringify(updated));
      alert("บันทึกพอร์ตเรียบร้อยแล้ว");
    }
  };

  const handleLoadPort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (name && savedPorts[name]) {
      setAllocations(savedPorts[name]);
    } else if (name === "") {
      setAllocations({});
    }
  };

  // ── Fetch assets ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetsRes, marketDataRes] = await Promise.all([
          apiCall("/simulator/assets").catch(() => []),
          apiCall("/simulator/market-data").catch(() => ({})),
        ]);
        if (Array.isArray(assetsRes) && assetsRes.length > 0) {
          setAssets(
            assetsRes.map((a: any) => ({
              ...a,
              categoryDisplay: CATEGORY_MAP[a.category] || a.category,
              sector: a.sector || "อื่นๆ",
            }))
          );
        }
        if (marketDataRes) {
          setMarketData(marketDataRes);
          if (marketDataRes["USDTHB"]?.price)
            setUsdThb(marketDataRes["USDTHB"].price);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Allocation change ──
  const handleAllocationChange = useCallback((id: string, value: string) => {
    // keep raw string for input
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    setAllocations((prev) => ({ ...prev, [id]: value === "" ? "" : String(num) }));
  }, []);

  const handleStep = useCallback((id: string, delta: number) => {
    setAllocations((prev) => {
      const cur = Number(prev[id]) || 0;
      const next = Math.max(0, Math.min(100, cur + delta));
      return { ...prev, [id]: next > 0 ? String(next) : "" };
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
        allocations: numericAllocations,
        weightedYield,
        riskScore,
        selectedAssets,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericAllocations, assets]);

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
    <div className="portfolio-builder" style={{ width: "100%" }}>
      {topContent && <div style={{ marginBottom: "24px" }}>{topContent}</div>}

      {/* ── Summary + Donut ── */}
      <div className="grid2" style={{ marginBottom: "24px" }}>
        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ChartBar weight="bold" size={18} /> พอร์ตรวม (PORTFOLIO)
          </div>
          <div className="stat-row">
            <span className="stat-label">Weighted Yield</span>
            <span className="stat-val" style={{ color: "var(--text-main)" }}>
              {weightedYield.toFixed(2)}%
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Risk Score</span>
            <span className="stat-val" style={{ color: "var(--text-main)" }}>
              {riskScore.toFixed(1)} / 10
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">สินทรัพย์ที่เลือก</span>
            <span className="stat-val" style={{ color: "var(--accent-blue)" }}>
              {selectedAssets.length} ตัว
            </span>
          </div>
          <div className="progress-wrap" style={{ marginTop: "20px" }}>
            <div className="progress-label">
              <span>สัดส่วนรวม</span>
              <span
                style={{
                  color: totalAllocation > 100 ? "var(--red)" : "var(--text-main)",
                }}
              >
                {totalAllocation}%
              </span>
            </div>
            <div className="progress-track" style={{ height: "10px" }}>
              <div
                className={`progress-fill ${totalAllocation > 100 ? "over" : "ok"}`}
                style={{
                  width: `${Math.min(100, totalAllocation)}%`,
                  background:
                    totalAllocation > 100 ? "var(--red)" : "var(--accent-blue)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ChartDonut weight="bold" size={18} /> การกระจายประเภทสินทรัพย์
          </div>
          <div style={{ padding: "8px 0" }}>
            <DonutChart data={categoryData} />
          </div>
        </div>
      </div>


      {/* ── Filter Bar ── */}
      <div
        className="filter-bar"
        style={{
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="cat-tabs"
          style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(cat);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "100px",
                fontSize: "12px",
                fontWeight: 600,
                border: `1px solid ${
                  activeCategory === cat ? "var(--border2)" : "var(--border)"
                }`,
                background:
                  activeCategory === cat ? "var(--bg-hover)" : "var(--card)",
                color:
                  activeCategory === cat
                    ? "var(--text-main)"
                    : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--card)",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <FolderOpen weight="bold" size={16} color="var(--gold)" />
            <select
              onChange={handleLoadPort}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-main)",
                cursor: "pointer",
              }}
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
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Plus weight="bold" color="var(--text-main)" size={16} />
          </button>

          <div
            className="search-wrap"
            style={{ position: "relative", width: "200px" }}
          >
            <MagnifyingGlass
              size={16}
              color="var(--text-light)"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              placeholder="ค้นหา Ticker..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "100px",
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--card)",
              padding: "8px 16px",
              borderRadius: "100px",
              border: "1px solid var(--border)",
            }}
          >
            USD/THB:{" "}
            <span style={{ color: "var(--green)" }}>฿{usdThb.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Asset Table ── */}
      <div
        className="asset-table-wrap"
        style={{
          marginBottom: "24px",
          overflowX: "auto",
          background: "var(--card)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                textAlign: "left",
                color: "var(--text-muted)",
              }}
            >
              <th style={{ padding: "16px 12px", width: "2px" }}></th>
              <th style={{ padding: "16px 12px" }}>สินทรัพย์</th>
              <th style={{ padding: "16px 12px" }}>หมวดหมู่</th>
              <th style={{ padding: "16px 12px", textAlign: "right" }}>
                ราคา (THB)
              </th>
              <th style={{ padding: "16px 12px", textAlign: "right" }}>
                เปลี่ยนแปลง (%)
              </th>
              <th style={{ padding: "16px 12px", textAlign: "right" }}>
                Yield / Risk
              </th>
              <th style={{ padding: "16px 12px", textAlign: "center" }}>
                สัดส่วน (%)
              </th>
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
              const rawValue = allocations[asset.id];

              return (
                <tr
                  key={asset.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: isSelected
                      ? "rgba(16,185,129,0.04)"
                      : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  <td
                    style={{
                      padding: 0,
                      width: "4px",
                      minWidth: "4px",
                      maxWidth: "4px",
                      background: isSelected ? "#10b981" : "transparent",
                      transition: "background 0.2s",
                    }}
                  />
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-main)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {asset.id}
                      {asset.badge === "div" && (
                        <span
                          style={{
                            fontSize: "9px",
                            background: "rgba(16,185,129,0.1)",
                            color: "var(--green)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          DIV
                        </span>
                      )}
                      {asset.badge === "growth" && (
                        <span
                          style={{
                            fontSize: "9px",
                            background: "rgba(59,130,246,0.1)",
                            color: "var(--accent-blue)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          GROWTH
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {asset.name}
                    </div>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-muted)" }}>
                    <span
                      style={{
                        background: "var(--bg-sub)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      {asset.sector}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontFamily: "'Space Mono'",
                    }}
                  >
                    {displayPrice > 0
                      ? `${displayPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                    {isUsd && liveData.price > 0 && (
                      <div
                        style={{ fontSize: "10px", color: "var(--text-muted)" }}
                      >
                        ${liveData.price.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: 700,
                      fontFamily: "'Space Mono'",
                      color: changeColor,
                    }}
                  >
                    {liveData.changePercent !== 0
                      ? `${liveData.changePercent > 0 ? "+" : ""}${liveData.changePercent.toFixed(2)}%`
                      : "-"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ color: "var(--gold)", fontWeight: 600 }}>
                      {asset.yield}%
                    </div>
                    <div
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      R: {asset.risk}/10
                    </div>
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => handleStep(asset.id, -5)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                          background: "var(--bg-sub)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Minus size={12} color="var(--text-main)" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          rawValue === undefined || rawValue === ""
                            ? ""
                            : rawValue
                        }
                        placeholder="-"
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          handleAllocationChange(asset.id, v);
                        }}
                        style={{
                          width: "45px",
                          textAlign: "center",
                          background: "transparent",
                          border: `1px solid ${
                            isSelected
                              ? "rgba(16,185,129,0.4)"
                              : "var(--border)"
                          }`,
                          borderRadius: "4px",
                          padding: "4px",
                          color: isSelected
                            ? "var(--green)"
                            : "var(--text-main)",
                          fontWeight: isSelected ? 800 : 500,
                          fontFamily: "'Space Mono',monospace",
                          fontSize: "13px",
                        }}
                      />
                      <button
                        onClick={() => handleStep(asset.id, 5)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                          background: "var(--bg-sub)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Plus size={12} color="var(--text-main)" />
                      </button>
                    </div>
                  </td>
                </tr>
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
