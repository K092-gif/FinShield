'use client'

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

  const dcaAccumulated = state.dcaInfo?.totalDcaAmount || 0;
  const totalInvestmentWithDca = (state.initialInvestment || 0) + dcaAccumulated;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fff9eb] dark:bg-[#161512] rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.15)] w-full max-w-5xl max-h-[92vh] flex flex-col border border-[rgba(0,0,0,0.08)] overflow-hidden">
        
        {/* Modal Header & Tabs (Serene Pulse) */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-gray-200/60 dark:border-[#35332b] bg-[#faf3e0] dark:bg-[#201f1a]">
          <div className="flex gap-2">
            <button
              onClick={() => actions.setPortfolioModalTab('my')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-0 cursor-pointer ${
                state.portfolioModalTab === 'my'
                  ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                  : 'text-[#747878] dark:text-[#a8a497] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
              }`}
            >
              <i className="fi fi-sr-briefcase text-xs"></i>
              <span>My Portfolio</span>
            </button>
            <button
              onClick={() => actions.setPortfolioModalTab('ai')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border-0 cursor-pointer ${
                state.portfolioModalTab === 'ai'
                  ? 'bg-[#fed330] text-[#1e1c10] shadow-sm'
                  : 'text-[#747878] dark:text-[#a8a497] hover:text-[#1e1c10] dark:hover:text-white bg-transparent'
              }`}
            >
              <i className="fi fi-sr-sparkles text-xs"></i>
              <span>AI แนะนำพอร์ต</span>
            </button>
          </div>
          
          <button
            onClick={() => actions.setShowPortfolioModal(false)}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#282620] text-[#1e1c10] dark:text-white flex items-center justify-center border border-gray-200/80 dark:border-[#423e35] hover:bg-[#f4eedb] dark:hover:bg-[#35332b] transition-all cursor-pointer shadow-sm text-sm"
          >
            <i className="fi fi-rr-cross text-xs"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#fff9eb] dark:bg-[#161512]">
          {state.portfolioModalTab === 'my' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#1e1c10] dark:text-white m-0 flex items-center gap-2">
                    <i className="fi fi-sr-briefcase text-base text-[#1e1c10] dark:text-gray-300"></i>
                    <span>จัดพอร์ตของคุณเอง (My Portfolio)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#747878] dark:text-gray-400 m-0 mt-0.5">
                    เลือกสินทรัพย์ที่ต้องการลงทุน ระบุสัดส่วน และวันที่ซื้อเพื่อดูปฏิทินปันผล
                  </p>
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
                  className="inline-flex items-center justify-center bg-[#1e1c10] hover:bg-black text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-md self-start sm:self-auto border-0 cursor-pointer"
                >
                  เสร็จสิ้น
                </button>
              </div>

              <PortfolioBuilder
                storageKey={`finshield-portfolio-myport-${user?.uid || 'guest'}`}
                onChange={actions.setMyPortfolioBuilderData}
              />
            </div>
          )}

          {state.portfolioModalTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#1e1c10] dark:text-white m-0 flex items-center gap-2">
                    <i className="fi fi-sr-sparkles text-base text-purple-600"></i>
                    <span>ขอคำแนะนำจาก AI</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#747878] dark:text-gray-400 m-0 mt-0.5">
                    AI จะวิเคราะห์ข้อมูลการเงินและสถานการณ์ของคุณ เพื่อแนะนำพอร์ตที่เหมาะสมที่สุด
                  </p>
                </div>
                <button
                  onClick={() => actions.setShowPortfolioModal(false)}
                  className="inline-flex items-center justify-center bg-[#1e1c10] hover:bg-black text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-md self-start sm:self-auto border-0 cursor-pointer"
                >
                  เสร็จสิ้น
                </button>
              </div>

              <AiAdvisor
                goal="wealth_plan"
                context={{
                  currentSavings: state.totalCapital || undefined,
                  investmentAmount: totalInvestmentWithDca > 0 ? totalInvestmentWithDca : (state.initialInvestment || undefined),
                  emergencyFund: state.emergencyRequired || undefined,
                  scenarioType: (state.selectedScenario && state.contextItems.some((c: any) => c.label === "วิกฤตที่กังวล")) ? state.selectedScenario : undefined,
                  severity: (state.selectedScenario && state.contextItems.some((c: any) => c.label === "วิกฤตที่กังวล")) ? state.severity : undefined,
                  inflationRate: state.inflationRate || undefined,
                  monthlySalary: state.salary || undefined,
                  monthlyExpense: state.totalMonthlyExpense || undefined,
                  riskTolerance: "medium",
                  dcaAmount: dcaAccumulated > 0 ? dcaAccumulated : undefined,
                  monthlyDca: state.monthlyInvestment > 0 ? state.monthlyInvestment : undefined,
                  dcaDay: state.dcaDay || 1,
                }}
                contextItems={state.contextItems.length > 0 ? state.contextItems : undefined}
                showCustomPrompt
                onAddToPortfolio={(suggestion) => {
                  const id = suggestion.name.replace(/\s+/g, '_').toUpperCase();
                  actions.setAiPortfolio((prev: any[]) => {
                    const currentList = Array.isArray(prev) ? prev : [];
                    const exists = currentList.some((p: any) => p.id === id);
                    let newItems: any[] = [];
                    if (exists) {
                      newItems = [...currentList];
                    } else {
                      const newItem = {
                        id,
                        name: suggestion.name,
                        type: suggestion.type,
                        allocation: Number(suggestion.allocation) || 25,
                        expectedYield: Number(suggestion.expectedYield) || 0,
                        riskLevel: suggestion.riskLevel || 'ปานกลาง',
                        market: suggestion.market || 'TH',
                      };
                      newItems = [...currentList, newItem];
                    }

                    // Always rebalance all assets to exactly 100% total
                    const totalAlloc = newItems.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
                    if (totalAlloc > 0) {
                      let accumulated = 0;
                      return newItems.map((item, idx) => {
                        if (idx === newItems.length - 1) {
                          const lastAlloc = Math.max(1, 100 - accumulated);
                          return { ...item, allocation: lastAlloc };
                        }
                        const proportional = Math.max(1, Math.round((item.allocation / totalAlloc) * 100));
                        accumulated += proportional;
                        return { ...item, allocation: proportional };
                      });
                    }
                    return newItems;
                  });
                }}
                onRemoveFromPortfolio={(suggestion) => {
                  const id = suggestion.name.replace(/\s+/g, '_').toUpperCase();
                  actions.setAiPortfolio((prev: any[]) => {
                    const remaining = (prev || []).filter((p: any) => p.id !== id);
                    if (remaining.length === 0) return [];
                    const totalAlloc = remaining.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
                    if (totalAlloc > 0) {
                      let accumulated = 0;
                      return remaining.map((item, idx) => {
                        if (idx === remaining.length - 1) {
                          const lastAlloc = Math.max(1, 100 - accumulated);
                          return { ...item, allocation: lastAlloc };
                        }
                        const proportional = Math.max(1, Math.round((item.allocation / totalAlloc) * 100));
                        accumulated += proportional;
                        return { ...item, allocation: proportional };
                      });
                    }
                    return remaining;
                  });
                }}
                currentPortfolioIds={Array.isArray(state.aiPortfolio) ? state.aiPortfolio.map((p: any) => p.id) : []}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
