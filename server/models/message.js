const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Message",
  new mongoose.Schema({
    user: String,
    room: String,
    text: String,
    file: String,
    type: { type: String, default: "text" }, // text | file | voice
    replyTo: String,
    readBy: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
  })
);
