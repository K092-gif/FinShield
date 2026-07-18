/**
 * Tavily AI Search Service
 * ค้นหาข้อมูลเรียลไทม์จากอินเทอร์เน็ตผ่าน Tavily AI
 */
import { tavily } from "@tavily/core";

// ─── Types ───────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  content: string; // snippet
}

export interface SearchResponse {
  answer?: string; // Tavily's built-in answer summary
  results: SearchResult[];
  query: string;
}

// ─── Service ─────────────────────────────────────────────────────────

const getClient = () => {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("SEARCH_API_KEY not configured in .env");
  }
  return tavily({ apiKey });
};

/**
 * ค้นหาข้อมูลจากอินเทอร์เน็ตผ่าน Tavily AI
 * @param query - คำค้นหา (ควรผ่าน Query Rewriting ก่อน)
 * @param maxResults - จำนวนผลลัพธ์สูงสุด (default: 3)
 */
export async function searchWeb(
  query: string,
  maxResults: number = 3
): Promise<SearchResponse> {
  try {
    const client = getClient();

    const response = await client.search(query, {
      maxResults,
      searchDepth: "basic",
      includeAnswer: true,
      includeRawContent: false,
    });

    const results: SearchResult[] = (response.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }));

    return {
      answer: response.answer || undefined,
      results,
      query,
    };
  } catch (error: any) {
    console.error("[Tavily] Search error:", error.message);
    // Return empty results instead of crashing the whole system
    return {
      results: [],
      query,
    };
  }
}

/**
 * จัดรูปแบบผลลัพธ์ Tavily เป็น Context string สำหรับ GPT
 */
export function formatSearchContext(searchResponse: SearchResponse): string {
  if (!searchResponse.results.length) return "";

  let context = "\n\n--- ข้อมูลจากอินเทอร์เน็ต (อ้างอิงเรียลไทม์) ---\n";

  if (searchResponse.answer) {
    context += `สรุปจากการค้นหา: ${searchResponse.answer}\n\n`;
  }

  searchResponse.results.forEach((r, i) => {
    context += `${i + 1}. [${r.title}]\n   URL: ${r.url}\n   เนื้อหา: ${r.content}\n\n`;
  });

  context += `คำแนะนำ: ให้ตอบโดยอิงจากข้อมูลข้างต้น ห้ามแต่งขึ้นเอง หากมีแหล่งอ้างอิง ให้ระบุชื่อเว็บไซต์ท้ายคำตอบสั้นๆ`;

  return context;
}
