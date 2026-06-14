# Volunteer Registration System

A production-ready full-stack volunteer management app with React, Tailwind CSS, Node.js, Express, MongoDB Atlas, JWT authentication, role-based dashboards, report exports, Docker support, CI, and deployment configs for Vercel and Render.

## Features

- Public landing page with About, Events, Contact, and volunteer registration
- JWT + bcrypt authentication, protected routes, role-based volunteer/admin access
- Forgot/reset password via email OTP
- Volunteer dashboard for profile editing, event registration, applications, password changes, ID card, and notifications
- Admin dashboard for statistics, volunteer CRUD, approvals/rejections, event CRUD, attendance, bulk actions, broadcasts, tags, and report downloads
- MongoDB models for users, volunteers, events, registrations, notifications, categories, skills, and activity logs
- Downloadable PDF, CSV, and Excel reports
- Helmet, CORS, rate limiting, upload controls, validation through schema requirements, and environment-based secrets
- Docker Compose for local full-stack runs
- GitHub Actions CI for backend tests, frontend lint, and frontend production build

## Project Structure

```text
client/                 React + Vite + Tailwind frontend
server/                 Express + MongoDB API
docs/API.md             REST API reference
docker-compose.yml      Local container orchestration
render.yaml             Render backend blueprint
client/vercel.json      Vercel SPA routing config
.github/workflows/ci.yml
```

## Local Development

1. Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

2. Configure the backend:

```bash
cd server
cp .env.example .env
```

For MongoDB Atlas, set `USE_MOCK_DB=false` and `MONGODB_URI` to your Atlas connection string. For a quick local demo without MongoDB, keep `USE_MOCK_DB=true`.

3. Seed sample data:

```bash
cd server
npm run seed
```

Seed credentials:

- Admin: `admin@volunteersystem.com` / `AdminPass123!`
- Approved volunteer: `volunteer@volunteersystem.com` / `VolunteerPass123!`
- Pending volunteer: `pending@volunteersystem.com` / `VolunteerPass123!`

4. Run the apps:

```bash
cd server && npm run dev
cd client && npm run dev
```

Frontend: `http://localhost:3004`  
Backend health: `http://localhost:5004/api/health`

## Verification

```bash
cd server && npm test
cd client && npm run lint
cd client && npm run build
```

## Docker

```bash
docker compose up --build
```

The compose file runs MongoDB, the API on port `5004`, and the frontend on port `3004`.

## Deployment

### Backend on Render

- Create a Render Web Service from this repo or use `render.yaml`.
- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Set environment variables:
  - `NODE_ENV=production`
  - `USE_MOCK_DB=false`
  - `MONGODB_URI=<MongoDB Atlas URI>`
  - `JWT_SECRET=<strong secret>`
  - `JWT_EXPIRE=30d`
  - `CLIENT_URL=<Vercel frontend URL>`
  - SMTP variables if email sending is enabled

### Frontend on Vercel

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL=<Render backend URL>`

## API Documentation

See [docs/API.md](docs/API.md).
