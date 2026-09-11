# FinShield System Architecture & File Summary
> **เอกสารสรุปโครงสร้างไฟล์และการออกแบบระบบ (System Design Summary)**  
> จัดทำขึ้นเพื่อใช้เป็นข้อมูลอ้างอิงในการจัดทำ **รายงานโครงงานบทที่ 4: การออกแบบระบบ (System Design)** และ **บทที่ 5: การพัฒนาและการทดสอบระบบ (System Implementation and Testing)**  
> *สถานะระบบ: ฟีเจอร์ล่าสุดครบวงจร (Full Features, 14 Database Models, API Cache Layer & System Integration)*

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)

FinShield ถูกออกแบบตามสถาปัตยกรรมแบบ **Modern Multi-Layered Client-Server & Micro-service Oriented Integration**:
- **Frontend (Web Application)**: พัฒนาด้วย Next.js 14 (App Router), React 18, TypeScript และ Tailwind CSS รองรับ Responsive Web (Desktop, Tablet, Mobile) และระบบสลับ Dark/Light Mode
- **Client-side Caching Layer**: มีโมดูล `apiCache.ts` จัดเก็บ Master Data (Bank Tiers, Insurance Plans, Inflation Rate, Assets List) ทั้งใน In-Memory และ `localStorage` เพื่อลดภาระ Network Request ซ้ำซ้อนขณะสลับหน้าจอ
- **Backend (API & Computation Engine)**: พัฒนาด้วย Node.js, Express.js และ TypeScript ทำหน้าที่เป็นศูนย์กลางคำนวณทางการเงิน จัดการ Business Logic, ตรวจสอบความถูกต้องของข้อมูล และ Proxy เชื่อมต่อ AI
- **Database & ORM**: ฐานข้อมูลเชิงสัมพันธ์ PostgreSQL (ผ่าน Supabase) บริหารจัดการโครงสร้างผ่าน Prisma ORM ครอบคลุม **14 โมเดล (14 Models)** พร้อมระบบ Auto-seeding ข้อมูลตั้งต้นเมื่อเริ่มต้นเซิร์ฟเวอร์ และมี Singleton Prisma Client (`prisma.ts`)
- **Authentication & Security**: ระบบยืนยันตัวตนด้วย Firebase Authentication (Email/Password & Google OAuth) และเชื่อมต่อ Backend ด้วย JWT Token Verification ผ่าน `auth.middleware.ts`
- **AI & RAG Pipeline**: ใช้ OpenAI API (`gpt-4o-mini`) ผสานกับ **Tavily Search API** ทำหน้าที่สืบค้นข้อมูลตลาดการเงินและข่าวสารปัจจุบันแบบ Real-time (Retrieval-Augmented Generation)
- **Financial Market Data**: เชื่อมต่อ Yahoo Finance API สำหรับดึงราคาหลักทรัพย์แบบ Real-time, ปฏิทินเงินปันผล, คำนวณกำไรขาดทุนพอร์ต (P&L) และเชื่อมต่อ TradingView API สำหรับอัตราเงินเฟ้อไทย (YoY)

---

## 2. แผนผังโครงสร้างไฟล์ของระบบ (Project File Tree)

