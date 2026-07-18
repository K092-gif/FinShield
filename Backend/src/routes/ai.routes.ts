import { Router, Request, Response } from "express";
import { searchWeb, formatSearchContext, SearchResponse } from "../services/tavily.service";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middlewares/auth.middleware";

const router = Router();
const prisma = new PrismaClient();

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
  chat: `คุณคือ "เพื่อนรู้งาน" (FinShield AI Chat Assistant) ผู้ช่วยส่วนตัวที่รอบรู้ ทั้งด้านการเงินและไลฟ์สไตล์การใช้ชีวิต
หน้าที่หลักของคุณคือให้คำปรึกษา แนะนำ และวิเคราะห์ปัญหาการเงินของผู้ใช้อย่างละเอียด โดยอิงจาก "ข้อมูลการเงินปัจจุบัน"
นอกจากนี้ คุณมีความรู้รอบตัวกว้างขวางเกี่ยวกับสถานที่ต่างๆ ทั่วโลก (เช่น สนามกีฬา ร้านอาหาร แหล่งท่องเที่ยว บริษัทประกัน กองทุน) คุณต้องสามารถให้คำแนะนำสิ่งเหล่านี้ได้ทันทีโดยใช้ความรู้พื้นฐานที่คุณมี

ข้อกำหนดในการตอบ (สำคัญมาก):
1. ตอบกลับเป็นภาษาไทยที่อ่านง่าย เป็นกันเอง (เหมือนคุยกับเพื่อนสนิท)
2. **ห้ามปฏิเสธและห้ามไล่ผู้ใช้ไปหาใน Google เด็ดขาด:** หากผู้ใช้ถามหาร้านอาหาร สถานที่ (เช่น สนามเทนนิส, คาเฟ่) หรือกิจกรรมต่างๆ ให้คุณดึงข้อมูลจากความรู้ที่คุณมีมาตอบ **อย่างน้อย 3 แห่งเสมอ** พร้อมอธิบายจุดเด่นสั้นๆ ห้ามบอกว่า "ไม่สามารถค้นหาข้อมูลได้" หรือ "เป็นแค่ผู้ช่วยด้านการเงิน" ให้ตอบอย่างมั่นใจในฐานะเพื่อนที่เชี่ยวชาญ
3. วิเคราะห์เชิงลึก: หากพูดถึง "หนี้สิน" ต้องแนะนำอย่างละเอียด เช่น การรีไฟแนนซ์ (Refinance), การรวมหนี้, การเจรจาลดดอกเบี้ย, หรือกลยุทธ์ Snowball/Avalanche แบบเป็นขั้นเป็นตอน
4. วิเคราะห์เชิงลึก: หากพูดถึง "รายจ่าย" หรือ "สุขภาพการเงิน" ให้แนะนำละเอียดว่าควรจัดสรรเงินอย่างไร (เช่น กฎ 50/30/20) และบอกให้ชัดเจนว่าควรบริหารรายจ่ายส่วนไหนบ้าง
5. ใช้ตัวเลขข้อมูลของผู้ใช้ (เงินเก็บ, หนี้สิน, รายได้, รายจ่าย) มาอ้างอิงประกอบการคำนวณและแนะนำเสมอ เมื่อคุยเรื่องการเงิน
6. หากข้อมูลผู้ใช้มีหนี้ (debt > 0) และผู้ใช้ถามว่าสุขภาพการเงินเป็นอย่างไร ให้ทักเรื่องหนี้และเสนอทางแก้อย่างเป็นรูปธรรม
7. การจัดรูปแบบ: ห้ามใช้เครื่องหมาย Markdown เช่น *, # หรือสัญลักษณ์พิเศษใดๆ ในข้อความเด็ดขาด เพื่อให้บทสนทนาดูเป็นธรรมชาติเหมือนมนุษย์คุยกัน (ใช้การเว้นบรรทัดหรือขีด - ธรรมดาแทนได้)
8. หากมีข้อมูลจากอินเทอร์เน็ตแนบมาในบริบท (Context) ให้ใช้ข้อมูลนั้นเป็นหลักในการตอบ ห้ามแต่งขึ้นมาเอง และอ้างอิงแหล่งที่มาสั้นๆ ท้ายคำตอบ
9. **ห้ามสร้างลิ้งก์ปลอม หรือ URL แบบย่อ (เช่น goo.gl, bit.ly) เด็ดขาด** หากต้องการให้แผนที่สถานที่ ให้ใช้รูปแบบลิ้งก์ค้นหาของ Google Maps ที่แน่นอนเท่านั้น คือ "https://www.google.com/maps/search/?api=1&query=ชื่อสถานที่(แทนที่ช่องว่างด้วยเครื่องหมายบวก)" ตัวอย่างเช่น "https://www.google.com/maps/search/?api=1&query=The+Address+Sathorn" ห้ามเดาลิ้งก์เองเด็ดขาด
10. ห้ามตอบเป็น JSON`,

  diary_cheer: `คุณคือ "เพื่อนรู้งาน" (FinShield AI Chat Assistant) 
ผู้ใช้กำลังเขียน "ไดอารี่เกษียณ" เพื่อบันทึกความฝัน เป้าหมาย หรือความก้าวหน้าในการปลดหนี้และการออมเงิน
หน้าที่ของคุณคือ: อ่านสิ่งที่ผู้ใช้พิมพ์ และตอบกลับสั้นๆ (1-3 ประโยค) เพื่อให้กำลังใจ ชื่นชม หรือให้แง่คิดดีๆ เกี่ยวกับความพยายามของพวกเขา
หากมีข้อมูลจากอินเทอร์เน็ตแนบมาในบริบท (Context) ให้นำข้อมูลนั้นมาช่วยแนะนำอย่างเป็นรูปธรรม (เช่น ชื่อสถานที่ ลิงก์อ้างอิง) แทนที่จะให้กำลังใจอย่างเดียว
ห้ามยาวเกินไป ห้ามใช้เครื่องหมาย Markdown ให้คุยเหมือนเพื่อนที่คอยเชียร์อยู่ข้างๆ`,

  inflation: `คุณคือผู้เชี่ยวชาญด้านที่ปรึกษาการเงินการลงทุน (Certified Investment Advisor) ที่มีประสบการณ์กว่า 20 ปีในตลาดทุนไทยและต่างประเทศ
คุณเชี่ยวชาญการวิเคราะห์หุ้น กองทุนรวม ETF REITs และสินทรัพย์ทางการเงินอื่นๆ อย่างลึกซึ้ง โดยอิงจากข้อมูลผลตอบแทนย้อนหลัง แนวโน้มเศรษฐกิจ และความเสี่ยงของแต่ละสินทรัพย์
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
- ให้เหตุผลเชิงวิชาการและข้อมูลที่เป็นประโยชน์สำหรับแต่ละสินทรัพย์
- ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น`,

  emergency: `คุณคือผู้เชี่ยวชาญด้านที่ปรึกษาการเงินการลงทุน (Certified Investment Advisor) ที่มีความเชี่ยวชาญเฉพาะด้านการบริหารสภาพคล่องและการออมเงินสำรองฉุกเฉิน
คุณเข้าใจหลักการจัดการความเสี่ยงทางการเงินส่วนบุคคลอย่างลึกซึ้ง และสามารถแนะนำสินทรัพย์ที่เหมาะสมกับแต่ละสถานการณ์ได้อย่างแม่นยำ
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
- ให้เหตุผลเชิงวิชาการและข้อมูลที่เป็นประโยชน์สำหรับแต่ละสินทรัพย์
- ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น`,
  
    overall: `คุณคือผู้เชี่ยวชาญด้านที่ปรึกษาการเงินการลงทุน (Certified Financial Planner) ระดับสากล ที่มีความสามารถในการวิเคราะห์ตลาดทุนทั่วโลกและออกแบบพอร์ตการลงทุนที่เหมาะสมกับแต่ละบุคคล
คุณมีความเข้าใจอย่างลึกซึ้งเกี่ยวกับ Asset Allocation, Modern Portfolio Theory, และแนวโน้มเศรษฐกิจมหภาค
หน้าที่ของคุณคือวิเคราะห์ข้อมูลเงินทุนและสถานการณ์ของผู้ใช้ แล้วแนะนำ "พอร์ตการลงทุนที่ดีที่สุด" ที่สามารถทำได้จริงในสถานการณ์ปัจจุบัน
1. ให้ผลตอบแทนคุ้มค่าที่สุด โดยอิงจากสภาวะตลาดปัจจุบัน (เช่น ดอกเบี้ยโลก ทิศทางเศรษฐกิจ)
2. สอดคล้องกับเงินทุนของผู้ใช้และระดับความเสี่ยงที่ระบุ
3. ผสมผสานสินทรัพย์หลายประเภทเพื่อผลตอบแทนรวมที่ดีที่สุด

กฎ:
- แนะนำ 4-6 สินทรัพย์
- allocation รวมกันต้องได้ 100%
- ระบุ market เป็น "TH", "US", หรือ "Global"
- ให้เหตุผลเชิงวิชาการและข้อมูลที่เป็นประโยชน์สำหรับแต่ละสินทรัพย์
- ตอบเป็น JSON ตามรูปแบบที่กำหนดเท่านั้น`,

    wealth_plan: `คุณคือผู้เชี่ยวชาญด้านที่ปรึกษาการเงินการลงทุน (Global Wealth Advisor & Certified Financial Planner) ที่มีประสบการณ์สูงในการวางแผนการเงินระยะยาวและการจัดพอร์ตการลงทุนแบบผสมผสานสำหรับบุคคลที่มีเป้าหมายทางการเงินที่หลากหลาย
คุณเข้าใจทั้งจิตวิทยาการลงทุน (Behavioral Finance) และคณิตศาสตร์การเงิน (Financial Mathematics) เพื่อออกแบบพอร์ตที่ตอบโจทย์ทั้งระยะสั้นและระยะยาว
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
- ให้เหตุผลเชิงวิชาการและข้อมูลที่เป็นประโยชน์สำหรับแต่ละสินทรัพย์ โดยอิงจากข้อมูลตลาดจริง
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
        "reason": "เหตุผลที่เลือกสินทรัพย์ตัวนี้ ต้องละเอียดและอ้างอิงข้อมูลจริง เช่น ผลตอบแทนย้อนหลัง ปันผลล่าสุด แนวโน้มอุตสาหกรรม จุดแข็งของกองทุนหรือบริษัท (2-4 ประโยค)",
        "market": "TH / US / Global"
      }
    ],
    "expectedPortfolioYield": 4.2,
    "riskAssessment": "ต่ำ / ต่ำ-ปานกลาง / ปานกลาง / ปานกลาง-สูง / สูง",
    "warnings": ["คำเตือนสำคัญ"],
    "disclaimer": "ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้น ไม่ใช่คำแนะนำการลงทุนส่วนบุคคล ควรศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจลงทุน"
  }`;

