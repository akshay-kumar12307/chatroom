const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Room",
  new mongoose.Schema({
    name: String,
    password: String,
    admin: String
  })
);