### 2.1 โครงสร้างฝั่งเซิร์ฟเวอร์ (Backend)
```text
Backend/
├── prisma/
│   ├── schema.prisma                          ✨ โครงสร้างฐานข้อมูลเชิงสัมพันธ์แบบ Normalized (14 Models)
│   └── seed.ts                                🌱 Script หลักสำหรับ Seed ข้อมูลตั้งต้นในฐานข้อมูล
├── src/
│   ├── index.ts                               🚀 จุดเริ่มต้น Express Server, CORS, Route Mounting & Auto-seed
│   ├── prisma.ts                              💎 Shared PrismaClient Singleton Instance ป้องกัน Connection Leak
│   ├── controllers/                           🎮 ตัวควบคุมตรรกะการประมวลผลคำขอ (Request Controllers)
│   │   ├── finance.controller.ts              - จัดการข้อมูลสถานะการเงินผู้ใช้ (Income, Expense, Asset, Debt)
│   │   ├── insurance.controller.ts            - ค้นหาและดึงข้อมูลแผนประกันภัย (ชีวิต, สุขภาพ, รถยนต์)
│   │   └── taxHistory.controller.ts           - บันทึก เรียกดู และลบประวัติการคำนวณภาษีรายปีของผู้ใช้
│   ├── routes/                                🛣️ จุดกำหนด API Endpoints
│   │   ├── simulator.routes.ts                - Endpoints จำลองการเงิน, ตลาดทุน, สินทรัพย์, ธนาคาร และพอร์ต
│   │   ├── finance.routes.ts                  - Endpoints จัดการข้อมูลสุขภาพการเงินของผู้ใช้
│   │   ├── ai.routes.ts                       - Endpoints แนะนำพอร์ต, RAG Chatbot, และประวัติการแชท
│   │   ├── insurance.routes.ts                - Endpoints ดึงแผนประกันภัย
│   │   └── taxHistory.routes.ts               - Endpoints บันทึก/ลบ/เรียกดูประวัติภาษี
│   ├── services/                              ⚙️ ตรรกะการคำนวณและบริการภายนอก (Business & Calculation Services)
│   │   ├── simulationService.ts               - อัลกอริทึมคำนวณเงินเฟ้อ, เงินสำรองฉุกเฉิน, ดอกเบี้ยทบต้น, Stress Test
│   │   ├── databaseService.ts                 - การบันทึกและจัดการพอร์ต/คะแนนไดอารี่ในฐานข้อมูล
│   │   ├── dividendService.ts                 - ดึงข้อมูลและคำนวณปฏิทินเงินปันผลจาก Yahoo Finance
│   │   ├── marketDataService.ts               - ดึงราคาหลักทรัพย์และอัตราแลกเปลี่ยน USD/THB แบบเรียลไทม์
│   │   ├── profitLossService.ts               - คำนวณกำไร-ขาดทุนพอร์ต (P&L) และจำลองการซื้อแบบ DCA
│   │   ├── yahooSearchService.ts              - ระบบค้นหาและดึงข้อมูลสินทรัพย์แบบ Dynamic Caching
│   │   └── tavily.service.ts                  - ระบบค้นหาข้อมูลเว็บแบบเรียลไทม์สำหรับ RAG Architecture
│   ├── middlewares/                           🛡️ มิดเดิลแวร์ตรวจสอบสิทธิ์และความถูกต้อง
│   │   ├── auth.middleware.ts                 - ตรวจสอบความถูกต้องของ Firebase ID Token (Bearer Token)
│   │   └── error.middleware.ts                - ดักจับและจัดการ Error ส่วนกลาง
│   ├── scripts/                               📜 สคริปต์เสริมสำหรับเตรียมข้อมูลระบบ
│   │   └── seedInsurance.ts                   - สคริปต์ Seed ข้อมูลแผนประกันภัยเข้าสู่ฐานข้อมูล
│   └── utils/                                 📦 ยูทิลิตี้และข้อมูลตั้งต้น
│       ├── seedAssets.ts                      - ตรวจสอบและ Auto-seed สินทรัพย์ 100+ รายการ
│       ├── seedBankTiers.ts                   - ตรวจสอบและ Auto-seed ขั้นบันไดดอกเบี้ยธนาคารพาณิชย์ 11 สถาบัน
│       └── assetSeedData.ts                   - ฐานข้อมูลสินทรัพย์ตั้งต้น (หุ้นไทย, หุ้นสหรัฐ, REITs, ETF)
```