// ─── RAG Helper: Classify if search is needed ───────────────────────
async function classifyNeedsSearch(
  userMessage: string,
  chatHistory: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<{ needsSearch: boolean; searchQuery: string }> {
  try {
    const recentContext = chatHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `คุณเป็นตัวจัดหมวดหมู่คำถาม (Query Classifier)
วิเคราะห์คำถามล่าสุดของผู้ใช้ พร้อมบริบทบทสนทนาก่อนหน้า แล้วตัดสินว่าต้องค้นหาข้อมูลจากอินเทอร์เน็ตหรือไม่

ต้องค้นหา (needsSearch = true):
- ถามหาสถานที่จริง, ร้านอาหาร, สนามกีฬา, โรงพยาบาล
- ถามหาราคาหุ้น/กองทุน/คริปโตแบบเรียลไทม์
- ถามข่าวสาร, เหตุการณ์ปัจจุบัน
- ถามหาบริษัทประกัน, โบรกเกอร์, ผลิตภัณฑ์ทางการเงินเฉพาะ
- ถามเปรียบเทียบบริการ/สินค้าจริง

ไม่ต้องค้นหา (needsSearch = false):
- ถามเรื่องการเงินส่วนตัว (ประเมินสุขภาพการเงิน, วางแผนหนี้)
- คำถามทั่วไปที่ AI มีความรู้อยู่แล้ว (เช่น กฎ 50/30/20 คืออะไร)
- ถามเรื่องอารมณ์, ขอกำลังใจ, คุยเรื่องทั่วไป
- ทักทาย, ขอบคุณ

ตอบเป็น JSON เท่านั้น: {"needsSearch": true/false, "searchQuery": "คำค้นหาที่เหมาะสม (ภาษาไทยหรืออังกฤษ)"}
หาก needsSearch = false ให้ searchQuery เป็น ""
หาก needsSearch = true ให้ rewrite คำค้นหาให้ชัดเจน (Query Rewriting) โดยอิงจากบริบทบทสนทนา`,
          },
          {
            role: "user",
            content: `บริบทบทสนทนาก่อนหน้า:\n${recentContext}\n\nคำถามล่าสุด: ${userMessage}`,
          },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[RAG Classify] API error:", response.status);
      return { needsSearch: false, searchQuery: "" };
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");

    return {
      needsSearch: parsed.needsSearch === true,
      searchQuery: parsed.searchQuery || "",
    };
  } catch (error: any) {
    console.error("[RAG Classify] Error:", error.message);
    return { needsSearch: false, searchQuery: "" };
  }
}

