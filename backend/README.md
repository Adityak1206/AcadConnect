# AcadConnect Backend — Step 1: Environment & Database Setup

## Folder Structure

```
backend/
├── docker-compose.yml          # PostgreSQL 15 + MongoDB 7
├── .env.example                # Copy to .env and fill values
├── services/
│   ├── user-service/           # Auth, profiles, admin (port 3001)
│   │   ├── package.json
│   │   ├── knexfile.js
│   │   └── src/
│   │       ├── index.js        # Express entry point
│   │       ├── db/knex.js      # Knex singleton
│   │       └── migrations/     # 001–006 SQL schema files
│   └── project-service/        # Projects, requests, milestones (port 3002)
│       ├── package.json
│       └── src/index.js
└── README.md
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js 20+](https://nodejs.org/) and npm

## Quick Start

### 1. Configure environment

```bash
cd backend
cp .env.example .env
# Open .env and update passwords and secrets
```

> **Do not** commit `.env` to version control. It is already in `.gitignore`.

### 2. Start databases

```bash
docker compose up -d
docker compose ps          # both postgres and mongo should show "Up (healthy)"
```

### 3. Install dependencies

```bash
# User Service
cd services/user-service
npm install

# Project Service
cd ../project-service
npm install
```

### 4. Run database migrations

```bash
# From services/user-service
npx knex migrate:latest
```

Expected output:

```
Batch 1 run: 6 migrations
001_create_users.js
002_create_student_profiles.js
003_create_faculty_profiles.js
004_create_projects.js
005_create_project_requests.js
006_create_progress.js
```

### 5. Verify tables

```bash
docker exec -it acadconnect-postgres psql -U acadconnect -d acadconnect -c "\dt"
```

Expected: `users`, `student_profiles`, `faculty_profiles`, `projects`, `project_requests`, `progress`

### 6. Start services

```bash
# Terminal 1 — User Service
cd services/user-service && npm run dev

# Terminal 2 — Project Service
cd services/project-service && npm run dev
```

Health checks:

```bash
curl http://localhost:3001/health   # {"status":"ok","service":"user-service","db":"connected"}
curl http://localhost:3002/health   # {"status":"ok","service":"project-service"}
```

## Database Schema Overview

```
users
  └─< student_profiles  (eligibility_status: eligible | probation | ineligible)
  └─< faculty_profiles  (max_capacity, research_areas[])
  └─< projects          (status: open | in_progress | closed)
        └─< project_requests  (snippet, status: pending | accepted | rejected, feedback_ref→MongoDB)
        └─< progress          (milestones: title, due_date, completed)
```

> `faculty_profiles` has **no** `current_mentees` counter. Mentee count and list
> are derived at query time via `project_requests JOIN projects WHERE status='accepted'`.

## Tech Stack

| Layer | Technology |
|---|---|
| Databases | PostgreSQL 15, MongoDB 7 |
| ORM/Migrations | Knex.js |
| Runtime | Node.js 20 / Express 4 |
| Containerisation | Docker Compose |
