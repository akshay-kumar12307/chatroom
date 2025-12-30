const socket = io();

const name = localStorage.getItem("name");
const room = localStorage.getItem("room");
const pass = localStorage.getItem("pass");

document.getElementById("roomName").innerText = room;

const msg = document.getElementById("msg");
const file = document.getElementById("file");
const messages = document.getElementById("messages");
const onlineUsers = document.getElementById("onlineUsers");
const typing = document.getElementById("typing");

socket.emit("join", { name, room, password: pass });

/* SEND TEXT */
function send() {
  if (!msg.value.trim()) return;
  socket.emit("sendMessage", {
    user: name,
    text: msg.value
  });
  msg.value = "";
}

/* ENTER TO SEND */
msg.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});

/* FILE SEND */
file.onchange = async () => {
  const fd = new FormData();
  fd.append("file", file.files[0]);

  const r = await fetch("/upload", { method: "POST", body: fd });
  const d = await r.json();

  socket.emit("sendMessage", {
    user: name,
    file: d.path,
    type: "file"
  });
};

/* RECEIVE MESSAGE */
socket.on("newMessage", m => {
  const div = document.createElement("div");
  div.className = "message " + (m.user === name ? "me" : "other");

  if (m.type === "file") {
    div.innerHTML = `
      <div class="name">${m.user}</div>
      <a href="${m.file}" download>📎 Download file</a>
    `;
  } else {
    div.innerHTML = `
      <div class="name">${m.user}</div>
      ${m.text}
    `;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

/* ONLINE USERS */
socket.on("onlineUsers", list => {
  onlineUsers.innerHTML = list.map(u => `🟢 ${u.name}`).join("<br>");
});

/* TYPING */
msg.oninput = () => {
  socket.emit("typing", true);
};

socket.on("typing", d => {
  typing.innerText = d.state ? `${d.user} is typing...` : "";
});

/* PLACEHOLDERS */
function pickEmoji() {
  msg.value += "😊";
}

function startVoice() {
  alert("Voice feature UI ready – backend can be added next");
}
