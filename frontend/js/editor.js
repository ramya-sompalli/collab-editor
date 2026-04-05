if (!localStorage.getItem("token")) window.location.href = "index.html";

const params = new URLSearchParams(window.location.search);
const ROOM_ID = params.get("room");
if (!ROOM_ID) window.location.href = "dashboard.html";

const BADGE_COLORS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6"];
let monacoEditor = null;
let ws = null;
let currentFileId = null;
let currentLanguage = "python";
let suppressChange = false;
let userRole = "editor";
let allFiles = [];

// ── Monaco Init ──────────────────────────────────────────────
require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" } });
require(["vs/editor/editor.main"], function () {
  monacoEditor = monaco.editor.create(document.getElementById("monaco-container"), {
    value: "# Loading...",
    language: "python",
    theme: "vs-dark",
    fontSize: 14,
    minimap: { enabled: true },
    wordWrap: "on",
    automaticLayout: true,
  });

  monacoEditor.onDidChangeModelContent((event) => {
    if (suppressChange || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (userRole === "viewer") return;
    for (const change of event.changes) {
      if (change.text.length > 0) {
        ws.send(JSON.stringify({ type: "insert", pos: change.rangeOffset, char: change.text }));
      } else {
        for (let i = 0; i < change.rangeLength; i++) {
          ws.send(JSON.stringify({ type: "delete", pos: change.rangeOffset }));
        }
      }
    }
  });

  monacoEditor.onDidChangeCursorPosition((e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const pos = monacoEditor.getModel().getOffsetAt(e.position);
    ws.send(JSON.stringify({ type: "cursor", pos }));
  });

  loadRoom();
});

// ── Load Room ────────────────────────────────────────────────
async function loadRoom() {
  try {
    const room = await API.getRoom(ROOM_ID);
    document.getElementById("room-name-label").textContent = room.name;
    document.getElementById("room-id-display").textContent = `ID: ${ROOM_ID}`;
    currentLanguage = room.language;
    userRole = room.role;
    document.getElementById("lang-select").value = room.language;
    allFiles = room.files;

    if (userRole === "viewer") {
      monacoEditor.updateOptions({ readOnly: true });
      showToast("You are in viewer mode", "info");
    }

    renderFileTree(room.files);
    if (room.files.length > 0) loadFile(room.files[0]);
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ── File Tree ────────────────────────────────────────────────
function renderFileTree(files) {
  allFiles = files;
  const list = document.getElementById("file-list");
  list.innerHTML = "";
  files.forEach(f => {
    const item = document.createElement("div");
    item.className = "file-item" + (f.id === currentFileId ? " active" : "");
    item.dataset.id = f.id;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = "📄 " + f.name;
    nameSpan.style.flex = "1";
    nameSpan.addEventListener("click", () => loadFile(f));

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.title = "Delete file";
    delBtn.style = "background:none; border:none; color:#888; cursor:pointer; font-size:12px; padding:0 4px;";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${f.name}"?`)) return;
      await API.deleteFile(f.id);
      const room = await API.getRoom(ROOM_ID);
      renderFileTree(room.files);
      if (currentFileId === f.id && room.files.length > 0) loadFile(room.files[0]);
    });

    item.style.display = "flex";
    item.style.alignItems = "center";
    item.appendChild(nameSpan);
    if (userRole !== "viewer") item.appendChild(delBtn);
    list.appendChild(item);
  });
}

document.getElementById("add-file-btn").addEventListener("click", async () => {
  if (userRole === "viewer") return showToast("Viewers cannot add files", "error");
  const name = prompt("File name (e.g. utils.py):");
  if (!name) return;
  const lang = name.endsWith(".js") ? "javascript" : "python";
  try {
    await API.createFile({ room_id: ROOM_ID, name, language: lang });
    const room = await API.getRoom(ROOM_ID);
    renderFileTree(room.files);
  } catch (e) {
    showToast(e.message, "error");
  }
});

async function loadFile(file) {
  currentFileId = file.id;
  try {
    const data = await API.getFile(file.id);
    currentLanguage = data.language;
    document.getElementById("lang-select").value = data.language;

    suppressChange = true;
    monaco.editor.setModelLanguage(monacoEditor.getModel(), data.language);
    monacoEditor.setValue(data.content);
    suppressChange = false;

    document.querySelectorAll(".file-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === file.id);
    });

    connectWS(file.id);
  } catch (e) {
    showToast(e.message, "error");
  }
}

