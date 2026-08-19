# Employee Seating Management System

A full-stack app for viewing and managing office seat assignments, with an
AI-powered admin assistant that reassigns seats from plain-English instructions.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`), file-based, auto-seeded on first run
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **AI:** [Groq](https://console.groq.com) (free, OpenAI-compatible API), used to turn
  natural-language admin instructions into structured seat-assignment actions

## Features

1. **Seating chart** (`/`) — every seat across floors/wings, color-coded
   occupied/vacant, searchable by employee or seat code, filterable by
   department. Click a seat to manually assign/vacate it.
2. **AI admin panel** (`/admin.html`) — type an instruction like *"Move Priya
   Nair to seat F1-N-2"* or *"Unassign Sneha Iyer from her seat"*. The
   assistant matches the employee/seat against the current roster, applies
   the change, and logs it to the activity feed.

## Local setup

```bash
git clone <your-repo-url>
cd employee-seating-management
npm install
cp .env.example .env
# edit .env and add your GROQ_API_KEY (free at https://console.groq.com/keys)
npm start
```

Visit `http://localhost:3000`. The SQLite database is created and seeded
automatically on first boot (10 demo employees, 24 seats across 2 floors).

## Environment variables

| Variable        | Required | Description                                      |
|-----------------|----------|---------------------------------------------------|
| `PORT`          | No       | Defaults to 3000 (Railway sets this automatically) |
| `GROQ_API_KEY`  | Yes      | Free key from https://console.groq.com/keys        |
| `GROQ_MODEL`    | No       | Defaults to `llama-3.3-70b-versatile`               |

## Deploying to Railway

1. Push this repo to GitHub (see below).
2. On [railway.app](https://railway.app), click **New Project → Deploy from
   GitHub repo** and select this repository.
3. Once the service is created, open its **Variables** tab and add:
   - `GROQ_API_KEY` = your key from https://console.groq.com/keys
4. Railway auto-detects Node via Nixpacks and runs `npm start`. No further
   build config is needed (a `railway.json` and `Procfile` are included for
   clarity).
5. Under **Settings → Networking**, click **Generate Domain** to get your
   public URL.

**Note on persistence:** the SQLite file lives in the container's
filesystem, which resets on redeploy. For a demo/assignment this is fine
(the app reseeds automatically). For real persistence, attach a
[Railway Volume](https://docs.railway.app/reference/volumes) mounted at
`/app/data`.

## API reference

| Method | Endpoint                  | Description                                  |
|--------|----------------------------|-----------------------------------------------|
| GET    | `/api/employees`           | List all employees                            |
| GET    | `/api/seats`                | List all seats with occupant info             |
| GET    | `/api/seats/activity`       | Recent assignment activity log                |
| PUT    | `/api/seats/:id/assign`     | Manually assign/vacate a seat `{ employeeId }` |
| POST   | `/api/ai/command`           | Run a natural-language instruction `{ prompt }` |

## Project structure

```
├── server.js            # Express app entry point
├── db/
│   ├── database.js      # SQLite connection + schema
│   └── seed.js           # Demo data seeding (idempotent)
├── routes/
│   ├── employees.js
│   ├── seats.js
│   └── ai.js              # Groq-powered natural-language seat assignment
├── public/
│   ├── index.html          # Seating chart
│   ├── admin.html          # AI admin panel
│   ├── css/style.css
│   └── js/{app.js, admin.js}
├── railway.json
├── Procfile
└── .env.example
```
