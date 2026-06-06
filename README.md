# CastLink 🎬

A full-stack **actor-hiring marketplace** — the middleman between talent and production.
Producers post castings, actors build cinematic profiles, both sides search and apply,
and everyone can message directly through the platform.

---

## Features

**For Actors**
- Sign up and build a rich profile (headshot upload, bio, skills, languages, rate, showreel, availability)
- Get listed in a searchable talent directory
- Browse open castings and apply with a cover note
- Track application status (pending / shortlisted / passed)
- Direct messaging with producers

**For Producers**
- Post casting calls with role details, pay, age range, deadlines
- Browse and filter the talent directory
- Review applicants per casting, shortlist or pass
- Open/close/delete your postings from a dashboard
- Message actors directly

**Platform**
- JWT authentication (actors & producers)
- Two-sided messaging inbox with threads & unread counts
- Search + filters on both talent and castings
- File uploads for headshots
- Live homepage stats

---

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Backend   | Node.js + Express 5 |
| Auth      | JWT (`jsonwebtoken`) + `bcryptjs` |
| Storage   | JSON file datastore (`backend/db/data.json`) — zero native deps, fully portable |
| Uploads   | `multer` → `public/uploads/` |
| Frontend  | Vanilla JS single-page app (hash router), no build step |
| Styling   | Hand-written CSS — cinematic editorial theme (Fraunces + Archivo) |

> The datastore is a single JSON file so the project runs **anywhere with Node, no database or compiler required**. To move to a real DB later, swap the implementation in `backend/db.js` — the API layer stays unchanged.

---

## Getting started

```bash
cd backend
npm install
node server.js
```

Then open **http://localhost:4000**

### Seed demo data (optional)
With the server running, in another terminal:

```bash
cd backend
node seed.js
```

This creates 6 sample actors, 3 producers, and 5 castings.

**Demo logins** (password for all: `secret1`)
- Actor: `maya@cl.com`
- Producer: `reel@cl.com`

---

## Project structure

```
castlink/
├── backend/
│   ├── server.js      # Express app + all REST routes
│   ├── db.js          # JSON-file datastore
│   ├── seed.js        # Demo data generator
│   └── db/data.json   # Auto-created datastore
└── public/
    ├── index.html     # SPA shell
    ├── styles.css     # Cinematic theme
    └── app.js         # SPA logic + router + all views
```

## API overview

```
POST /api/auth/register        POST /api/auth/login        GET /api/auth/me
GET  /api/actors               GET  /api/actors/:id        PUT /api/actors/me
POST /api/upload               GET  /api/stats
GET  /api/jobs                 GET  /api/jobs/:id          POST /api/jobs
PUT  /api/jobs/:id             DELETE /api/jobs/:id        GET /api/my/jobs
POST /api/jobs/:id/apply       GET  /api/jobs/:id/applications
GET  /api/my/applications      PUT  /api/applications/:id
POST /api/messages             GET  /api/messages          PUT /api/messages/read/:otherUserId
```

## Production notes
- Set `JWT_SECRET` and `PORT` via environment variables.
- For real scale, replace `db.js` with PostgreSQL/MongoDB and move uploads to S3 or similar.
- Add rate limiting and input validation middleware before going live.
