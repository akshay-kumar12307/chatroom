const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* ---------- STATIC ---------- */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* ---------- FILE UPLOAD ---------- */
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static("uploads"));

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ path: `/uploads/${req.file.filename}` });
});

/* ---------- IN-MEMORY STORAGE ---------- */

// rooms = {
//   roomName: { password, admin }
// }
const rooms = {};

// messages = {
//   roomName: [ messageObj ]
// }
const messages = {};

// online users
// socketId → { name, room }
const onlineUsers = {};

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

  /* JOIN ROOM */
  socket.on("join", ({ name, room, password }) => {

    // create room if not exists
    if (!rooms[room]) {
      rooms[room] = {
        password: password || null,
        admin: name
      };
      messages[room] = [];
    }

    // password check
    if (rooms[room].password && rooms[room].password !== password) {
      socket.emit("errorMsg", "Wrong room password");
      return;
    }

    socket.join(room);
    socket.username = name;
    socket.room = room;

    onlineUsers[socket.id] = { name, room };

    // send online users
    io.to(room).emit(
      "onlineUsers",
      Object.values(onlineUsers).filter(u => u.room === room)
    );

    // load previous messages
    socket.emit("loadMessages", messages[room]);
  });

  /* SEND MESSAGE */
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

  /* TYPING */
  socket.on("typing", state => {
    socket.to(socket.room).emit("typing", {
      user: socket.username,
      state
    });
  });

  /* READ RECEIPTS */
  socket.on("read", id => {
    const roomMsgs = messages[socket.room];
    const m = roomMsgs.find(m => m.id === id);
    if (m && !m.readBy.includes(socket.username)) {
      m.readBy.push(socket.username);
      io.to(socket.room).emit("readUpdate", m);
    }
  });

  /* DISCONNECT */
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
