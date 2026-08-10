import React from 'react';
import AiAdvisor from "@/components/simulator/AiAdvisor";
import PortfolioBuilder from "@/components/simulator/PortfolioBuilder";
import { useAuth } from "@/contexts/AuthContext";

interface PortfolioModalProps {
  state: any;
  actions: any;
}

export default function PortfolioModal({ state, actions }: PortfolioModalProps) {
  const { user } = useAuth();
  
  if (!state.showPortfolioModal) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-main)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-[var(--border)] overflow-hidden">
        {/* Modal Header & Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-sub)]">
          <div className="flex gap-2">
            <button
              onClick={() => actions.setPortfolioModalTab('my')}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
                state.portfolioModalTab === 'my'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <i className="fi fi-sr-briefcase mr-1.5"></i> My Portfolio
            </button>
            <button
              onClick={() => actions.setPortfolioModalTab('ai')}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
                state.portfolioModalTab === 'ai'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <i className="fi fi-sr-sparkles mr-1.5"></i> AI แนะนำพอร์ต
            </button>
          </div>
          <button
            onClick={() => actions.setShowPortfolioModal(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <i className="fi fi-rr-cross text-[12px]"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-main)]">
          {state.portfolioModalTab === 'my' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-[18px] flex items-center gap-2 text-blue-600">
                  <i className="fi fi-sr-briefcase"></i> จัดพอร์ตของคุณเอง (My Portfolio)
                </div>
                <button
                  onClick={() => {
                    if (state.myPortfolioBuilderData) {
                      const { selectedAssets, transactions, allAddedAssets } = state.myPortfolioBuilderData;
                      const assetsToMap = allAddedAssets || selectedAssets;
                      const newMyPort = assetsToMap.map((asset: any) => {
                        const txs = transactions[asset.id] || [];
                        const totalAlloc = txs.reduce((sum: number, tx: any) => sum + Number(tx.allocation || 0), 0);
                        return {
                          id: asset.id,
                          name: asset.id,
                          type: asset.categoryDisplay || asset.category,
                          allocation: totalAlloc,
                          expectedYield: asset.yield || 0,
                          riskLevel: asset.risk <= 4 ? 'ต่ำ' : asset.risk <= 7 ? 'ปานกลาง' : 'สูง',
                          market: asset.category === 'us-stock' ? 'US' : 'TH'
                        };
                      });
                      actions.setMyPortfolio(newMyPort);
                    }
                    actions.setShowPortfolioModal(false);
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  เสร็จสิ้น
                </button>
              </div>
              <div className="text-[13px] text-gray-500 mb-6">
                เลือกสินทรัพย์ที่ต้องการลงทุน ระบุสัดส่วน และวันที่ซื้อเพื่อดูปฏิทินปันผล
              </div>
              <PortfolioBuilder
                storageKey={`finshield-portfolio-myport-${user?.uid || 'guest'}`}
                onChange={actions.setMyPortfolioBuilderData}
              />
            </div>
          )}

          {state.portfolioModalTab === 'ai' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-[18px] flex items-center gap-2 text-purple-600">
                  <i className="fi fi-sr-sparkles"></i> ขอคำแนะนำจาก AI
                </div>
                <button
                  onClick={() => actions.setShowPortfolioModal(false)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  เสร็จสิ้น
                </button>
              </div>
              <div className="text-[13px] text-gray-500 mb-6">
                AI จะวิเคราะห์ข้อมูลการเงินและสถานการณ์ของคุณ เพื่อแนะนำพอร์ตที่เหมาะสมที่สุด
              </div>
              <AiAdvisor
                goal="wealth_plan"
                context={{
                  currentSavings: state.totalCapital || undefined,
                  investmentAmount: state.initialInvestment || undefined,
                  emergencyFund: state.emergencyRequired || undefined,
                  scenarioType: (state.selectedScenario && state.contextItems.some((c: any) => c.label === "วิกฤตที่กังวล")) ? state.selectedScenario : undefined,
                  severity: (state.selectedScenario && state.contextItems.some((c: any) => c.label === "วิกฤตที่กังวล")) ? state.severity : undefined,
                  inflationRate: state.inflationRate || undefined,
                  monthlySalary: state.salary || undefined,
                  monthlyExpense: state.totalMonthlyExpense || undefined,
                  riskTolerance: "medium",
                }}
                contextItems={state.contextItems.length > 0 ? state.contextItems : undefined}
                showCustomPrompt
                onAddToPortfolio={(suggestion) => {
                  const id = suggestion.name.replace(/\s+/g, '_').toUpperCase();
                  actions.setAiPortfolio((prev: any) => {
                    if (prev.find((p: any) => p.id === id)) return prev;
                    return [...prev, {
                      id,
                      name: suggestion.name,
                      type: suggestion.type,
                      allocation: suggestion.allocation,
                      expectedYield: suggestion.expectedYield,
                      riskLevel: suggestion.riskLevel,
                      market: suggestion.market,
                    }];
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
