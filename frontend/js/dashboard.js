if (!localStorage.getItem("token")) window.location.href = "index.html";

document.getElementById("username-display").textContent =
  "👤 " + localStorage.getItem("username");

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

async function loadRooms() {
  const grid = document.getElementById("rooms-grid");
  grid.innerHTML = `<p style="color:#888;">Loading...</p>`;
  try {
    const rooms = await API.getRooms();
    if (rooms.length === 0) {
      grid.innerHTML = `<p style="color:#888;">No rooms yet. Create one!</p>`;
      return;
    }
    grid.innerHTML = "";
    rooms.forEach(r => {
      const card = document.createElement("div");
      card.className = "room-card";
      card.innerHTML = `
        <h3>🗂 ${r.name}</h3>
        <span>${r.role}</span>
        <div style="margin-top:8px; display:flex; gap:6px;">
          <button class="btn btn-primary enter-btn" style="font-size:12px; padding:4px 10px;">Enter</button>
          <button class="btn btn-danger leave-btn" style="font-size:12px; padding:4px 10px;">Leave</button>
          <button class="copy-btn" style="background:#444; border:none; border-radius:4px; color:#fff; font-size:12px; padding:4px 10px; cursor:pointer;" title="Copy room ID">📋 ID</button>
        </div>
      `;
      card.querySelector(".enter-btn").addEventListener("click", () => {
        window.location.href = `editor.html?room=${r.room_id}`;
      });
      card.querySelector(".leave-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await API.leaveRoom(r.room_id);
        loadRooms();
      });
      card.querySelector(".copy-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(r.room_id);
        showToast("Room ID copied!");
      });
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = `<p style="color:#e74c3c;">${e.message}</p>`;
  }
}

// Create room
document.getElementById("create-btn").addEventListener("click", async () => {
  const name = document.getElementById("room-name").value.trim();
  const language = document.getElementById("room-lang").value;
  if (!name) return showToast("Enter a room name", "error");
  try {
    const room = await API.createRoom({ name, language });
    window.location.href = `editor.html?room=${room.room_id}`;
  } catch (e) {
    showToast(e.message, "error");
  }
});

// Join by room ID
document.getElementById("join-btn").addEventListener("click", async () => {
  const room_id = document.getElementById("join-room-id").value.trim();
  if (!room_id) return showToast("Enter a Room ID", "error");
  try {
    await API.joinRoom(room_id);
    window.location.href = `editor.html?room=${room_id}`;
  } catch (e) {
    showToast(e.message, "error");
  }
});

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = (type === "error" ? "❌ " : "✅ ") + msg;
  t.style.background = type === "error" ? "#e74c3c" : "#27ae60";
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2500);
}

loadRooms();