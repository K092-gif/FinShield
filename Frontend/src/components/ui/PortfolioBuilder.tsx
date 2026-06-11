"use client";

import React, { useState } from "react";
import { 
  ChartBar, 
  ChartDonut, 
  FolderOpen, 
  Star, 
  MagnifyingGlass,
  Minus,
  Plus
} from "@phosphor-icons/react";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  risk: number;
  yield: number;
  category: string;
  color: string;
}

const MOCK_ASSETS: Asset[] = [
  { id: "1", symbol: "PTT", name: "PTT PCL", risk: 5, yield: 6.10, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "2", symbol: "AOT", name: "Airports of Thailand", risk: 6, yield: 8.50, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "3", symbol: "ADVANC", name: "AIS", risk: 4, yield: 5.50, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "4", symbol: "CPALL", name: "CP All", risk: 4, yield: 4.80, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "5", symbol: "BDMS", name: "Bangkok Dusit Medical", risk: 3, yield: 3.10, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "6", symbol: "SCB", name: "SCB X", risk: 4, yield: 5.80, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "7", symbol: "KBANK", name: "Kasikorn Bank", risk: 4, yield: 5.20, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "8", symbol: "GULF", name: "Gulf Energy", risk: 7, yield: 9.20, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
  { id: "9", symbol: "DELTA", name: "Delta Electronics", risk: 8, yield: 12.40, category: "TH หุ้นปันผล & บลูชิพไทย", color: "#16a34a" },
];

const CATEGORIES = [
  "ทั้งหมด",
  "TH หุ้นปันผล & บลูชิพไทย",
  "REITs/IFF",
  "DR/DRx",
  "US Growth",
  "ETF/ตราสารหนี้"
];

interface PortfolioBuilderProps {
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

export default function PortfolioBuilder({ topContent, bottomContent }: PortfolioBuilderProps) {
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const handleAllocationChange = (id: string, value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    setAllocations(prev => ({
      ...prev,
      [id]: newValue
    }));
  };

  const totalAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  
  let weightedYield = 0;
  let riskScore = 0;

  if (totalAllocation > 0) {
    MOCK_ASSETS.forEach(asset => {
      const alloc = allocations[asset.id] || 0;
      if (alloc > 0) {
        weightedYield += (asset.yield * alloc) / totalAllocation;
        riskScore += (asset.risk * alloc) / totalAllocation;
      }
    });
  }

  const filteredAssets = MOCK_ASSETS.filter(asset => {
    const matchesCat = activeCategory === "ทั้งหมด" || asset.category === activeCategory;
    const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="portfolio-builder" style={{ width: '100%' }}>
      {topContent && <div style={{ marginBottom: '24px' }}>{topContent}</div>}
      
      <div className="grid2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChartBar weight="bold" size={18} /> พอร์ตรวม (PORTFOLIO)
          </div>
          <div className="stat-row">
            <span className="stat-label">Weighted Yield</span>
            <span className="stat-val" style={{ color: 'var(--text-main)' }}>
              {weightedYield.toFixed(2)}%
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Risk Score</span>
            <span className="stat-val" style={{ color: 'var(--text-main)' }}>
              {riskScore.toFixed(1)} / 10
            </span>
          </div>
          <div className="progress-wrap" style={{ marginTop: '24px' }}>
            <div className="progress-label">
              <span>สัดส่วนรวม</span>
              <span style={{ color: totalAllocation > 100 ? 'var(--red)' : 'var(--text-main)' }}>
                {totalAllocation}%
              </span>
            </div>
            <div className="progress-track" style={{ height: '10px' }}>
              <div 
                className={`progress-fill ${totalAllocation > 100 ? 'over' : 'ok'}`} 
                style={{ width: `${Math.min(100, totalAllocation)}%`, background: totalAllocation > 100 ? 'var(--red)' : 'var(--border2)' }}
              />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChartDonut weight="bold" size={18} /> การกระจายความเสี่ยง
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'var(--text-muted)' }}>
            [ กราฟแสดงสัดส่วน ]
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="cat-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                border: `1px solid ${activeCategory === cat ? 'var(--border2)' : 'var(--border)'}`,
                background: activeCategory === cat ? 'var(--bg-hover)' : 'var(--card)',
                color: activeCategory === cat ? 'var(--text-main)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <FolderOpen weight="bold" size={16} color="var(--gold)" />
            <select style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
              <option>เลือกพอร์ตที่บันทึกไว้</option>
            </select>
          </div>
          
          <button style={{ 
            width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--gold)', 
            background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
          }}>
            <Star weight="fill" color="var(--gold)" size={18} />
          </button>

          <div className="search-wrap" style={{ position: 'relative', width: '200px' }}>
            <MagnifyingGlass size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="ค้นหา Ticker..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '100px', 
                border: '1px solid var(--border)', background: 'var(--card)', 
                fontSize: '13px', outline: 'none' 
              }} 
            />
          </div>
        </div>
      </div>

      <div className="asset-table-wrap" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <ChartBar weight="duotone" size={48} style={{ margin: '0 auto 16px', color: 'var(--border2)' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>กำลังพัฒนาระบบดึงข้อมูลสินทรัพย์</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>ข้อมูล Real-time จะพร้อมให้ใช้งานเร็วๆ นี้</div>
        </div>
      </div>

      {bottomContent && <div>{bottomContent}</div>}
    </div>
  );
}