// ── WebSocket ────────────────────────────────────────────────
function connectWS(fileId) {
  if (ws) ws.close();
  const token = localStorage.getItem("token");
  ws = new WebSocket(`wss://collab-editor-backend.onrender.com/ws/${ROOM_ID}/${fileId}?token=${token}`);
  ws.onopen = () => {
    document.getElementById("ws-status").textContent = "🟢 Connected";
  };

  ws.onclose = () => {
    document.getElementById("ws-status").textContent = "🔴 Disconnected";
    // Auto-reconnect after 3s
    setTimeout(() => { if (currentFileId === fileId) connectWS(fileId); }, 3000);
  };

  ws.onerror = () => {
    document.getElementById("ws-status").textContent = "🔴 Error";
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "init") {
      suppressChange = true;
      monacoEditor.setValue(msg.content);
      suppressChange = false;
      renderPresence(msg.active_users || []);
    }

    else if (msg.type === "insert") {
      suppressChange = true;
      const model = monacoEditor.getModel();
      const pos = model.getPositionAt(msg.op.pos);
      monacoEditor.executeEdits("remote", [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: msg.op.char,
        forceMoveMarkers: true
      }]);
      suppressChange = false;
    }

    else if (msg.type === "delete") {
      suppressChange = true;
      const model = monacoEditor.getModel();
      const pos = model.getPositionAt(msg.op.pos);
      const endPos = model.getPositionAt(msg.op.pos + 1);
      monacoEditor.executeEdits("remote", [{
        range: new monaco.Range(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column),
        text: "",
        forceMoveMarkers: true
      }]);
      suppressChange = false;
    }

    else if (msg.type === "chat") {
      appendChat(msg.user, msg.text);
    }

    else if (msg.type === "user_joined") {
      appendChat("🔔 System", `${msg.user?.username} joined`, true);
      renderPresence(msg.active_users || []);
    }

    else if (msg.type === "presence_update") {
      renderPresence(msg.active_users || []);
      if (msg.user_left) appendChat("🔔 System", `${msg.user_left.username} left`, true);
    }

    else if (msg.type === "cursor") {
      renderRemoteCursor(msg.user_id, msg.user, msg.pos);
    }
  };
}

// ── Remote Cursors ────────────────────────────────────────────
const remoteCursors = {};
const cursorDecorations = {};

function renderRemoteCursor(userId, username, pos) {
  if (!monacoEditor) return;
  const model = monacoEditor.getModel();
  const position = model.getPositionAt(pos);
  const color = BADGE_COLORS[Object.keys(remoteCursors).indexOf(userId) % BADGE_COLORS.length] || "#61dafb";

  // Remove old decoration
  if (cursorDecorations[userId]) {
    monacoEditor.deltaDecorations(cursorDecorations[userId], []);
  }

  cursorDecorations[userId] = monacoEditor.deltaDecorations([], [{
    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
    options: {
      className: "remote-cursor",
      hoverMessage: { value: `👤 ${username}` },
      beforeContentClassName: "remote-cursor-label",
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      zIndex: 10,
    }
  }]);

  remoteCursors[userId] = { username, pos, color };
}

// ── Presence ─────────────────────────────────────────────────
function renderPresence(users) {
  const container = document.getElementById("presence-users");
  container.innerHTML = "";
  users.forEach((u, i) => {
    const badge = document.createElement("div");
    badge.className = "user-badge";
    badge.style.background = BADGE_COLORS[i % BADGE_COLORS.length];
    badge.textContent = u.username;
    container.appendChild(badge);
  });
}