### 2.2 โครงสร้างฝั่งผู้ใช้งาน (Frontend)
```text
Frontend/
├── public/
│   ├── finshield_logo.svg                     - โลโก้หลักของระบบ FinShield
│   └── FSlogo.svg                             - สัญลักษณ์ไอคอนย่อ FinShield
├── src/
│   ├── app/                                   📱 Next.js 14 App Router (Pages & Layouts)
│   │   ├── layout.tsx                         - Root Layout, Theme Provider, Uicons CDN & Global Metadata
│   │   ├── loading.tsx                        - Global Page Loading Indicator แสดงระหว่างเปลี่ยน Route
│   │   ├── globals.css                        - สไตล์โกลบอล, Tailwind Directives และ Custom Themes
│   │   ├── icon.svg                           - Favicon ประจำเว็บแอปพลิเคชัน
│   │   ├── page.tsx                           - หน้าแรก (Landing Page)
│   │   ├── login/page.tsx                     - หน้าระบบเข้าสู่ระบบ (Authentication)
│   │   ├── signup/page.tsx                    - หน้าระบบลงทะเบียนผู้ใช้ใหม่
│   │   ├── reset-password/page.tsx            - หน้ารีเซ็ตรหัสผ่านผ่านอีเมล
│   │   └── simulator/                         - โครงสร้างโมดูลจำลองสถานการณ์การเงิน
│   │       ├── layout.tsx                     - Top Bar Navigation, Theme Toggle, Auth Guard & Chatbot
│   │       ├── layout.css                     - สไตล์การจัดวาง Top Navigation และโครงสร้าง Layout
│   │       ├── loading.tsx                    - Skeleton Loading เฉพาะส่วนของ Simulator Router
│   │       ├── page.tsx                       - Redirect Router -> `/simulator/overview`
│   │       ├── overview/page.tsx              - หน้าแดชบอร์ดภาพรวมสุขภาพการเงิน (Financial Overview & Pet Level)
│   │       ├── wealth-plan/page.tsx           - หน้ารวมเป้าหมายการเงินและการจัดสรรความมั่งคั่ง (Wealth Plan)
│   │       ├── wealth-plan-suggest/page.tsx   - หน้า AI แนะนำสัดส่วนพอร์ตการลงทุนแบบบูรณาการ
│   │       ├── tax/page.tsx                   - หน้าคำนวณ วางแผน ลดหย่อนภาษี และประวัติภาษี (Tax Optimizer)
│   │       ├── diary/page.tsx                 - หน้าบันทึกไดอารี่การเงินและประเมินพฤติกรรม (Retirement Diary)
│   │       ├── settings/page.tsx              - หน้าแผงตั้งค่าโปรไฟล์, ธีม, และแก้ไขข้อมูลการเงินตั้งต้น
│   │       └── retirement/page.tsx            - Redirect Router -> `/simulator/wealth-plan`
│   ├── components/
│   │   ├── auth/
│   │   │   └── UserMenu.tsx                   - คอมโพเนนต์เมนูโปรไฟล์ผู้ใช้งาน, สถานะล็อกอิน และปุ่มออกจากระบบ
│   │   ├── simulator/                         🧩 คอมโพเนนต์เครื่องมือหลัก (Modular Simulator Tools)
│   │   │   ├── OverviewTool.tsx               - แดชบอร์ดแสดง Net Worth, กระแสเงินสด, ดัชนีสุขภาพการเงิน และ Pet Levels
│   │   │   ├── WealthPlanTool.tsx             - เครื่องมือวางแผนการเงินบูรณาการ (ฉุกเฉิน, เงินเฟ้อ, DCA, วิกฤต)
│   │   │   ├── PortfolioBuilder.tsx           - เครื่องมือจัดพอร์ตการลงทุน เลือกสินทรัพย์ คำนวณความเสี่ยง/ผลตอบแทน/P&L
│   │   │   ├── TaxOptimizer.tsx               - เครื่องมือคำนวณภาษีเงินได้, สิทธิลดหย่อน, เครดิตปันผล และประวัติภาษี
│   │   │   ├── RetirementDiary.tsx            - สมุดบันทึกการเงิน พันธะหนี้สิน พร้อม AI ให้คำแนะนำและตัดเกรดพฤติกรรม
│   │   │   ├── AiAdvisor.tsx                  - คอมโพเนนต์เรียก AI แนะนำสัดส่วนพอร์ตพร้อมแจกแจงเหตุผลเชิงลึก
│   │   │   ├── ChatAssistant.tsx              - แชทบอทอัจฉริยะลอยตัว (Floating Chatbot) พร้อมระบบค้นหาข้อมูล RAG
│   │   │   ├── SettingsPanel.tsx              - แผงตั้งค่าข้อมูลส่วนบุคคล ปรับโหมดสี และปรับปรุงข้อมูลการเงินฐาน
│   │   │   ├── InfoTooltip.tsx                - คอมโพเนนต์ Tooltip ให้ข้อมูลนิยามและสูตรคำนวณทางการเงิน
│   │   │   ├── PageSkeleton.tsx               - คอมโพเนนต์แสดงผลระหว่างรอโหลดข้อมูล (Skeleton Loading)
│   │   │   └── wealth-plan/                   - ซับคอมโพเนนต์เฉพาะสำหรับโมดูล Wealth Plan
│   │   │       ├── DashboardView.tsx          - หน้าแสดงกราฟเปรียบเทียบพอร์ต, Cashflow Chart และสรุปผลลัพธ์
│   │   │       ├── WealthPlanForm.tsx         - ฟอร์มกรอกตัวเลขและตั้งค่าเป้าหมายการเงิน
│   │   │       ├── PortfolioModal.tsx         - ป็อปอัปสำหรับเปิดหน้าจัดพอร์ตการลงทุนแบบละเอียดและ AI Suggestion
│   │   │       ├── useWealthPlanState.ts      - Custom React Hook จัดการ State การจำลองและการคำนวณทั้งหมด
│   │   │       └── wealthPlanTypes.ts         - ประกาศ Type Definition สำหรับโมดูล Wealth Plan
│   │   └── ui/                                🎨 สไตล์ชีทเฉพาะแต่ละโมดูล
│   │       ├── OverviewTool.css
│   │       ├── WealthPlanTool.css
│   │       ├── EmergencyFundTool.css
│   │       ├── InflationTool.css
│   │       ├── PortfolioBuilder.css
│   │       ├── RetirementDiary.css
│   │       ├── AiAdvisor.css
│   │       ├── ChatAssistant.css
│   │       ├── SettingsPanel.css
│   │       ├── InfoTooltip.css
│   │       └── PageSkeleton.css
│   ├── contexts/                              🌐 การจัดการสถานะส่วนกลาง (Global State Management)
│   │   ├── AuthContext.tsx                    - จัดการสถานะผู้ใช้, การเข้าสู่ระบบ และ Firebase Session
│   │   └── FinanceContext.tsx                 - ซิงค์ข้อมูลการเงินของผู้ใช้ (รายได้, รายจ่าย, สินทรัพย์, หนี้สิน) กับฐานข้อมูล
│   ├── hooks/
│   │   └── useLocalStorage.ts                 - Custom Hook สำหรับจัดการและซิงค์ข้อมูลกับ LocalStorage อัตโนมัติ
│   └── lib/                                   🔧 ไลบรารีผู้ช่วยฝั่ง Frontend
│       ├── api.ts                             - Wrapper ฟังก์ชันเรียก REST API พร้อมแนบ Bearer Token อัตโนมัติ
│       ├── apiCache.ts                        - ระบบ In-memory & LocalStorage Cache สำหรับข้อมูลหลัก (Master Data)
│       ├── financeService.ts                  - ฟังก์ชันจัดการข้อมูลการเงินของผู้ใช้ (CRUD Finance Data)
│       ├── firebase.ts                        - การกำหนดค่า Firebase Client SDK (Auth, Config)
│       └── taxCalculator.ts                   - โมดูลคำนวณภาษีตามขั้นบันไดอัตราภาษี 5-35% และเครดิตภาษีปันผล
```

