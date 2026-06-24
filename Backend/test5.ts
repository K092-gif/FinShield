const run = async () => {
    const mod = await eval('import("yahoo-finance2")');
    const yf = new mod.default();
    try {
        const symbols = ["AAPL", "MSFT", "GOOGL", "PTT.BK", "AOT.BK"];
        const res = await yf.quote(symbols);
        console.log("Success! Fetched", res.length, "quotes.");
        console.log(res[0].symbol, res[0].regularMarketPrice);
    } catch (e) {
        console.error("Failed:", e.message);
    }
};
run();
