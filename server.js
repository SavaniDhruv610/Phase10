const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Static server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
