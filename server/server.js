const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* 🔥 IMPORTANT: CORRECT PUBLIC PATH */
const publicPath = path.join(__dirname, "../public");

/* ---------- STATIC FILES ---------- */
app.use(express.static(publicPath));
app.use(express.json());

/* 🔥 ROOT ROUTE (THIS FIXES THE BLANK PAGE) */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});
app.use(express.json());

/* ---------- FILE UPLOAD ---------- */
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ path: `/uploads/${req.file.filename}` });
});

/* ---------- IN-MEMORY STORAGE ---------- */
const rooms = {};
const messages = {};
const onlineUsers = {};

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

  socket.on("join", ({ name, room, password }) => {

    if (!rooms[room]) {
      rooms[room] = {
        password: password || null,
        admin: name
      };
      messages[room] = [];
    }

    if (rooms[room].password && rooms[room].password !== password) {
      socket.emit("errorMsg", "Wrong room password");
      return;
    }

    socket.join(room);
    socket.username = name;
    socket.room = room;

    onlineUsers[socket.id] = { name, room };

    io.to(room).emit(
      "onlineUsers",
      Object.values(onlineUsers).filter(u => u.room === room)
    );

    socket.emit("loadMessages", messages[room]);
  });

  socket.on("sendMessage", msg => {
    if (!msg.text && !msg.file) return;

    const message = {
      id: Date.now(),
      user: socket.username,
      text: msg.text || "",
      file: msg.file || null,
      time: new Date().toLocaleTimeString(),
      readBy: [socket.username]
    };

    messages[socket.room].push(message);
    io.to(socket.room).emit("newMessage", message);
  });

  socket.on("typing", state => {
    socket.to(socket.room).emit("typing", {
      user: socket.username,
      state
    });
  });

  socket.on("read", id => {
    const roomMsgs = messages[socket.room];
    const m = roomMsgs.find(m => m.id === id);
    if (m && !m.readBy.includes(socket.username)) {
      m.readBy.push(socket.username);
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

/* ---------- START ---------- */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
