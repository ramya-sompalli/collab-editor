const BASE_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

function handleUnauth() {
  localStorage.clear();
  window.location.href = "index.html";
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE_URL + path, { ...options, headers });
  if (res.status === 401) { handleUnauth(); return; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function apiFormFetch(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE_URL + path, { method: "POST", headers, body: formData });
  if (res.status === 401) { handleUnauth(); return; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

window.API = {
  register:      (data)             => apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login:         (username, pass)   => { const fd = new FormData(); fd.append("username", username); fd.append("password", pass); return apiFormFetch("/auth/login", fd); },
  getRooms:      ()                 => apiFetch("/rooms"),
  createRoom:    (data)             => apiFetch("/rooms", { method: "POST", body: JSON.stringify(data) }),
  joinRoom:      (room_id)          => apiFetch("/rooms/join", { method: "POST", body: JSON.stringify({ room_id }) }),
  leaveRoom:     (room_id)          => apiFetch(`/rooms/${room_id}/leave`, { method: "DELETE" }),
  getRoom:       (id)               => apiFetch(`/rooms/${id}`),
  getFile:       (id)               => apiFetch(`/files/${id}`),
  createFile:    (data)             => apiFetch("/files/", { method: "POST", body: JSON.stringify(data) }),
  deleteFile:    (id)               => apiFetch(`/files/${id}`, { method: "DELETE" }),
  saveSnapshot:  (fileId)           => apiFetch(`/files/${fileId}/snapshot`, { method: "POST" }),
  getHistory:    (fileId)           => apiFetch(`/files/${fileId}/history`),
  restoreSnap:   (fileId, snapId)   => apiFetch(`/files/${fileId}/restore/${snapId}`, { method: "POST" }),
  execute:       (code, language)   => apiFetch("/execute", { method: "POST", body: JSON.stringify({ code, language }) }),
};