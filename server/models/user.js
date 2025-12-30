const mongoose = require("mongoose");

module.exports = mongoose.model(
  "User",
  new mongoose.Schema({
    name: String,
    avatar: String,
    online: Boolean
  })
);
