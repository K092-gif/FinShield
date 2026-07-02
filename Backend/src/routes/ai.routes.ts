import { Router, Request, Response } from "express";

const router = Router();

// ─── Types ───────────────────────────────────────────────────────────
interface AiSuggestRequest {
  goal: "inflation" | "emergency";
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
    isSurviving?: boolean;
    shortfall?: number;
  };
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
1. ให้ผลตอบแทนชนะเงินเฟ้อ (มากกว่า 3% ต่อปี)
2. ปลอดภัยกับเงินต้น — เน้นหุ้นปันผลที่มั่นคง, กองทุนรวม, REITs, ETF
3. กระจายความเสี่ยงทั้งสินทรัพย์ไทยและต่างประเทศ
4. พิจารณาว่าตัวไหนคุ้มค่ากับเงินลงทุนและได้กำไรที่ดี
5. เหมาะกับบริบทของนักลงทุนไทย (คำนึงถึงภาษี, ค่าธรรมเนียม, สภาพคล่อง)

กฎ:
- แนะนำ 4-6 สินทรัพย์ที่หลากหลาย (ทั้งไทยและต่างประเทศ)
- allocation รวมกันต้องได้ 100%
- ระบุ market เป็น "TH" สำหรับสินทรัพย์ไทย, "US" สำหรับสินทรัพย์อเมริกา, "Global" สำหรับสินทรัพย์ทั่วโลก
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
- ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น`,
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
    const { goal, context } = req.body as AiSuggestRequest;

    if (!goal || !["inflation", "emergency"].includes(goal)) {
      return res.status(400).json({ error: "Invalid goal. Must be 'inflation' or 'emergency'." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Build user message with context
    const userMessage = buildUserMessage(goal, context);
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
  if (goal === "inflation") {
    return `ช่วยแนะนำพอร์ตลงทุนให้ฉันหน่อย โดยมีข้อมูลดังนี้:
- เงินลงทุนตั้งต้น: ฿${(context.investmentAmount || 500000).toLocaleString()}
- ระยะเวลาลงทุน: ${context.timeline || 10} ปี
- เงินเดือนปัจจุบัน: ฿${(context.monthlySalary || 40000).toLocaleString()}/เดือน
- ค่าใช้จ่ายรายเดือน: ฿${(context.monthlyExpense || 25000).toLocaleString()}/เดือน
- อัตราเงินเฟ้อ: ${context.inflationRate || 3}% ต่อปี
- ความเสี่ยงที่รับได้: ${context.riskTolerance || "medium"}

เป้าหมาย: ต้องการพอร์ตที่ให้ผลตอบแทนชนะเงินเฟ้อ ปลอดภัยกับเงินต้น แนะนำทั้งสินทรัพย์ไทยและต่างประเทศที่คุ้มค่าและได้กำไรดี`;
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