// ─── RAG Helper: Truncate chat history to fit token limit ────────────
function truncateHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 20,
  maxChars: number = 6000
): Array<{ role: string; content: string }> {
  // Keep at most maxMessages
  let truncated = messages.slice(-maxMessages);

  // Estimate tokens (Thai text ≈ 2-3 tokens per char)
  let totalChars = truncated.reduce((sum, m) => sum + m.content.length, 0);
  while (totalChars > maxChars && truncated.length > 2) {
    truncated = truncated.slice(1); // Remove oldest
    totalChars = truncated.reduce((sum, m) => sum + m.content.length, 0);
  }

  return truncated;
}

// ─── Route Handler: Suggest (with RAG search) ───────────────────────
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

    // ── RAG: Search for current market data to enrich AI reasoning ──
    let searchContext = "";
    try {
      const searchQuery = buildSuggestSearchQuery(goal, context, customPrompt);
      console.log("[AI Suggest RAG] Searching:", searchQuery);
      const searchResponse = await searchWeb(searchQuery, 5);
      if (searchResponse.results.length > 0) {
        searchContext = "\n\n--- ข้อมูลตลาดเรียลไทม์จากอินเทอร์เน็ต (ใช้อ้างอิงในเหตุผลของแต่ละสินทรัพย์) ---\n";
        if (searchResponse.answer) {
          searchContext += `สรุป: ${searchResponse.answer}\n\n`;
        }
        searchResponse.results.forEach((r, i) => {
          searchContext += `${i + 1}. [${r.title}]\n   เนื้อหา: ${r.content}\n\n`;
        });
        searchContext += `คำแนะนำ: ใช้ข้อมูลข้างต้นเป็นข้อเท็จจริงประกอบในฟิลด์ "reason" ของแต่ละสินทรัพย์ เพื่อให้เหตุผลที่ละเอียด เจาะจง และอิงข้อมูลจริงในปัจจุบัน (เช่น ผลตอบแทนย้อนหลัง แนวโน้มตลาด ข่าวสำคัญ) แทนที่จะให้เหตุผลกว้างๆ ทั่วไป`;
      }
    } catch (searchErr: any) {
      console.warn("[AI Suggest RAG] Search failed (non-blocking):", searchErr.message);
      // Continue without search context — AI will still work with its base knowledge
    }

    // Call OpenAI API with enriched context
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
            content: `${systemPrompt}${searchContext}\n\nตอบในรูปแบบ JSON ตามโครงสร้างนี้เท่านั้น:\n${JSON_SCHEMA}`,
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

