import { Router, Request, Response } from "express";

const router = Router();

// ─── Types ───────────────────────────────────────────────────────────
interface AiSuggestRequest {
  goal: "inflation" | "emergency" | "overall" | "wealth_plan";
  context: {
    investmentAmount?: number;
    timeline?: number;
    monthlySalary?: number;
    monthlyExpense?: number;
    inflationRate?: number;
    emergencyFund?: number;
    riskTolerance?: "low" | "medium" | "high";
    currentSavings?: number;
    scenarioType?: string;
    severity?: string;
    isSurviving?: boolean;
    shortfall?: number;
    profession?: string;
    expectedYieldTarget?: number;
  };
  customPrompt?: string;
}

interface PortfolioSuggestion {
  name: string;
  type: string;
  allocation: number;
  expectedYield: number;
  riskLevel: string;
  reason: string;
  market: string; // "TH" | "US" | "Global"
}

interface AiSuggestResponse {
  summary: string;
  portfolioSuggestions: PortfolioSuggestion[];
  expectedPortfolioYield: number;
  riskAssessment: string;
  warnings: string[];
  disclaimer: string;
}

// ─── System Prompts ──────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, string> = {
  inflation: `คุณเป็นที่ปรึกษาการลงทุนมืออาชีพที่เชี่ยวชาญตลาดไทยและต่างประเทศ
หน้าที่ของคุณคือแนะนำพอร์ตลงทุนที่:
1. ให้ผลตอบแทนชนะเงินเฟ้อ (มากกว่า 3% ต่อปี) และพยายามให้ได้ตาม "ผลตอบแทนที่คาดหวัง" ที่ผู้ใช้ระบุ
2. ปลอดภัยกับเงินต้น — เน้นหุ้นปันผลที่มั่นคง, กองทุนรวม, REITs, ETF
3. กระจายความเสี่ยงทั้งสินทรัพย์ไทยและต่างประเทศ
4. ประเมิน **ความเป็นไปได้ (Feasibility)** ของเป้าหมายผลตอบแทน เทียบกับเงินทุนและความเสี่ยง
5. เหมาะกับบริบทของนักลงทุนไทย (คำนึงถึงภาษี, ค่าธรรมเนียม, สภาพคล่อง)

กฎ:
- หากพิจารณาแล้วว่าผลตอบแทนที่คาดหวัง **เป็นไปได้**: ให้จัดพอร์ตตามเป้าหมายนั้น
- หากพิจารณาแล้วว่าผลตอบแทนที่คาดหวัง **เป็นไปได้ยากหรือเสี่ยงเกินไป**: ให้จัดพอร์ตที่ให้ผลตอบแทน "ใกล้เคียงที่สุดบนความเสี่ยงที่รับได้" และต้องให้คำแนะนำในกล่อง summary หรือ warnings เพิ่มเติมว่าควรปรับสิ่งใด (เช่น เพิ่มเงินลงทุน, ลดความคาดหวัง, หรือรับความเสี่ยงเพิ่ม)
- แนะนำ 4-6 สินทรัพย์ที่หลากหลาย (ทั้งไทยและต่างประเทศ)
- allocation รวมกันต้องได้ 100%
- ระบุ market เป็น "TH", "US", หรือ "Global"
- ให้เหตุผลสั้นๆ ว่าทำไมถึงเลือกแต่ละตัว
- ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น`,

  emergency: `คุณเป็นที่ปรึกษาการลงทุนมืออาชีพที่เชี่ยวชาญตลาดไทยและต่างประเทศ
หน้าที่ของคุณคือแนะนำพอร์ตลงทุนสำหรับเงินสำรองฉุกเฉินที่:
1. สภาพคล่องสูง — ขายได้ทันทีเมื่อต้องการเงิน
2. ปลอดภัยกับเงินต้นสูงสุด — โอกาสขาดทุนต่ำมาก
3. ยังคงให้ผลตอบแทนที่ดีกว่าฝากออมทรัพย์
4. กระจายทั้งสินทรัพย์ไทยและต่างประเทศที่เข้าถึงง่าย
5. เน้นกองทุนตลาดเงิน, กองทุนตราสารหนี้ระยะสั้น, หุ้นปันผลสูงที่มั่นคง

กฎ:
- แนะนำ 3-5 สินทรัพย์
- อย่างน้อย 50% ต้องเป็นสินทรัพย์สภาพคล่องสูง (money market, short-term bond)
- allocation รวมกันต้องได้ 100%
- ระบุ market เป็น "TH" สำหรับสินทรัพย์ไทย, "US" สำหรับสินทรัพย์อเมริกา, "Global" สำหรับสินทรัพย์ทั่วโลก
- ให้เหตุผลสั้นๆ ว่าทำไมถึงเลือกแต่ละตัว
    - ให้เหตุผลสั้นๆ ว่าทำไมถึงเลือกแต่ละตัว
    - ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น`,
  
    overall: `คุณเป็นผู้เชี่ยวชาญการจัดพอร์ตการลงทุนที่เก่งที่สุด
  หน้าที่ของคุณคือวิเคราะห์ข้อมูลเงินทุนและสถานการณ์ของผู้ใช้ แล้วแนะนำ "พอร์ตการลงทุนที่ดีที่สุด" ที่สามารถทำได้จริงในสถานการณ์ปัจจุบัน
  1. ให้ผลตอบแทนคุ้มค่าที่สุด โดยอิงจากสภาวะตลาดปัจจุบัน (เช่น ดอกเบี้ยโลก ทิศทางเศรษฐกิจ)
  2. สอดคล้องกับเงินทุนของผู้ใช้และระดับความเสี่ยงที่ระบุ
  3. ผสมผสานสินทรัพย์หลายประเภทเพื่อผลตอบแทนรวมที่ดีที่สุด
  
  กฎ:
  - แนะนำ 4-6 สินทรัพย์
  - allocation รวมกันต้องได้ 100%
  - ระบุ market เป็น "TH", "US", หรือ "Global"
  - ให้เหตุผลที่เฉียบขาดว่าทำไมถึงเลือกตัวนี้ในสถานการณ์นี้
  - ตอบเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น`,

    wealth_plan: `คุณเป็นที่ปรึกษาการลงทุนระดับโลก (Global Wealth Advisor) ที่เชี่ยวชาญการจัดพอร์ตแบบผสมผสาน
หน้าที่ของคุณคือวิเคราะห์ข้อมูลตั้งต้นของผู้ใช้ (ซึ่งอาจมีเพียงบางส่วน เช่น มีแค่เป้าหมายเงินสำรอง หรือ มีแค่อัตราเงินเฟ้อ หรือมีครบทั้งหมด) และจัดพอร์ตที่เหมาะสมที่สุดในปัจจุบัน
1. หากผู้ใช้เน้น "เงินสำรองฉุกเฉิน (Emergency)" หรือไม่มีเงินส่วนเกินเหลือสำหรับลงทุน: ให้เน้นสภาพคล่องสูงและความเสี่ยงต่ำ
2. หากผู้ใช้เน้น "ชนะเงินเฟ้อ (Inflation)" หรือมีเงินส่วนเกินที่พร้อมลงทุน: ให้เน้นหุ้นปันผล, กองทุนรวม, REITs, ETF ที่ผลตอบแทนคาดหวังสูงกว่าเงินเฟ้อ
3. แนะนำสินทรัพย์ได้จากทั่วโลก (Global Assets) เช่น ตลาด US, ตลาด TH หรือกองทุน Global
4. ระบบจะมีการหักค่าธรรมเนียมแพลตฟอร์มในภายหลัง (หุ้นไทย 0.17%, ต่างประเทศ 0.65%, กองทุน 1%) ดังนั้นเลือกสินทรัพย์ที่ผลตอบแทนคุ้มค่ากับค่าธรรมเนียม

กฎ:
- วิเคราะห์จากข้อมูลที่มีให้ หากไม่มีข้อมูลเหตุการณ์วิกฤต ไม่ต้องอ้างอิงถึงการเตรียมพร้อมรับวิกฤต
- หากผู้ใช้มีเงินเก็บทั้งหมด (Current Capital) ให้คำนึงถึงสัดส่วนเงินสำรองและเงินลงทุนส่วนเกินตามที่ได้รับ
- หากไม่มีข้อมูลส่วนไหน ให้ถือว่าผู้ใช้ยอมรับความเสี่ยงระดับกลาง (Medium Risk) เป็นค่าเริ่มต้น
- แนะนำ 4-6 สินทรัพย์ (ผสมผสานสภาพคล่องและผลตอบแทนตามบริบท)
- allocation รวมกันต้องได้ 100%
- ระบุ market เป็น "TH", "US", หรือ "Global"
- ให้เหตุผลสั้นๆ ว่าทำไมถึงเลือกแต่ละตัว และตอบโจทย์ข้อมูลที่ผู้ใช้ให้มาอย่างไร
- ตอบเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น ห้ามมี markdown หรือข้อความอื่น`
  };
  
  const JSON_SCHEMA = `{
    "summary": "สรุปคำแนะนำภาษาไทยสั้นๆ 2-3 ประโยค",
    "portfolioSuggestions": [
      {
        "name": "ชื่อสินทรัพย์ เช่น KFCASH, PTT, VTI",
        "type": "ประเภท เช่น กองทุนตลาดเงิน, หุ้นปันผล, ETF",
        "allocation": 30,
        "expectedYield": 2.5,
        "riskLevel": "ต่ำ / ปานกลาง / สูง",
        "reason": "เหตุผลสั้นๆ",
        "market": "TH / US / Global"
      }
    ],
    "expectedPortfolioYield": 4.2,
    "riskAssessment": "ต่ำ / ต่ำ-ปานกลาง / ปานกลาง / ปานกลาง-สูง / สูง",
    "warnings": ["คำเตือนสำคัญ"],
    "disclaimer": "ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้น ไม่ใช่คำแนะนำการลงทุนส่วนบุคคล ควรศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจลงทุน"
  }`;
  
  // ─── Route Handler ───────────────────────────────────────────────────
  router.post("/suggest", async (req: Request, res: Response) => {
    try {
      const { goal, context, customPrompt } = req.body as AiSuggestRequest;
  
      if (!goal || !["inflation", "emergency", "overall", "wealth_plan"].includes(goal)) {
        return res.status(400).json({ error: "Invalid goal. Must be 'inflation', 'emergency', 'overall', or 'wealth_plan'." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Build user message with context
    let userMessage = buildUserMessage(goal, context);
    
    // Append custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      userMessage += `\n\n--- ความต้องการเพิ่มเติมจากผู้ใช้ ---\n${customPrompt.trim()}\n\n(หมายเหตุ: กรุณาพยายามตอบโจทย์ตามความต้องการข้างต้นให้ได้ แต่ยังคงยึดหลักให้ผลตอบแทนที่ดีที่สุดในเงินลงทุนที่ผู้ใช้มี และต้องมีความเป็นไปได้จริง หากความต้องการของผู้ใช้เสี่ยงเกินไปหรือไม่สมเหตุสมผล ให้เตือนใน warnings)`;
    }
    const systemPrompt = SYSTEM_PROMPTS[goal];

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nตอบในรูปแบบ JSON ตามโครงสร้างนี้เท่านั้น:\n${JSON_SCHEMA}`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI] OpenAI API error:", response.status, errorText);
      return res.status(502).json({ error: "Failed to get AI response", details: response.status });
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: "Empty response from AI" });
    }

    // Parse and validate the JSON response
    let parsed: AiSuggestResponse;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[AI] Failed to parse response:", content);
      return res.status(502).json({ error: "Invalid JSON from AI" });
    }

    // Validate allocation sums to ~100
    const totalAlloc = parsed.portfolioSuggestions?.reduce((s, p) => s + p.allocation, 0) || 0;
    if (totalAlloc < 95 || totalAlloc > 105) {
      console.warn(`[AI] Allocation sum is ${totalAlloc}%, adjusting...`);
      // Normalize allocations
      if (parsed.portfolioSuggestions && totalAlloc > 0) {
        parsed.portfolioSuggestions = parsed.portfolioSuggestions.map(p => ({
          ...p,
          allocation: Math.round((p.allocation / totalAlloc) * 100),
        }));
      }
    }

    res.json(parsed);
  } catch (error) {
    console.error("[AI] suggest error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Build User Message ──────────────────────────────────────────────
function buildUserMessage(goal: string, context: AiSuggestRequest["context"]): string {
  if (goal === "wealth_plan") {
    const hasEmergency = context.emergencyFund && context.emergencyFund > 0;
    const hasInvestment = context.investmentAmount && context.investmentAmount > 0;

    return `ช่วยจัดพอร์ตการลงทุนแบบผสมผสาน (Global Asset Allocation) ให้ฉันหน่อย โดยพิจารณาจากข้อมูลที่ฉันมีดังนี้:
${context.currentSavings !== undefined ? `- เงินเก็บทั้งหมดที่มี (Current Capital): ฿${context.currentSavings.toLocaleString()}` : ''}
${hasEmergency ? `- เป้าหมายเงินสำรองฉุกเฉิน (Reserve): ฿${context.emergencyFund?.toLocaleString()}` : ''}
${context.currentSavings !== undefined && hasEmergency ? `- เงินส่วนเกินที่พร้อมลงทุน (Investment Amount): ฿${(context.investmentAmount || 0).toLocaleString()}` : ''}
${context.scenarioType ? `- กังวลวิกฤต (Stress Test): ${context.scenarioType} (ความรุนแรง: ${context.severity || 'ไม่ระบุ'})` : ''}
${context.inflationRate ? `- คาดการณ์เงินเฟ้อ (Inflation): ${context.inflationRate}% ต่อปี` : ''}
${context.monthlySalary ? `- รายได้ปัจจุบัน: ฿${context.monthlySalary.toLocaleString()}/เดือน` : ''}
${context.monthlyExpense ? `- รายจ่ายรวม: ฿${context.monthlyExpense.toLocaleString()}/เดือน` : ''}
- ความเสี่ยงที่รับได้: ${context.riskTolerance || "medium"}

เป้าหมาย:
วิเคราะห์ปัจจัยด้านบนแล้วให้คำแนะนำสัดส่วนพอร์ตที่ดีที่สุด ${
  hasEmergency && hasInvestment 
    ? 'โดยจัดสรรเงินเพื่อสภาพคล่องสำหรับเงินสำรองฉุกเฉินควบคู่กับการลงทุนส่วนเกินเพื่อ "เอาชนะเงินเฟ้อ"' 
    : hasEmergency
    ? 'โดยเน้นปกป้องเงินต้นและเน้นสภาพคล่องสูงเพื่อเงินสำรองฉุกเฉินเป็นหลัก'
    : 'โดยเน้นนำเงินที่มีไปลงทุนเพื่อ "เอาชนะเงินเฟ้อ" ให้ผลตอบแทนดีที่สุด'
} 
พร้อมแสดงความคุ้มค่าหลังหักค่าธรรมเนียมแพลตฟอร์ม (คุณอาจไม่ได้รับข้อมูลครบทุกส่วน ให้ปรับคำแนะนำตามข้อมูลที่มีอยู่)`;
  }

  if (goal === "overall") {
    return `ช่วยแนะนำพอร์ตลงทุนที่ดีที่สุดในสถานการณ์ตลาดปัจจุบันให้ฉันหน่อย โดยมีข้อมูลเงินทุนและความเสี่ยงดังนี้:
- เงินลงทุนตั้งต้นทั้งหมด (Current Capital): ฿${(context.investmentAmount || 500000).toLocaleString()}
- ความเสี่ยงที่รับได้: ${context.riskTolerance || "medium"}

เป้าหมาย: ขอให้คุณจัดพอร์ตแบบผสมผสาน (Asset Allocation) จากสถานการณ์ปัจจุบัน (เศรษฐกิจโลก, ดอกเบี้ย, แนวโน้มตลาด) เพื่อให้ได้ "ผลตอบแทนที่ดีที่สุดที่ทำได้จริงบนความเสี่ยงที่รับได้" แนะนำทั้งสินทรัพย์ไทยและต่างประเทศที่คุ้มค่า`;
  }

  if (goal === "inflation") {
    return `ช่วยแนะนำพอร์ตลงทุนให้ฉันหน่อย โดยมีข้อมูลดังนี้:
- อาชีพปัจจุบัน: ${context.profession || "ไม่ระบุ"}
- เงินลงทุนตั้งต้น: ฿${(context.investmentAmount || 500000).toLocaleString()}
- ระยะเวลาลงทุน: ${context.timeline || 10} ปี
- เงินเดือนปัจจุบัน: ฿${(context.monthlySalary || 40000).toLocaleString()}/เดือน
- ค่าใช้จ่ายรายเดือน: ฿${(context.monthlyExpense || 25000).toLocaleString()}/เดือน
- อัตราเงินเฟ้อ: ${context.inflationRate || 3}% ต่อปี
- ความเสี่ยงที่รับได้: ${context.riskTolerance || "medium"}
- ผลตอบแทนที่คาดหวัง: ${context.expectedYieldTarget || 5}% ต่อปี

เป้าหมาย: ต้องการพอร์ตที่ให้ผลตอบแทนชนะเงินเฟ้อ ปลอดภัยกับเงินต้น แนะนำทั้งสินทรัพย์ไทยและต่างประเทศที่คุ้มค่าและได้กำไรดี โดยให้วิเคราะห์ความเสี่ยงและเสถียรภาพรายได้ที่เหมาะสมกับอาชีพของฉันด้วย รวมถึงพิจารณาความเป็นไปได้ของ "ผลตอบแทนที่คาดหวัง" ที่ระบุไว้`;
  }

  return `ช่วยแนะนำพอร์ตลงทุนสำหรับเงินสำรองฉุกเฉินให้ฉันหน่อย โดยมีข้อมูลดังนี้:
- เงินสำรองฉุกเฉินทั้งหมด: ฿${(context.emergencyFund || 100000).toLocaleString()}
- เงินที่พร้อมนำไปลงทุน (ส่วนเกินจากเงินสำรอง): ฿${(context.investmentAmount || 40000).toLocaleString()}
- เงินออมปัจจุบัน: ฿${(context.currentSavings || 200000).toLocaleString()}
- สถานการณ์ที่เตรียมรับมือ: ${context.scenarioType || "ตกงาน"}
- ความเสี่ยงที่รับได้: ${context.riskTolerance || "low"}
- สถานะการรับมือวิกฤต: ${context.isSurviving ? "เงินสำรองเพียงพอรับมือวิกฤต (Surviving)" : "เงินสำรองไม่เพียงพอ ขาดเงินอีก ฿" + (context.shortfall || 0).toLocaleString()}

เป้าหมาย: 
${context.isSurviving 
  ? "เนื่องจากมีเงินสำรองเพียงพอแล้ว ต้องการพอร์ตสภาพคล่องสูง ปลอดภัยกับเงินต้น เพื่อต่อยอดสร้าง Passive Income" 
  : "เนื่องจากเงินสำรองไม่พอ (ขาดอีก ฿" + (context.shortfall || 0).toLocaleString() + ") ต้องการพอร์ตสภาพคล่องสูงที่สร้างกำไรเพิ่มได้พอสมควรเพื่อช่วยอุดรอยรั่ว แต่ต้องอยู่บนพื้นฐานความเป็นจริง ห้ามแนะนำผลตอบแทนเกินจริง หากไม่สามารถทำกำไรชดเชยได้ทั้งหมดให้ให้คำแนะนำเพิ่มเติมว่าควรทำอย่างไร (เช่น ลดรายจ่าย, หางานเสริม)"}
แนะนำทั้งสินทรัพย์ไทยและต่างประเทศที่คุ้มค่า`;
}

export default router;