---

## 3. การออกแบบฐานข้อมูล (Database Schema Design - 10 Models)

ฐานข้อมูลได้รับการออกแบบให้อยู่ในรูปแบบ **Relational Database Schema (3NF Normalized)** ผ่าน Prisma ORM ครอบคลุม **10 โมเดล (10 Models)** ที่กระชับ ชัดเจน และมีประสิทธิภาพสูง:

```mermaid
erDiagram
    User ||--o| UserFinance : "has"
    User ||--o{ Portfolio : "creates"
    User ||--o{ DiaryScoreHistory : "evaluates"
    User ||--o{ TaxHistory : "records"
    User ||--o{ ChatMessage : "chats"

    Portfolio ||--|{ PortfolioItem : "contains"
    Asset ||--o{ PortfolioItem : "allocated_in"

    User {
        int id PK
        string firebaseUid UK
        string email UK
        string password
        string name
        boolean onboardingDone
        datetime createdAt
        datetime updatedAt
    }

    UserFinance {
        int id PK
        int userId FK "Unique"
        float food
        float rent
        float transport
        float necessities
        float other
        float debt
        float monthlyIncome
        float currentCapital
        float emergencyFund
        float monthlySavings
        int currentAge
        int retirementAge
        float retirementGoal
        float dividendGoal
        datetime createdAt
        datetime updatedAt
    }

    Asset {
        int id PK
        string symbol UK
        string name
        string sector
        string category
        float yield
        float risk
        string badge
        int taxBase
        boolean paysDividend
        datetime createdAt
        datetime updatedAt
    }

    BankTier {
        int id PK
        string bankId
        string bankName
        int minBalance
        float interestRate
        datetime createdAt
    }

    Portfolio {
        int id PK
        string name
        int userId FK
        datetime createdAt
        datetime updatedAt
    }

    PortfolioItem {
        int id PK
        int portfolioId FK
        int assetId FK
        float allocation
        datetime buyDate
        datetime createdAt
    }

    ChatMessage {
        int id PK
        string sessionId
        string firebaseUid
        string role
        string content
        json sources
        datetime createdAt
    }

    InsurancePlan {
        int id PK
        string company
        string category
        string planName
        json coverage
        string features
        datetime createdAt
        datetime updatedAt
    }

    DiaryScoreHistory {
        int id PK
        int userId FK
        string evaluationType
        string periodKey
        int score
        string review
        datetime createdAt
        datetime updatedAt
    }

    TaxHistory {
        int id PK
        int userId FK
        int taxYear
        float annualIncome
        float totalDeductions
        float netIncome
        float taxWithoutDeductions
        float taxWithDeductions
        float taxSaved
        float marginalRate
        json deductions
        datetime createdAt
        datetime updatedAt
    }
```

