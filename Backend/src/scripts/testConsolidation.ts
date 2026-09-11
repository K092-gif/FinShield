import { prisma } from '../prisma'
import { savePortfolioToDb, getUserPortfolios } from '../services/databaseService'

async function runTests() {
  console.log('====================================================')
  console.log('🧪 Starting FinShield Table Consolidation Test Suite')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      if (detail) console.error(`   Detail: ${detail}`)
      failed++
    }
  }

  try {
    // ─────────────────────────────────────────────────────────
    // Test 1: Database Table Count & Schema Verification
    // ─────────────────────────────────────────────────────────
    console.log('--- Test Group 1: Database Table Structure ---')
    const tablesRaw: any[] = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    )
    const tableNames: string[] = tablesRaw.map((t) => t.table_name)
    console.log('Current DB Tables in public schema:', tableNames)

    assert(tableNames.length === 10, 'DB must contain exactly 10 tables', `Found ${tableNames.length} tables`)
    assert(tableNames.includes('UserFinance'), 'Table "UserFinance" must exist in DB')
    assert(tableNames.includes('PortfolioItem'), 'Table "PortfolioItem" must exist in DB')
    assert(!tableNames.includes('UserExpense'), 'Legacy table "UserExpense" must NOT exist')
    assert(!tableNames.includes('UserAsset'), 'Legacy table "UserAsset" must NOT exist')
    assert(!tableNames.includes('UserRetirement'), 'Legacy table "UserRetirement" must NOT exist')
    assert(!tableNames.includes('PortfolioAllocation'), 'Legacy table "PortfolioAllocation" must NOT exist')
    assert(!tableNames.includes('PortfolioTransaction'), 'Legacy table "PortfolioTransaction" must NOT exist')
    assert(!tableNames.includes('SavedPortfolio'), 'Legacy table "SavedPortfolio" must NOT exist')
    assert(!tableNames.includes('_prisma_migrations'), 'Legacy table "_prisma_migrations" must NOT exist')

    // ─────────────────────────────────────────────────────────
    // Test 2: UserFinance CRUD & Data Integrity
    // ─────────────────────────────────────────────────────────
    console.log('\n--- Test Group 2: UserFinance Operations ---')
    const testUid = 'test_integration_user_' + Date.now()

    const createdUser = await prisma.user.create({
      data: {
        firebaseUid: testUid,
        email: `${testUid}@finshield.test`,
        name: 'Integration Test User',
        finance: {
          create: {
            food: 6500,
            rent: 12000,
            transport: 3000,
            necessities: 2500,
            other: 1500,
            debt: 4000,
            monthlyIncome: 50000,
            currentCapital: 200000,
            emergencyFund: 150000,
            monthlySavings: 10000,
            currentAge: 26,
            retirementAge: 55,
            retirementGoal: 10000000,
            dividendGoal: 30000,
          },
        },
      },
      include: { finance: true },
    })

    assert(!!createdUser.finance, 'UserFinance record created successfully')
    assert(createdUser.finance?.rent === 12000, 'UserFinance expense field (rent) matches 12000')
    assert(createdUser.finance?.monthlyIncome === 50000, 'UserFinance asset field (monthlyIncome) matches 50000')
    assert(createdUser.finance?.retirementAge === 55, 'UserFinance retirement field (retirementAge) matches 55')

    // Update finance
    const updatedFinance = await prisma.userFinance.update({
      where: { userId: createdUser.id },
      data: {
        food: 7000,
        monthlySavings: 15000,
      },
    })
    assert(updatedFinance.food === 7000, 'UserFinance food updated to 7000')
    assert(updatedFinance.monthlySavings === 15000, 'UserFinance monthlySavings updated to 15000')

    // ─────────────────────────────────────────────────────────
    // Test 3: Portfolio & PortfolioItem (DCA Transactions)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- Test Group 3: Portfolio & PortfolioItem (DCA) ---')
    
    // Pick an existing asset from DB
    const sampleAsset = await prisma.asset.findFirst()
    if (!sampleAsset) throw new Error('No assets found in DB to run portfolio test')

    const testPortName = 'Test_DCA_Port_' + Date.now()
    const dcaTransactionsMap = {
      [sampleAsset.symbol]: [
        { allocation: '25', buyDate: '2026-01-15' },
        { allocation: '25', buyDate: '2026-02-15' },
      ],
    }

    // Save portfolio
    const savedPort = await savePortfolioToDb(testUid, testPortName, dcaTransactionsMap)
    assert(!!savedPort && savedPort.name === testPortName, 'savePortfolioToDb creates portfolio record')

    // Check PortfolioItem records in DB
    const itemsInDb = await prisma.portfolioItem.findMany({
      where: { portfolioId: savedPort.id },
    })
    assert(itemsInDb.length === 2, 'PortfolioItem has exactly 2 DCA transaction records', `Found ${itemsInDb.length}`)
    assert(itemsInDb[0].allocation === 25, 'PortfolioItem DCA allocation matches 25%')

    // Retrieve via getUserPortfolios
    const userPorts = await getUserPortfolios(testUid)
    assert(!!userPorts[testPortName], 'getUserPortfolios returns created portfolio')
    assert(
      !!userPorts[testPortName][sampleAsset.symbol] &&
        userPorts[testPortName][sampleAsset.symbol].length === 2,
      'getUserPortfolios returns 2 DCA transactions mapped by asset symbol'
    )
    assert(
      userPorts[testPortName][sampleAsset.symbol][0].buyDate === '2026-01-15',
      'First DCA transaction buyDate matches 2026-01-15'
    )

    // Re-save/update portfolio
    const updatedDcaMap = {
      [sampleAsset.symbol]: [
        { allocation: '50', buyDate: '2026-03-01' },
      ],
    }
    await savePortfolioToDb(testUid, testPortName, updatedDcaMap)
    const recheckedPorts = await getUserPortfolios(testUid)
    assert(
      recheckedPorts[testPortName][sampleAsset.symbol].length === 1 &&
        recheckedPorts[testPortName][sampleAsset.symbol][0].allocation === '50',
      'Portfolio update replaces items and reflects new 50% DCA transaction'
    )

    // Clean up test user
    await prisma.user.delete({ where: { id: createdUser.id } })
    console.log('\n🧹 Cleaned up test user and cascade-deleted portfolio/finance records')

  } catch (err: any) {
    console.error('💥 Unexpected test error:', err)
    failed++
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n====================================================')
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
