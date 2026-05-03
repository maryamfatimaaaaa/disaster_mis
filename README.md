# 🚨 Smart Disaster Response MIS

A full-stack enterprise-grade Management Information System for national disaster response coordination. Built with **Node.js + Express**, **PostgreSQL**, and **React**.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Postman API Testing](#postman-api-testing)
- [User Roles & Credentials](#user-roles--credentials)
- [API Endpoints Reference](#api-endpoints-reference)
- [Project Structure](#project-structure)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

This system manages disaster response operations including:
- Real-time emergency incident reporting
- Rescue team dispatch and tracking
- Resource inventory and allocation
- Hospital capacity and patient management
- Financial management (donations & expenses)
- Approval workflows
- Full audit trail and logging
- Role-based access control (RBAC)

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Frontend   | React 18, React Router, Recharts, Lucide Icons |
| Backend    | Node.js, Express.js     |
| Database   | PostgreSQL 15+          |
| Auth       | JWT (JSON Web Tokens), bcryptjs |
| API Client | Axios                   |
| Dev Tools  | Nodemon, Postman        |

---

## System Architecture

```
Browser (localhost:3000)
        ↕  HTTP / REST API
Express Backend (localhost:5000)
        ↕  SQL queries (pg pool)
PostgreSQL Database (localhost:5432)
        ↕  disaster_mis database
```

---

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| PostgreSQL | v15+ | https://www.postgresql.org/download |
| pgAdmin 4 | Latest | https://www.pgadmin.org/download |
| Postman | Latest | https://www.postman.com/downloads |
| Git | Latest | https://git-scm.com |

Verify installations:
```bash
node -v        # should show v18.x or higher
npm -v         # should show 9.x or higher
psql --version # should show PostgreSQL 15.x or higher
```

---

## Database Setup

### Step 1 — Create the database

Open **Command Prompt** and run:

```bash
psql -U postgres
```

Enter your PostgreSQL password when prompted, then run:

```sql
CREATE DATABASE disaster_mis;
\q
```

### Step 2 — Run the SQL script

```bash
psql -U postgres -d disaster_mis -f "path\to\disaster_mis_complete.sql"
```

Replace `path\to\` with the actual path where `disaster_mis_complete.sql` is saved.

**Example on Windows:**
```bash
psql -U postgres -d disaster_mis -f "C:\Users\DELL\Documents\disaster_mis\disaster_mis_complete.sql"
```

### Step 3 — Set user passwords

The SQL script inserts placeholder password hashes. Run this to set real bcrypt passwords:

```bash
cd backend
node -e "const b = require('bcryptjs'); const { Pool } = require('pg'); const pool = new Pool({ host:'localhost', port:5432, database:'disaster_mis', user:'postgres', password:'postgres' }); b.hash('Admin@123', 10).then(hash => { pool.query('UPDATE users SET password_hash = $1', [hash]).then(() => { console.log('Done! All users password set to Admin@123'); pool.end(); }); });"
```

> **Note:** All 10 users will have the password `Admin@123` after this command.

### Step 4 — Verify data in pgAdmin

Open pgAdmin 4 → expand `disaster_mis` → **Schemas → public → Tables**

Right-click `users` → **View/Edit Data → All Rows**

You should see 10 users with their roles.

---

## Backend Setup

### Step 1 — Navigate to backend folder

```bash
cd disaster_mis/backend
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment variables

Create a `.env` file in the `backend` folder with this content:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=disaster_mis
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=disaster_mis_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development
```

> ⚠️ Change `DB_PASSWORD` to your actual PostgreSQL password.
> ⚠️ Never push `.env` to GitHub — it is in `.gitignore`.

### Step 4 — Start the backend

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:5000
Connected to PostgreSQL database
```

---

## Frontend Setup

### Step 1 — Create React app

```bash
cd disaster_mis
npx create-react-app frontend
cd frontend
```

### Step 2 — Install dependencies

```bash
npm install axios react-router-dom recharts react-hot-toast lucide-react
```

### Step 3 — Replace the src folder

Extract the frontend zip file provided. Copy all files from `disaster-mis/frontend/src/` into your `frontend/src/` folder, replacing all existing files.

Your `frontend/src/` should contain:

```
src/
├── api/
│   └── axios.js
├── context/
│   └── AuthContext.js
├── pages/
│   ├── Login.js
│   ├── Dashboard.js
│   ├── Reports.js
│   ├── Teams.js
│   ├── Resources.js
│   ├── Hospitals.js
│   ├── Financial.js
│   ├── Approvals.js
│   └── Audit.js
├── components/
│   └── common/
│       └── Layout.js
├── App.js
├── index.js
└── index.css
```

---

## Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — Start Backend

```bash
cd disaster_mis/backend
npm run dev
```

Expected output:
```
[nodemon] starting `node server.js`
Server running on http://localhost:5000
Connected to PostgreSQL database
```

### Terminal 2 — Start Frontend

```bash
cd disaster_mis/frontend
npm start
```

Expected output:
```
Compiled successfully!
Local: http://localhost:3000
```

### Open in Browser

```
http://localhost:3000
```

Login with:
```
Username: admin_user
Password: Admin@123
```

---

## Postman API Testing

### Setup

1. Download and install Postman from https://www.postman.com/downloads
2. Open Postman and skip onboarding (click Skip or get started)
3. Press `Ctrl + T` to open a new request tab

### Step 1 — Login to get token

```
Method: POST
URL:    http://localhost:5000/api/auth/login
```

Click **Body** → **raw** → select **JSON** from dropdown

Paste:
```json
{
    "username": "admin_user",
    "password": "Admin@123"
}
```

Click **Send**. Copy the `token` value from the response.

### Step 2 — Add token to requests

For all protected routes:

1. Click the **Authorization** tab
2. Select **Bearer Token** from the Type dropdown
3. Paste your token in the Token field

### Step 3 — Test endpoints

**Get all reports:**
```
Method: GET
URL:    http://localhost:5000/api/reports
Auth:   Bearer <your_token>
```

**Create a report:**
```
Method: POST
URL:    http://localhost:5000/api/reports
Auth:   Bearer <your_token>
Body (JSON):
{
    "location": "Lahore, Punjab",
    "disaster_type": "Flood",
    "severity_level": "Critical",
    "description": "Test report"
}
```

**Get financial summary:**
```
Method: GET
URL:    http://localhost:5000/api/financial/summary
Auth:   Bearer <your_token>
```

> ⚠️ Important: The browser URL bar always sends GET requests. Use Postman for POST, PUT, DELETE requests.

---

## User Roles & Credentials

All users have the same password: **Admin@123**

| Username | Role | Access |
|----------|------|--------|
| admin_user | Administrator | Full access — all pages |
| kamran_admin | Administrator | Full access — all pages |
| ali_operator | Emergency Operator | Reports, teams, resources, hospitals, approvals |
| sara_operator | Emergency Operator | Reports, teams, resources, hospitals, approvals |
| omar_field | Field Officer | View reports, update team status |
| hina_field | Field Officer | View reports, update team status |
| zain_warehouse | Warehouse Manager | Resources, warehouses, allocations, approvals |
| nadia_warehouse | Warehouse Manager | Resources, warehouses, allocations, approvals |
| bilal_finance | Finance Officer | Donations, expenses, financial summary |
| ayesha_finance | Finance Officer | Donations, expenses, financial summary |

---

## API Endpoints Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login and get JWT token |
| POST | /api/auth/logout | Yes | Logout and log action |
| GET | /api/auth/me | Yes | Get current user info |
| GET | /api/auth/users | Admin | Get all users |
| POST | /api/auth/register | Admin | Create new user |

### Emergency Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/reports | Yes | Get all reports (filterable) |
| GET | /api/reports/:id | Yes | Get single report |
| POST | /api/reports | Operator+ | Create new report |
| PUT | /api/reports/:id | Operator+ | Update report status |
| GET | /api/reports/stats/summary | Yes | Dashboard statistics |

### Rescue Teams

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/teams | Yes | Get all teams |
| GET | /api/teams/:id | Yes | Get single team |
| POST | /api/teams | Admin | Create team |
| PUT | /api/teams/:id | Admin/Field | Update team |
| POST | /api/teams/assign | Operator+ | Assign team to report |
| PUT | /api/teams/assignments/:id/complete | Operator+ | Complete assignment |
| GET | /api/teams/:id/assignments | Yes | Team assignment history |

### Resources & Warehouses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/resources | Yes | Get all resources |
| GET | /api/resources/:id | Yes | Get single resource |
| POST | /api/resources | Warehouse+ | Create resource |
| PUT | /api/resources/:id | Warehouse+ | Update resource |
| GET | /api/resources/stock/summary | Yes | Stock by type |
| GET | /api/resources/warehouses | Yes | Get all warehouses |
| POST | /api/resources/warehouses | Warehouse+ | Create warehouse |

### Resource Allocations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/allocations | Yes | Get all allocations |
| POST | /api/allocations | Operator+ | Request allocation |
| PUT | /api/allocations/:id/approve | Warehouse+ | Approve + deduct stock |
| PUT | /api/allocations/:id/reject | Warehouse+ | Reject allocation |

### Hospitals & Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/hospitals/hospitals | Yes | Get all hospitals |
| GET | /api/hospitals/hospitals/:id | Yes | Get single hospital |
| POST | /api/hospitals/hospitals | Admin | Create hospital |
| PUT | /api/hospitals/hospitals/:id | Admin | Update hospital |
| GET | /api/hospitals/patients | Yes | Get all patients |
| POST | /api/hospitals/patients | Operator+ | Admit patient |
| PUT | /api/hospitals/patients/:id | Operator+ | Update patient status |

### Financial

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/financial/summary | Finance+ | Financial overview |
| GET | /api/financial/donations | Finance+ | All donations |
| POST | /api/financial/donations | Finance+ | Record donation |
| GET | /api/financial/expenses | Finance+ | All expenses |
| POST | /api/financial/expenses | Finance+ | Record expense |
| PUT | /api/financial/expenses/:id/approve | Admin | Approve expense |

### Approvals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/approvals | Yes | Get all requests |
| POST | /api/approvals | Yes | Create request |
| PUT | /api/approvals/:id/action | Admin/Finance/Warehouse | Approve or reject |

### Audit Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/audit | Admin | Get all audit logs |
| GET | /api/audit/summary | Admin | Audit summary stats |

---

## Project Structure

```
disaster_mis/
├── backend/
│   ├── config/
│   │   └── db.js                  # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   └── rbac.js                # Role-based access control
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── reports.routes.js
│   │   ├── teams.routes.js
│   │   ├── resources.routes.js
│   │   ├── allocations.routes.js
│   │   ├── hospitals.routes.js
│   │   ├── financial.routes.js
│   │   ├── approvals.routes.js
│   │   └── audit.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── reports.controller.js
│   │   ├── teams.controller.js
│   │   ├── resources.controller.js
│   │   ├── allocations.controller.js
│   │   ├── hospitals.controller.js
│   │   ├── financial.controller.js
│   │   ├── approvals.controller.js
│   │   └── audit.controller.js
│   ├── .env                       # Environment variables (not in git)
│   ├── .env.example               # Template for .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js                  # Entry point
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── api/
│       │   └── axios.js           # Axios instance + interceptors
│       ├── context/
│       │   └── AuthContext.js     # Auth state management
│       ├── components/
│       │   └── common/
│       │       └── Layout.js      # Sidebar navigation
│       ├── pages/
│       │   ├── Login.js
│       │   ├── Dashboard.js       # Charts and stats
│       │   ├── Reports.js
│       │   ├── Teams.js
│       │   ├── Resources.js
│       │   ├── Hospitals.js
│       │   ├── Financial.js
│       │   ├── Approvals.js
│       │   └── Audit.js
│       ├── App.js                 # Router setup
│       ├── index.js
│       └── index.css              # Global design system
│
└── disaster_mis_complete.sql      # Full database script
```

---

## Features

### Database (PostgreSQL)
- 14 normalized tables (3NF)
- 8 triggers for automation (stock deduction, team status, audit logging, bed count)
- 6 role-specific views
- 20 indexes (single-column + composite) for performance
- ACID transactions for all multi-step operations
- Full audit trail

### Backend (Node.js + Express)
- JWT authentication with 24h expiry
- Role-based access control middleware
- 9 route modules with full CRUD
- Transaction handling with BEGIN/COMMIT/ROLLBACK
- Input validation and error handling
- Concurrency-safe stock deduction (row-level locking)

### Frontend (React)
- Dark-themed professional UI
- Role-based navigation (menus hide based on user role)
- Live charts (bar charts, pie charts) using Recharts
- All data loaded from real API — no hardcoded values
- Toast notifications for success and error feedback
- Modal forms for create operations
- Filter and search on all tables
- Responsive layout with collapsible sidebar

---

## Troubleshooting

### "Cannot connect to database"
- Check `DB_PASSWORD` in `.env` matches your PostgreSQL password
- Make sure PostgreSQL service is running
- Verify database name: `psql -U postgres -l` to list databases

### "Invalid username or password" on login
- Run the password reset command in the Database Setup Step 3
- Make sure you ran the SQL script first to insert users

### "Cannot GET /api/auth/login" in browser
- This is normal — login is a POST request
- Use Postman to test POST endpoints

### Frontend shows blank page
- Check both backend (port 5000) and frontend (port 3000) are running
- Open browser console (F12) and check for errors
- Make sure `src/` folder was replaced correctly

### CORS error in browser
- Backend must be running on port 5000
- Frontend must be running on port 3000
- Do not change these ports without updating `server.js` CORS config

### "Module not found" errors
- Run `npm install` in both `backend/` and `frontend/` folders

### Port already in use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

---

## Quick Start Summary

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE disaster_mis;"

# 2. Run SQL script
psql -U postgres -d disaster_mis -f disaster_mis_complete.sql

# 3. Setup backend
cd backend
npm install
# Edit .env with your DB password
npm run dev

# 4. Set passwords (new terminal)
node -e "const b=require('bcryptjs');const{Pool}=require('pg');const p=new Pool({host:'localhost',port:5432,database:'disaster_mis',user:'postgres',password:'postgres'});b.hash('Admin@123',10).then(h=>{p.query('UPDATE users SET password_hash=$1',[h]).then(()=>{console.log('Done');p.end()})});"

# 5. Setup frontend (new terminal)
cd ../frontend
npm install
npm start

# 6. Open browser
# http://localhost:3000
# Login: admin_user / Admin@123
```

---

*Smart Disaster Response MIS — Database Systems Project*