// ── Chat ─────────────────────────────────────────────────────
function appendChat(user, text, isSystem = false) {
  const box = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = isSystem
    ? `<span style="color:#888;font-style:italic">${text}</span>`
    : `<span class="chat-user">${user}:</span> <span class="chat-text">${text}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

document.getElementById("chat-send").addEventListener("click", sendChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "chat", text }));
  appendChat(localStorage.getItem("username"), text);
  input.value = "";
}

// ── Run Code ─────────────────────────────────────────────────
document.getElementById("run-btn").addEventListener("click", async () => {
  const code = monacoEditor.getValue();
  const termOut = document.getElementById("term-output");
  termOut.textContent = "⏳ Running...";
  termOut.className = "";
  try {
    const res = await API.execute(code, currentLanguage);
    if (res.error) {
      termOut.textContent = res.error;
      termOut.className = "error";
    } else if (res.stderr) {
      termOut.textContent = res.stderr;
      termOut.className = "error";
    } else {
      termOut.textContent = res.stdout || "(no output)";
    }
  } catch (e) {
    termOut.textContent = e.message;
    termOut.className = "error";
  }
});

// ── Language Switch ───────────────────────────────────────────
document.getElementById("lang-select").addEventListener("change", (e) => {
  currentLanguage = e.target.value;
  monaco.editor.setModelLanguage(monacoEditor.getModel(), currentLanguage);
});

// ── Snapshot ─────────────────────────────────────────────────
document.getElementById("snapshot-btn").addEventListener("click", async () => {
  if (!currentFileId) return;
  try {
    await API.saveSnapshot(currentFileId);
    showToast("Snapshot saved!");
  } catch (e) {
    showToast(e.message, "error");
  }
});

// ── Copy Room ID ─────────────────────────────────────────────
document.getElementById("copy-room-btn").addEventListener("click", () => {
  navigator.clipboard.writeText(ROOM_ID);
  showToast("Room ID copied!");
});

// ── History Modal ─────────────────────────────────────────────
document.getElementById("history-btn").addEventListener("click", async () => {
  if (!currentFileId) return;
  const modal = document.getElementById("history-modal");
  const list = document.getElementById("history-list");
  list.innerHTML = "Loading...";
  modal.style.display = "flex";
  try {
    const history = await API.getHistory(currentFileId);
    if (history.length === 0) {
      list.innerHTML = `<p style="color:#888;">No snapshots yet.</p>`;
      return;
    }
    list.innerHTML = "";
    history.forEach(h => {
      const item = document.createElement("div");
      item.style = "background:#1e1e1e; padding:10px; border-radius:6px; margin-bottom:8px;";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#61dafb; font-size:12px;">🕓 ${new Date(h.saved_at).toLocaleString()}</span>
          <button class="btn btn-success restore-btn" style="font-size:12px; padding:3px 10px;">Restore</button>
        </div>
        <pre style="color:#aaa; font-size:12px; margin-top:6px; white-space:pre-wrap; max-height:80px; overflow:hidden;">${h.preview}...</pre>
      `;
      item.querySelector(".restore-btn").addEventListener("click", async () => {
        if (!confirm("Restore this snapshot? Current content will be replaced.")) return;
        const res = await API.restoreSnap(currentFileId, h.id);
        suppressChange = true;
        monacoEditor.setValue(res.content);
        suppressChange = false;
        // Broadcast full sync to room
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "full_sync", content: res.content }));
        }
        modal.style.display = "none";
        showToast("Snapshot restored!");
      });
      list.appendChild(item);
    });
  } catch (e) {
    list.innerHTML = `<p style="color:#e74c3c;">${e.message}</p>`;
  }
});

document.getElementById("lang-select").addEventListener("change", (e) => {
  currentLanguage = e.target.value;
  // Map our language names to Monaco language IDs
  const monacoLangMap = {
    "python": "python",
    "javascript": "javascript",
    "typescript": "typescript",
    "java": "java",
    "cpp": "cpp",
    "c": "c",
    "csharp": "csharp",
    "go": "go",
    "rust": "rust",
    "php": "php",
    "ruby": "ruby",
    "sql": "sql",
    "html": "html",
    "css": "css",
    "json": "json",
    "markdown": "markdown",
  };
  const monacoLang = monacoLangMap[currentLanguage] || "plaintext";
  monaco.editor.setModelLanguage(monacoEditor.getModel(), monacoLang);
});

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = (type === "error" ? "❌ " : type === "info" ? "ℹ️ " : "✅ ") + msg;
  t.style.background = type === "error" ? "#e74c3c" : type === "info" ? "#2980b9" : "#27ae60";
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2500);
}