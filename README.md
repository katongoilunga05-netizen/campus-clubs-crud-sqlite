# Campus Clubs CRUD App (ICT251 Activity 4)

Chosen theme: **Question 1 - Campus Club Profile** (resource: `clubs`, table: `clubs`).
Stack: Node.js + Express REST API, SQLite database, plain HTML/JavaScript frontend.

```
campus-clubs-crud/
├─ backend/
│  ├─ .env              environment variables (PORT, DB_FILE)
│  ├─ package.json
│  ├─ schema.sql        Part A: the single `clubs` table
│  ├─ seed.sql          11 sample records (INSERT statements)
│  ├─ db.js             opens SQLite, runs schema, seeds if empty
│  └─ server.js         Part B: Express API
├─ frontend/
│  ├─ index.html        Part C: form + table
│  └─ app.js            fetch() calls to the API
└─ Campus-Clubs-API.postman_collection.json
```

## 1. Run it locally (PowerShell)

```powershell
cd backend
npm install
npm start
```

Open http://localhost:3000. The server also serves the frontend, so the page and API share one URL.
The database file is created automatically in `backend/data/` and filled with the sample records on first start.

## 2. Table (Part A)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| name | TEXT NOT NULL | max 120 chars (checked by API + DB) |
| category, description, meeting_day, venue, president_name, contact_email | TEXT | the 6 extra fields |
| member_count | INTEGER NOT NULL DEFAULT 0 | must be 0 or more |
| created_at | DATETIME | default CURRENT_TIMESTAMP |
| updated_at | DATETIME | default CURRENT_TIMESTAMP, refreshed on every update |

The brief's field list uses MySQL types; SQLite equivalents are used because the brief asks for SQLite
(`VARCHAR(n)` becomes `TEXT` with the length enforced in the API).

## 3. Endpoints (Part B)

| Method | URL | Success | Errors |
|---|---|---|---|
| GET | /api/clubs | 200 + array | |
| GET | /api/clubs/:id | 200 + object | 400 bad id, 404 |
| POST | /api/clubs | 201 + created object | 400 validation |
| PUT | /api/clubs/:id | 200 + updated object | 400, 404 |
| DELETE | /api/clubs/:id | 200 + `{message, deleted}` | 400, 404 |

Example POST body:

```json
{
  "name": "Mulungushi Quiz Club",
  "category": "Academic",
  "description": "Weekly general-knowledge quizzes.",
  "meeting_day": "Friday",
  "venue": "Library Seminar Room",
  "president_name": "Ruth Kasonde",
  "contact_email": "quiz@example.com",
  "member_count": 12
}
```

All responses are JSON (including errors). CORS is enabled. Config comes from `.env`.

## 4. Postman evidence (video)

1. Postman > Import > `Campus-Clubs-API.postman_collection.json`.
2. Make sure `baseUrl` (collection variable) is your local or deployed URL.
3. Start screen recording, then send the requests **in order**: 1 GET all, 2 GET one, 3 POST, 4 PUT, 5 DELETE.
   For each one, pause on the URL, method, request body and JSON response, and the green test results.
4. Optionally send the two "Extra" requests to show error handling.

Tip: **Collection > Run** runs all seven in one go and shows every test passing.

## 5. Deploy to the cloud (Render, free tier)

1. Push this folder to a GitHub repository (`.env` and `data/` are git-ignored).
2. On https://render.com choose **New > Web Service** and connect the repo.
3. Settings: **Root Directory** `backend`, **Build Command** `npm install`, **Start Command** `npm start`.
4. Add environment variables: `DB_FILE=./data/campus_clubs.db`, `SEED_ON_START=true`.
5. After deploy you get `https://<your-app>.onrender.com`. Your submission links are:
   - GET all: `https://<your-app>.onrender.com/api/clubs`
   - GET one: `https://<your-app>.onrender.com/api/clubs/1`
   - POST / PUT / DELETE: same URLs with the matching method (see the Postman collection; set `baseUrl` to the Render URL)
   - Frontend: `https://<your-app>.onrender.com/`
6. Paste the links into the Google Form.

Notes on the free tier: the service sleeps after inactivity (first request takes ~30-60 s to wake),
and the SQLite file resets on each redeploy or restart. That is fine for marking because sample data is
re-seeded automatically, but records you add are not permanent. Test your deployed URLs shortly before
submitting and record the Postman video against them.

## 6. Quick checks if something fails

- `npm install` errors about building `better-sqlite3`: use Node 18 or 20 LTS (https://nodejs.org).
- Port in use: change `PORT` in `.env`.
- Page says "Cannot reach the API": the server is not running, or open the page via http://localhost:3000 rather than double-clicking the file.