---

## 4. รายละเอียดฟังก์ชันและโมดูลการทำงานหลัก (System Functional Modules)

### 4.1 โมดูลแดชบอร์ดภาพรวมสุขภาพการเงิน (Financial Overview Dashboard & Pet Levels)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/OverviewTool.tsx`
- **หน้าที่**: รวบรวมข้อมูลสถานะทางการเงินของผู้ใช้มาประมวลผลเป็นดัชนีชี้วัดสุขภาพการเงิน (Financial Health Score) และจัดแสดงตัวละครสัตว์เลี้ยงตามระดับความพร้อมทางการเงิน (Pet Levels 9 ระดับ)
- **ความสามารถ**:
  - คำนวณและวิเคราะห์ความมั่งคั่งสุทธิ (Net Worth = สินทรัพย์รวม - หนี้สินคงค้าง)
  - วิเคราะห์กระแสเงินสดสุทธิรายเดือน (Monthly Net Cashflow = รายรับ - รายจ่าย - ภาระผ่อนชำระ)
  - ติดตามความคืบหน้าของ 3 เสาหลักเป้าหมายสำคัญ (เงินสำรองฉุกเฉิน, พอร์ตความมั่งคั่ง, เงินเก็บเกษียณอายุ)
  - แสดงสัญญาณเตือนความเสี่ยง (Financial Alert Indicators) เช่น ภาระหนี้สินเกิน 40% ของรายได้ (DTI) หรือเงินสำรองไม่เพียงพอ
  - แสดงภาพตัวละครสัตว์เลี้ยงวิวัฒนาการตามคะแนนสุขภาพทางการเงินเพื่อสร้างแรงจูงใจ (Gamification)

### 4.2 โมดูลรวมแผนการเงินและการจัดสรรความมั่งคั่ง (Wealth Plan & Integrated Simulator)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/WealthPlanTool.tsx`, `wealth-plan/`
- **หน้าที่**: รวมการวางแผนเงินสำรองฉุกเฉิน การลงทุนเพื่อเอาชนะเงินเฟ้อ และการจำลองสถานการณ์วิกฤตไว้ในหน้าเดียว
- **ความสามารถ**:
  - คำนวณเงินสำรองฉุกเฉินที่เหมาะสมตามระดับความเสี่ยงในอาชีพ (Job Risk Multiplier 3 - 12 เดือน)
  - คำนวณผลกระทบของเงินเฟ้อตามอัตราจริงแบบทบต้น (Compound Inflation Impact) แยกตามหมวดหมู่ค่าใช้จ่าย
  - รองรับการจำลองภาวะวิกฤต (Crisis Stress Test: ตกงาน, เจ็บป่วยฉุกเฉิน, อุบัติเหตุ) พร้อมคำนวณจำนวนเดือนที่อยู่รอด (Survival Months)
  - จำลองกลยุทธ์การลงทุน DCA (Dollar-Cost Averaging) รายเดือน ผสานอัตราผลตอบแทนคาดหวังของพอร์ต
  - เชื่อมโยงผลลัพธ์เข้าสู่ AI Portfolio Generator เพื่อรับคำแนะนำพอร์ตที่เหมาะสมเฉพาะบุคคล

### 4.3 โมดูลจัดพอร์ตการลงทุนและการวิเคราะห์ผลตอบแทน (Portfolio Builder & Live Market Data)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/PortfolioBuilder.tsx`, `Backend/src/services/`
- **หน้าที่**: ให้ผู้ใช้สามารถออกแบบ ปรับสัดส่วน และวิเคราะห์ประสิทธิภาพของพอร์ตลงทุนแบบเรียลไทม์
- **ความสามารถ**:
  - คลังสินทรัพย์มากกว่า 100 รายการ แบ่ง 5 หมวด (หุ้นปันผลไทย, หุ้นเติบโตสหรัฐ, DR/DRx, REITs/IFF, ตราสารหนี้และพันธบัตร/ETF)
  - คำนวณผลตอบแทนที่คาดหวังเฉลี่ยถ่วงน้ำหนัก (Weighted Expected Yield) และระดับความเสี่ยงเฉลี่ยถ่วงน้ำหนัก (Weighted Risk Score 1-10)
  - แสดงปฏิทินเงินปันผลรายเดือนตลอดทั้งปี (Monthly Dividend Calendar) อิงข้อมูลจริงจาก Yahoo Finance
  - คำนวณผลกำไร-ขาดทุนย้อนหลัง (Backtesting DCA P&L) ตามประวัติการเข้าซื้อ DCA
  - ตรวจสอบความถูกต้องของสัดส่วนการจัดสรรให้ครบ 100% เสมอ

