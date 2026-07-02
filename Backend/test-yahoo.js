const https = require('https');

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      family: 4,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(rawData)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

async function run() {
  const symbol = "LWLG";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,defaultKeyStatistics,summaryDetail,price`;
  
  try {
    const data = await fetchJson(url);
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}

run();
