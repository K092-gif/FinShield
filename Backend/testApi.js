const body = {
  firebaseUid: "guest",
  name: "Test API Port",
  transactions: {
    "DELTA": [
      { allocation: "10", buyDate: "2023-01-01" }
    ]
  }
};

fetch("http://localhost:5000/api/simulator/portfolios", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