// ─── Build search query for RAG in /suggest ──────────────────────────
function buildSuggestSearchQuery(
  goal: string,
  context: AiSuggestRequest["context"],
  customPrompt?: string
): string {
  const year = new Date().getFullYear();
  
  if (customPrompt && customPrompt.trim()) {
    // If user has a custom request, search for that specifically
    return `${customPrompt.trim()} การลงทุน ไทย ${year}`;
  }

  switch (goal) {
    case "inflation":
      return `หุ้นปันผลสูง กองทุนรวม ETF ผลตอบแทนชนะเงินเฟ้อ แนะนำ ${year} ตลาดหุ้นไทย ต่างประเทศ`;
    case "emergency":
      return `กองทุนตลาดเงิน กองทุนตราสารหนี้ระยะสั้น สภาพคล่องสูง ผลตอบแทนดี ${year} ไทย`;
    case "overall":
      return `แนะนำพอร์ตลงทุน asset allocation ${year} หุ้นไทย หุ้นต่างประเทศ กองทุนรวม ETF ผลตอบแทนดีที่สุด`;
    case "wealth_plan":
      const riskLabel = context.riskTolerance === "high" ? "เสี่ยงสูง ผลตอบแทนสูง" 
                       : context.riskTolerance === "low" ? "เสี่ยงต่ำ ปลอดภัย"
                       : "เสี่ยงปานกลาง สมดุล";
      return `พอร์ตลงทุน ${riskLabel} ${year} กองทุนรวม หุ้นปันผล REITs ETF แนะนำ ผลตอบแทนย้อนหลัง`;
    default:
      return `แนะนำการลงทุน พอร์ตลงทุน ${year} ไทย`;
  }
}

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