### 4.4 โมดูลคำนวณและวางแผนภาษี (Tax Optimizer & Tax History)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/TaxOptimizer.tsx`, `taxCalculator.ts`, `taxHistory.controller.ts`
- **หน้าที่**: คำนวณภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 90/91) และวางแผนลดหย่อนภาษีอย่างมีประสิทธิภาพ
- **ความสามารถ**:
  - คำนวณภาษีตามขั้นบันไดอัตราภาษี 5% - 35% ของกรมสรรพากร พร้อมแสดงอัตราภาษีส่วนเพิ่ม (Marginal Tax Rate)
  - ครอบคลุมการลดหย่อนภาษีครบ 4 กลุ่ม (ส่วนตัว/ครอบครัว, ประกัน/การลงทุน เช่น SSF/RMF/ThaiESG, อสังหาฯ/ดอกเบี้ยบ้าน และเงินบริจาค)
  - วิเคราะห์จุดคุ้มทุนของเครดิตภาษีเงินปันผล (Dividend Tax Credit มาตรา 47 ทวิ) เปรียบเทียบกับ Final Tax 10% เพื่อเลือกแนวทางที่ประหยัดภาษีสูงสุด
  - บันทึกประวัติการยื่นภาษีรายปีลงฐานข้อมูล (`TaxHistory`) เพื่อเปรียบเทียบภาษีที่ประหยัดได้ในแต่ละปีภาษี
  - ให้คำแนะนำการเพิ่มยอดลดหย่อนภาษีด้วย AI Strategy Advisor

### 4.5 โมดูลบันทึกไดอารี่เกษียณและการประเมินพฤติกรรม (Retirement Diary & Behavior Evaluation)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/RetirementDiary.tsx`
- **หน้าที่**: พื้นที่บันทึกพฤติกรรมการใช้จ่าย พันธะหนี้สิน และติดตามเป้าหมายการเงินของผู้ใช้
- **ความสามารถ**:
  - ระบบบันทึกพันธะการชำระเงินและหนี้สิน (Pledges) พร้อมฟังก์ชันคำนวณและตัดยอดการผ่อนชำระอัตโนมัติเมื่อถึงกำหนด
  - บันทึกข้อความการเงินรายวัน (Daily Financial Journal) พร้อมตัวชี้วัดอารมณ์ทางการเงิน
  - ระบบ AI Financial Cheer ให้ข้อคิดและกำลังใจเชิงบวกในการปลดหนี้และสร้างวินัยการออม
  - ระบบ AI Behavior Scoring ให้คะแนนวินัยทางการเงิน (0 - 100 คะแนน) และบันทึกลงฐานข้อมูล (`DiaryScoreHistory`) เพื่อดูแนวโน้มพัฒนาการรายเดือน/รายปี

### 4.6 ระบบผู้ช่วยการเงิน AI อัจฉริยะ (AI Assistant with RAG Pipeline)
- **ไฟล์หลัก**: `Frontend/src/components/simulator/ChatAssistant.tsx`, `Backend/src/routes/ai.routes.ts`, `tavily.service.ts`
- **หน้าที่**: ผู้ช่วยส่วนตัวทางการเงินแบบสนทนา (Conversational Agent) พร้อมระบบค้นหาข้อมูลเรียลไทม์
- **ความสามารถ**:
  - สถาปัตยกรรม **Query Classifier**: วิเคราะห์คำถามผู้ใช้ว่าต้องค้นหาข้อมูลภายนอกแบบเรียลไทม์หรือไม่
  - การทำ **RAG (Retrieval-Augmented Generation)**: ใช้ Tavily Search ค้นหาข้อมูลดอกเบี้ยปัจจุบัน, โปรโมชั่นธนาคาร, ข่าวสารสินทรัพย์ หรือข้อมูลประกันภัยมาประกอบการตอบ
  - **Context-Aware Reasoning**: นำข้อมูลรายได้ รายจ่าย หนี้สิน และเงินออมจริงของผู้ใช้จากระบบมาประกอบการให้คำแนะนำเฉพาะบุคคลเสมอ
  - **Session & History Persistence**: บันทึกประวัติบทสนทนาแยกตาม Session ลงในตาราง `ChatMessage`

