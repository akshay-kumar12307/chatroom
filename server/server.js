require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const multer = require("multer");

const Message = require("./models/message");
const Room = require("./models/room");

mongoose.connect("mongodb://127.0.0.1:27017/chatlab");

const app = express();
const server = http.createServer(app);
const io = new Server(server);const path = require("path");

app.use(express.static(path.join(__dirname, "../public")));

app.use(express.json());

const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));

/* -------- FILE UPLOAD -------- */
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ path: `/uploads/${req.file.filename}` });
});

/* -------- SOCKET -------- */
const onlineUsers = {};

io.on("connection", socket => {

  socket.on("join", async ({ name, room, password }) => {
    const r = await Room.findOne({ name: room });
    if (r && r.password && r.password !== password) {
      socket.emit("errorMsg", "Wrong room password");
      return;
    }

    socket.join(room);
    socket.username = name;
    socket.room = room;

    onlineUsers[socket.id] = { name, room };
    io.to(room).emit("onlineUsers",
      Object.values(onlineUsers).filter(u => u.room === room)
    );

    const messages = await Message.find({ room }).limit(50);
    socket.emit("loadMessages", messages);
  });

  socket.on("sendMessage", async msg => {
    if (!msg.text && !msg.file) return;

    const m = await Message.create({
      ...msg,
      room: socket.room,
      readBy: [socket.username]
    });

    io.to(socket.room).emit("newMessage", m);
  });

  socket.on("typing", state => {
    socket.to(socket.room).emit("typing", {
      user: socket.username,
      state
    });
  });

  socket.on("read", async id => {
    const m = await Message.findById(id);
    if (!m.readBy.includes(socket.username)) {
      m.readBy.push(socket.username);
      await m.save();
      io.to(socket.room).emit("readUpdate", m);
    }
  });

  socket.on("disconnect", () => {
    const user = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    if (user) {
      io.to(user.room).emit(
        "onlineUsers",
        Object.values(onlineUsers).filter(u => u.room === user.room)
      );
    }
  });

});

server.listen(3000, () =>
  console.log("✅ Server running at http://localhost:3000")
);