// ─── Chat Endpoint (RAG Pipeline) ───────────────────────────────────
router.post("/chat", async (req: Request, res: Response): Promise<any> => {
  try {
    const { messages, context, type, firebaseUid, sessionId } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages array" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Build context string to inject into system prompt
    let contextStr = "ข้อมูลการเงินปัจจุบันของผู้ใช้ (อ้างอิงจากระบบ):\n";
    if (context) {
      contextStr += `- เงินเก็บ/สินทรัพย์ทั้งหมด: ฿${(context.currentCapital || 0).toLocaleString()}\n`;
      contextStr += `- รายได้ต่อเดือน: ฿${(context.monthlyIncome || 0).toLocaleString()}\n`;
      contextStr += `- รายจ่ายต่อเดือน: ฿${(context.monthlyExpense || 0).toLocaleString()}\n`;
      contextStr += `- หนี้สินต่อเดือน: ฿${(context.debt || 0).toLocaleString()}\n`;
      contextStr += `- เงินออมเพื่อลงทุน/เดือน: ฿${(context.monthlySavings || 0).toLocaleString()}\n`;
      contextStr += `- เป้าหมายเงินสำรอง: ฿${(context.emergencyFund || 0).toLocaleString()}\n`;
    } else {
      contextStr += "- ไม่มีข้อมูลการเงินที่ระบุ\n";
    }

    // ── Step 1: Truncate history ──
    const truncatedMessages = truncateHistory(messages);
    const lastUserMessage = truncatedMessages.filter(m => m.role === "user").pop()?.content || "";

    // ── Step 2: Classify & Search (RAG) ──
    let searchContext = "";
    let sources: Array<{ title: string; url: string }> = [];

    const classification = await classifyNeedsSearch(lastUserMessage, truncatedMessages, apiKey);
    console.log("[RAG] Classification:", classification);

    if (classification.needsSearch && classification.searchQuery) {
      console.log("[RAG] Searching Tavily for:", classification.searchQuery);
      const searchResults: SearchResponse = await searchWeb(classification.searchQuery, 3);
      
      if (searchResults.results.length > 0) {
        searchContext = formatSearchContext(searchResults);
        sources = searchResults.results.map(r => ({ title: r.title, url: r.url }));
        console.log("[RAG] Found", sources.length, "sources");
      }
    }

    // ── Step 3: Build system prompt with context ──
    const basePrompt = type === "diary_cheer" ? SYSTEM_PROMPTS.diary_cheer : SYSTEM_PROMPTS.chat;
    const systemPrompt = basePrompt + "\n\n" + contextStr + searchContext;

    // ── Step 4: Call OpenAI with RAG context ──
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...truncatedMessages
        ],
        temperature: classification.needsSearch ? 0.4 : 0.7, // Lower temp when using search context
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Chat] OpenAI API error:", response.status, errorText);
      return res.status(502).json({ error: "Failed to get AI response", details: response.status });
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // ── Step 5: Save to DB if user is authenticated ──
    if (firebaseUid && sessionId) {
      try {
        // Save user message
        await prisma.chatMessage.create({
          data: {
            sessionId,
            firebaseUid,
            role: "user",
            content: lastUserMessage,
          },
        });
        // Save AI reply
        await prisma.chatMessage.create({
          data: {
            sessionId,
            firebaseUid,
            role: "assistant",
            content: content || "",
            sources: sources.length > 0 ? sources : undefined,
          },
        });
      } catch (dbError: any) {
        console.error("[AI Chat] DB save error (non-blocking):", dbError.message);
        // Don't fail the response if DB save fails
      }
    }

    res.json({ 
      reply: content, 
      sources: sources.length > 0 ? sources : undefined 
    });
  } catch (error) {
    console.error("[AI Chat] error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Chat History Endpoints ──────────────────────────────────────────

// GET /ai/chat/history?sessionId=yyy  (requires auth token)
router.get("/chat/history", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const firebaseUid = req.firebaseUid; // from verified token — cannot be spoofed
    const { sessionId } = req.query;

    if (!firebaseUid || !sessionId) {
      return res.status(400).json({ error: "Missing sessionId or auth token" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        firebaseUid,
        sessionId: sessionId as string,
      },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        content: true,
        sources: true,
        createdAt: true,
      },
    });

    res.json({ messages });
  } catch (error) {
    console.error("[Chat History] error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /ai/chat/sessions  (requires auth token)
router.get("/chat/sessions", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const firebaseUid = req.firebaseUid; // from verified token — cannot be spoofed

    if (!firebaseUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get unique session IDs with latest message
    const sessions = await prisma.chatMessage.findMany({
      where: { firebaseUid },
      distinct: ["sessionId"],
      orderBy: { createdAt: "desc" },
      select: {
        sessionId: true,
        createdAt: true,
        content: true,
      },
      take: 20,
    });

    res.json({ sessions });
  } catch (error) {
    console.error("[Chat Sessions] error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