### 4.7 แผงตั้งค่าและจัดการข้อมูลส่วนบุคคล (Settings Panel & User Preferences)
- **ไฟล์หลัก**: `Frontend/src/app/simulator/settings/page.tsx`, `SettingsPanel.tsx`
- **หน้าที่**: พื้นที่ให้ผู้ใช้จัดการข้อมูลโปรไฟล์ ปรับแต่งการแสดงผล และปรับปรุงตัวเลขการเงินตั้งต้น
- **ความสามารถ**:
  - สลับโหมดการแสดงผล (Light Mode / Dark Mode)
  - แก้ไขข้อมูลพื้นฐานทางการเงิน (รายได้ประจำ, รายจ่ายแยกหมวดหมู่, เงินสำรองปัจจุบัน, เป้าหมายเกษียณ) และบันทึกซิงค์กับ Backend
  - จัดการเซสชันและข้อมูลความปลอดภัยของบัญชีผู้ใช้

### 4.8 ระบบแคชข้อมูลหลักฝั่งหน้าบ้าน (Frontend Master Data API Caching Layer)
- **ไฟล์หลัก**: `Frontend/src/lib/apiCache.ts`
- **หน้าที่**: ให้บริการแคชข้อมูลหลักที่มีการเปลี่ยนแปลงน้อยแต่ถูกเรียกใช้งานบ่อย
- **ความสามารถ**:
  - แคชข้อมูลขั้นบันไดดอกเบี้ยธนาคาร (`banks`), แผนประกันภัย (`insurance_plans`), อัตราเงินเฟ้อปัจจุบัน (`macro_inflation`), และรายการสินทรัพย์ (`assets`)
  - กลไกสองระดับ (Two-tier Caching): ตรวจสอบ In-Memory Map ก่อน หากไม่มีจึงตรวจสอบ `localStorage` พร้อมกลไก Time-To-Live (TTL)
  - ลดปริมาณการเรียก Network API และทำให้การสลับเปลี่ยนหน้ารวดเร็วและลื่นไหล (Instant Page Transition)

---

## 5. ข้อมูลจำเพาะส่วนต่อประสานโปรแกรมประยุกต์ (API Endpoints Specification)

