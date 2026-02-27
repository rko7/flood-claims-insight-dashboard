const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// basic route
app.get("/", (req, res) => {
  res.send("FloodDash server is running");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});