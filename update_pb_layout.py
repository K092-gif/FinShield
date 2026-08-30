path_tsx = "/home/kamonpku/projects/FinShield/Frontend/src/components/simulator/PortfolioBuilder.tsx"
path_css = "/home/kamonpku/projects/FinShield/Frontend/src/components/ui/PortfolioBuilder.css"

with open(path_tsx, "r", encoding="utf-8") as f:
    c = f.read()

# Replace filter bar structure
old_filter_bar = """      {/* ── Filter Bar ── */}
      <div className="filter-bar pb-filter-bar">
        <div className="cat-tabs pb-cat-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-tab pb-cat-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(cat);
                setCurrentPage(1);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="pb-action-group">
          <div className="pb-select-wrap">
            <i className="fi fi-sr-folder-open pb-icon-gold"></i>
            <select
              onChange={handleLoadPort}
              className="pb-select"
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
            className="pb-btn-icon"
          >
            <i className="fi fi-rr-plus pb-icon-add"></i>
          </button>

          <div className="search-wrap pb-search-container">
            <div className="pb-search-inner">
              <i className="fi fi-rr-search pb-search-icon"></i>
              <input
                type="text"
                placeholder="ค้นหา Ticker (เช่น PTT.BK, AAPL)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pb-search-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchYahoo();
                }}
              />
            </div>
            <button
              onClick={handleSearchYahoo}
              disabled={isSearching || !searchQuery}
              className={`pb-btn-icon pb-search-btn ${(isSearching || !searchQuery) ? 'pb-search-btn-disabled' : 'pb-search-btn-active'}`}
            >
              {isSearching ? 'ค้นหา...' : 'ค้นหา'}
            </button>
          </div>

          <div className="pb-exchange-rate" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            USD/THB:{" "}
            <span className="pb-exchange-val">฿{usdThb.toFixed(2)}</span>
            {isFetchingFresh && (
              <span
                title="กำลังโหลดข้อมูลล่าสุด..."
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(59,130,246,0.3)',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </div>
      </div>"""

new_filter_bar = """      {/* ── Filter Bar (Line 1: Categories, Line 2: Fav, Search, Currency) ── */}
      <div className="filter-bar pb-filter-bar space-y-3">
        {/* Line 1: Categories spanning long across */}
        <div className="cat-tabs pb-cat-tabs flex flex-wrap items-center gap-2 w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`cat-tab pb-cat-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => {
                setActiveCategory(cat);
                setCurrentPage(1);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Line 2: Fav/Presets, Search, Exchange rate */}
        <div className="pb-action-group flex flex-wrap items-center justify-between gap-3 w-full pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Fav / Presets */}
            <div className="pb-select-wrap">
              <i className="fi fi-sr-folder-open pb-icon-gold"></i>
              <select
                onChange={handleLoadPort}
                className="pb-select"
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
              className="pb-btn-icon"
            >
              <i className="fi fi-rr-plus pb-icon-add"></i>
            </button>

            {/* Search */}
            <div className="search-wrap pb-search-container">
              <div className="pb-search-inner">
                <i className="fi fi-rr-search pb-search-icon"></i>
                <input
                  type="text"
                  placeholder="ค้นหา Ticker (เช่น PTT.BK, AAPL)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pb-search-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchYahoo();
                  }}
                />
              </div>
              <button
                onClick={handleSearchYahoo}
                disabled={isSearching || !searchQuery}
                className={`pb-btn-icon pb-search-btn ${(isSearching || !searchQuery) ? 'pb-search-btn-disabled' : 'pb-search-btn-active'}`}
              >
                {isSearching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </div>
          </div>

          {/* Currency / Exchange rate */}
          <div className="pb-exchange-rate" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            USD/THB:{" "}
            <span className="pb-exchange-val">฿{usdThb.toFixed(2)}</span>
            {isFetchingFresh && (
              <span
                title="กำลังโหลดข้อมูลล่าสุด..."
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(59,130,246,0.3)',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </div>
      </div>"""

if old_filter_bar in c:
    c = c.replace(old_filter_bar, new_filter_bar)
    with open(path_tsx, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated filter bar in PortfolioBuilder.tsx")
else:
    print("Direct pattern not found in PortfolioBuilder.tsx")

with open(path_css, "r", encoding="utf-8") as f:
    css = f.read()

# Ensure .pb-filter-bar and .pb-action-group layout
css = css.replace(
    """.pb-filter-bar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (min-width: 900px) {
  .pb-filter-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}""",
    """.pb-filter-bar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}"""
)

with open(path_css, "w", encoding="utf-8") as f:
    f.write(css)
print("Updated PortfolioBuilder.css")
