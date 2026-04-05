#  CollabEditor — Real-Time Collaborative Code Editor

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Monaco Editor](https://img.shields.io/badge/Monaco-Editor-purple?logo=visualstudiocode)
![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

> A production-ready, browser-based collaborative code editor where multiple developers can write, edit, and run code simultaneously in real time — like Google Docs, but for code.

---

##  Live Demo
 https://code-together-editor.netlify.app

---

##  Features

| Feature | Description |
|---|---|
|  **Authentication** | Secure JWT-based register & login system |
|  **Room System** | Create rooms, invite others via Room ID |
|  **Real-Time Editing** | Simultaneous editing with Operational Transformation (OT) |
|  **User Presence** | See who is online with colored badges |
|  **Live Chat** | Real-time chat panel alongside the editor |
|  **File Tree** | Create, switch and delete multiple files per room |
|  **Code Execution** | Run Python and JavaScript code directly in the browser |
|  **16 Languages** | Syntax highlighting for Python, JS, TS, Java, C++, Go, Rust and more |
|  **Version Snapshots** | Save and restore previous versions of your code |
|  **Version History** | Browse and restore past snapshots |
|  **Auto-Reconnect** | WebSocket auto-reconnects on disconnect |
|  **Room Sharing** | Copy and share Room ID with one click |

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11** | Core language |
| **FastAPI** | REST API + WebSocket server |
| **WebSockets** | Real-time bidirectional communication |
| **SQLAlchemy** | ORM for database models |
| **PostgreSQL** | Primary database |
| **Alembic** | Database migrations |
| **python-jose** | JWT token generation and validation |
| **passlib** | Password hashing |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|---|---|
| **HTML5 + CSS3** | Structure and styling |
| **Vanilla JavaScript** | Client-side logic |
| **Monaco Editor** | VS Code engine in the browser |
| **Native WebSocket API** | Real-time communication |
| **Fetch API** | REST API calls |

---

##  Project Structure
```
collab-editor/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── .env
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py
│   │   ├── rooms.py
│   │   ├── files.py
│   │   └── execute.py
│   ├── websocket/
│   │   ├── manager.py
│   │   └── ot_engine.py
│   └── migrations/
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── editor.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── dashboard.js
│       └── editor.js
└── README.md
```

---

## ⚙️ Setup and Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Node.js (for JavaScript execution)
- Git

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/ramya-sompalli/collab-editor.git
cd collab-editor
```

---

### 2️⃣ Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost/collab_editor
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

Create the database:
```bash
python -c "
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
conn = psycopg2.connect(host='localhost', user='postgres', password='YOUR_PASSWORD')
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
conn.cursor().execute('CREATE DATABASE collab_editor')
conn.close()
print('Database created!')
"
```

Run migrations:
```bash
alembic upgrade head
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```

Backend running at: http://localhost:8000

API docs at: http://localhost:8000/docs

---

### 3️⃣ Frontend Setup

1. Install the **Live Server** extension in VS Code
2. Right-click `frontend/index.html`
3. Click **Open with Live Server**

Frontend running at: http://127.0.0.1:5500/frontend/index.html

---

##  Usage

### 1. Register and Login
- Open the app in your browser
- Register a new account
- Login with your credentials

### 2. Create a Room
- Click **+ Create** on the dashboard
- Choose a room name and language
- You will be taken to the editor automatically

### 3. Invite Collaborators
- Click **Copy ID** in the editor top bar
- Share the Room ID with your team
- They paste it in **Join by Room ID** on the dashboard

### 4. Collaborate in Real Time
- Both users see each other's changes instantly
- Online users appear as colored badges in the top bar
- Use the chat panel to communicate

### 5. Run Code
- Write your code in the editor
- Click **Run** to execute
- Output appears in the terminal panel below

### 6. Save Versions
- Click **Snapshot** to save the current state
- Click **History** to browse and restore past versions

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login and get JWT token |
| POST | /rooms | Create a new room |
| GET | /rooms | List all your rooms |
| GET | /rooms/{id} | Get room details |
| POST | /rooms/join | Join a room by ID |
| GET | /files/{id} | Get file content |
| POST | /files | Create new file |
| DELETE | /files/{id} | Delete a file |
| POST | /files/{id}/snapshot | Save a snapshot |
| GET | /files/{id}/history | Get version history |
| POST | /files/{id}/restore/{snap_id} | Restore a snapshot |
| POST | /execute | Execute code |
| WS | /ws/{room_id}/{file_id} | WebSocket connection |

---

##  Supported Languages

| Language | Syntax Highlighting | Execution |
|---|---|---|
| Python | ✅ | ✅ |
| JavaScript | ✅ | ✅ Requires Node.js |
| TypeScript | ✅ | 🔜 Coming soon |
| Java | ✅ | ✅ Requires JDK |
| C++ | ✅ | ✅ Requires g++ |
| C | ✅ | ✅ Requires gcc |
| C# | ✅ | 🔜 Coming soon |
| Go | ✅ | ✅ Requires Go |
| Rust | ✅ | 🔜 Coming soon |
| PHP | ✅ | ✅ Requires PHP |
| Ruby | ✅ | ✅ Requires Ruby |
| SQL | ✅ | 🔜 Coming soon |
| HTML | ✅ | — |
| CSS | ✅ | — |
| JSON | ✅ | — |
| Markdown | ✅ | — |

---

##  Security Features

- JWT token authentication on all routes
- Password hashing with passlib
- CORS restricted to allowed origins
- WebSocket authentication via token query param
- Token expiry handling with auto redirect to login

---

##  Contributing

Contributions are welcome!
```bash
git checkout -b feature/your-feature-name
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

---

## 📄 License

This project is licensed under the MIT License.

---

##  Author

**Ramya Sompalli**

GitHub: https://github.com/ramya-sompalli

---

<div align="center">
  <b> Star this repo if you found it helpful!</b>
</div>