| หมวดหมู่ (Module) | Method | Endpoint | สิทธิ์เข้าถึง (Auth) | คำอธิบายการทำงาน |
| :--- | :---: | :--- | :---: | :--- |
| **System Health** | `GET` | `/api/health` | Public | ตรวจสอบสถานะการทำงานของเซิร์ฟเวอร์ Backend |
| **Finance Core** | `GET` | `/api/finance` | Bearer Token | ดึงข้อมูลสุขภาพการเงินของผู้ใช้ (Expense, Asset, Retirement) |
| | `POST` | `/api/finance` | Bearer Token | บันทึกหรืออัปเดตข้อมูลสุขภาพการเงินของผู้ใช้ |
| **Market & Asset** | `GET` | `/api/simulator/assets` | Public | ดึงรายการสินทรัพย์ทั้งหมดหรือกรองตามประเภท/หมวดหมู่ |
| | `GET` | `/api/simulator/assets/:id` | Public | ดึงข้อมูลเจาะจงของสินทรัพย์พร้อมข้อมูลแคช |
| | `GET` | `/api/simulator/search?q=...` | Public | ค้นหาสินทรัพย์แบบ Dynamic Search ผ่าน Yahoo Finance API |
| | `GET` | `/api/simulator/market-data` | Public | ดึงราคาตลาดล่าสุดของสินทรัพย์และอัตราแลกเปลี่ยน USD/THB |
| | `GET` | `/api/simulator/macro/inflation` | Public | ดึงอัตราเงินเฟ้อไทยแบบเรียลไทม์จาก TradingView |
| | `GET` | `/api/simulator/banks` | Public | ดึงข้อมูลขั้นบันไดอัตราดอกเบี้ยเงินฝากธนาคารพาณิชย์ 11 สถาบัน |
| **Calculations** | `POST` | `/api/simulator/calculate-portfolio` | Public | คำนวณผลตอบแทนและความเสี่ยงเฉลี่ยถ่วงน้ำหนักของพอร์ต |
| | `POST` | `/api/simulator/calculate-inflation` | Public | คำนวณผลกระทบของเงินเฟ้อตามระยะเวลาและหมวดหมู่ค่าใช้จ่าย |
| | `POST` | `/api/simulator/calculate-bank-savings` | Public | คำนวณดอกเบี้ยเงินฝากธนาคารตามขั้นบันไดเงินฝากสะสมทบต้น |
| | `POST` | `/api/simulator/calculate-wealth` | Public | คำนวณการเติบโตของความมั่งคั่งและเงินเก็บเกษียณอายุ |
| | `POST` | `/api/simulator/calculate-emergency-fund` | Public | คำนวณเงินสำรองฉุกเฉินและระยะเวลาที่ต้องออมตามความเสี่ยงอาชีพ |
| | `POST` | `/api/simulator/stress-test` | Public | จำลองการรับมือวิกฤต (ตกงาน, เจ็บป่วย, อุบัติเหตุ) พร้อมคะแนนเอาชีวิตรอด |
| | `POST` | `/api/simulator/dividend-calendar` | Public | คำนวณปฏิทินเงินปันผลตลอด 12 เดือนจากพอร์ตที่จัดสรร |
| | `POST` | `/api/simulator/portfolio-pnl` | Public | คำนวณกำไร/ขาดทุนพอร์ต (P&L) ย้อนหลังตามประวัติการซื้อ DCA |
| **Portfolio DB** | `POST` | `/api/simulator/portfolios` | Public/User | บันทึกการจัดสรรพอร์ตของผู้ใช้ลงฐานข้อมูล |
| | `GET` | `/api/simulator/portfolios` | User | ดึงรายการพอร์ตที่บันทึกไว้ของผู้ใช้ |
| **Tax Module** | `POST` | `/api/tax-history` | Bearer Token | บันทึกประวัติการคำนวณและรายการลดหย่อนภาษีรายปีลงฐานข้อมูล |
| | `GET` | `/api/tax-history` | Bearer Token | เรียกดูประวัติการคำนวณภาษีย้อนหลังทั้งหมดของผู้ใช้ |
| | `DELETE`| `/api/tax-history/:year` | Bearer Token | ลบประวัติภาษีของปีภาษีที่ระบุ |
| **Diary Module** | `POST` | `/api/simulator/diary-scores` | User | บันทึกคะแนนและบทวิเคราะห์พฤติกรรมทางการเงินโดย AI |
| | `GET` | `/api/simulator/diary-scores` | User | ดึงประวัติคะแนนพฤติกรรมการเงินย้อนหลังของผู้ใช้ |
| **AI & RAG** | `POST` | `/api/ai/suggest` | Public/User | ขอคำแนะนำจัดพอร์ตลงทุนด้วย AI ผสานข้อมูลสืบค้น RAG |
| | `POST` | `/api/ai/chat` | Optional Auth | สนทนากับผู้ช่วย AI พร้อมระบบค้นหาข้อมูลเว็บแบบเรียลไทม์ |
| | `GET` | `/api/ai/chat/history` | Bearer Token | ดึงประวัติการแชทตาม Session ID ของผู้ใช้ |
| | `GET` | `/api/ai/chat/sessions` | Bearer Token | ดึงรายการ Session การสนทนาทั้งหมดของผู้ใช้ |
| **Insurance** | `GET` | `/api/insurance/plans` | Public | ดึงรายการแผนประกันชีวิต/สุขภาพ/รถยนต์สำหรับการวางแผนคุ้มครองความเสี่ยง |

---

## 6. สรุปความพร้อมสำหรับการจัดทำรายงานบทที่ 4 และ บทที่ 5

เอกสารนี้ครอบคลุมองค์ประกอบทางวิศวกรรมซอฟต์แวร์ครบถ้วนตามมาตรฐานโครงงาน ได้แก่:
1. **System Architecture & Caching Layer**: อธิบายการเชื่อมโยงระบบระหว่าง Client, Frontend Caching Layer, Application Server, AI Service, Market Data Service และ Database
2. **Database Schema & Data Dictionary**: โครงสร้างตารางในฐานข้อมูลครบถ้วนทั้ง **14 โมเดล** ที่มีความสัมพันธ์กันแบบ 3NF พร้อม Entity Relationship Diagram (ERD)
3. **Software Component Hierarchy**: การจัดแบ่งโฟลเดอร์และหน้าที่ของแต่ละไฟล์อย่างเป็นระเบียบทั้งฝั่งหน้าบ้านและหลังบ้าน รวมทั้งหน้าการตั้งค่าใหม่และการจัดการเซสชัน
4. **API Interface Specifications**: ข้อกำหนดรายละเอียดของ RESTful API เพื่อใช้อ้างอิงในหัวข้อการออกแบบส่วนเชื่อมต่อ (บทที่ 4) และกรณีทดสอบระบบ (บทที่ 5)
