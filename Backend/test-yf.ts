import yahooFinance from 'yahoo-finance2';

async function main() {
  const q = await yahooFinance.quote('AVGO');
  console.log(JSON.stringify({
    dividendYield: q.dividendYield,
    trailingAnnualDividendYield: q.trailingAnnualDividendYield,
    trailingAnnualDividendRate: q.trailingAnnualDividendRate,
    dividendRate: q.dividendRate
  }, null, 2));
}

main().catch(console.error);
