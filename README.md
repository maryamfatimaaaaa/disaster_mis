# 🚨 Smart Disaster Response MIS

A full-stack enterprise-grade Management Information System for national disaster response coordination.
Built with **Node.js + Express**, **Microsoft SQL Server**, and **React**.

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

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Frontend   | React 18, React Router, Recharts, Lucide Icons |
| Backend    | Node.js v22, Express.js                        |
| Database   | Microsoft SQL Server Express                   |
| DB Driver  | mssql (tedious)                                |
| Auth       | JWT (jsonwebtoken), bcryptjs                   |
| Dev Tools  | Nodemon, Postman, SSMS                         |

---

## System Architecture

```
Browser (localhost:3000)
        ↕  HTTP / REST API
Express Backend (localhost:5000)
        ↕  mssql driver (TCP/IP port 1433)
SQL Server (localhost\SQLEXPRESS)
        ↕
disaster_mis database
```

---

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| SQL Server Express | 2019 / 2022 | https://www.microsoft.com/en-us/sql-server/sql-server-downloads |
| SSMS | Latest | https://aka.ms/ssmsfullsetup |
| Postman | Latest | https://www.postman.com/downloads |
| Git | Latest | https://git-scm.com |

Verify Node.js installation:
```bash
node -v    # should show v18.x or higher
npm -v     # should show 9.x or higher
```

---

## Database Setup

### Step 1 — Enable TCP/IP in SQL Server

Node.js connects to SQL Server over TCP/IP. This must be enabled first.

1. Open **SQL Server Configuration Manager**
2. Expand **SQL Server Network Configuration**
3. Click **Protocols for SQLEXPRESS**
4. Right-click **TCP/IP** → **Enable**
5. Right-click **TCP/IP** → **Properties** → click **IP Addresses** tab
6. Scroll to the bottom → find **IPAll**
7. Clear **TCP Dynamic Ports** field (delete any number there)
8. Set **TCP Port** to `1433`
9. Click **OK**
10. Go to **SQL Server Services**
11. Right-click **SQL Server (SQLEXPRESS)** → **Restart**

### Step 2 — Run the SQL script in SSMS

1. Open **SSMS**
2. Connect using:
   - Server name: `localhost\SQLEXPRESS`
   - Authentication: **Windows Authentication**
3. Go to **File → Open → disaster_mis_sqlserver_fixed.sql**
4. Press **F5** to run the entire script

You should see these messages in the output panel:
```
All tables created successfully.
All indexes created successfully.
All views created successfully.
All triggers created successfully.
All sample data inserted successfully.
Transaction 1: Resource allocation committed.
Transaction 2: Team assigned successfully.
Transaction 3: Expense approved and logged.
Transaction 4: Patient admitted, bed decremented.
Transaction 5 rolled back (expected): Insufficient stock...
All scripts executed successfully!
```

### Step 3 — Set user passwords

The SQL script inserts placeholder password hashes. Set real bcrypt passwords using this two-step process:

**Step 3a** — Generate a bcrypt hash. Run this in Command Prompt inside the `backend` folder:
```cmd
node -e "const b=require('bcryptjs');b.hash('Admin@123',10).then(h=>console.log(h));"
```

Copy the printed hash (starts with `$2b$10$...`).

**Step 3b** — Run this in SSMS Query Tool (paste your actual hash):
```sql
USE disaster_mis;
UPDATE users SET password_hash = '$2b$10$PASTE_YOUR_HASH_HERE';
GO
```

> **Note:** All 10 users will have the password `Admin@123` after this.

### Step 4 — Verify data in SSMS

Expand `disaster_mis` → **Tables** → right-click `users` → **Select Top 1000 Rows**

You should see 10 users with their roles.

---

## Backend Setup

### Step 1 — Navigate to backend folder

```cmd
cd disaster_mis\backend
```

### Step 2 — Install dependencies

```cmd
npm install
```

### Step 3 — Configure environment variables

Open the `.env` file in the `backend` folder and make sure it contains:

```env
# Database
DB_HOST=localhost\SQLEXPRESS
DB_PORT=1433
DB_NAME=disaster_mis
DB_USER=
DB_PASSWORD=

# JWT
JWT_SECRET=disaster_mis_super_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development
```

> **Note:** `DB_USER` and `DB_PASSWORD` are left empty because we use Windows Authentication.
> Windows Authentication uses your current Windows login — no username or password needed.
> Never push `.env` to GitHub — it is in `.gitignore`.

### Step 4 — Start the backend

```cmd
npm run dev
```

You should see:
```
[nodemon] starting `node server.js`
Server running on http://localhost:5000
Connected to SQL Server database
```

---

## Frontend Setup

### Step 1 — Create the React app

```cmd
cd disaster_mis
npx create-react-app frontend
cd frontend
```

### Step 2 — Install dependencies

```cmd
npm install axios react-router-dom recharts react-hot-toast lucide-react
```

### Step 3 — Add the source files

Copy all files from the provided `frontend/src/` folder into your `frontend/src/` directory.

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

```cmd
cd disaster_mis\backend
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
Connected to SQL Server database
```

### Terminal 2 — Start Frontend

```cmd
cd disaster_mis\frontend
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
2. Open Postman and skip the onboarding screens
3. Press `Ctrl + T` to open a new request tab

### Step 1 — Login to get token

```
Method: POST
URL:    http://localhost:5000/api/auth/login
```

Click **Body** → **raw** → select **JSON** from the dropdown

Paste this:
```json
{
    "username": "admin_user",
    "password": "Admin@123"
}
```

Click **Send**. Copy the `token` value from the response.

### Step 2 — Add token to protected requests

For all protected routes:

1. Click the **Authorization** tab (below the URL bar)
2. Select **Bearer Token** from the Type dropdown
3. Paste your token in the Token field

### Step 3 — Test example endpoints

**Get all reports:**
```
Method: GET
URL:    http://localhost:5000/api/reports
Auth:   Bearer <your_token>
```

**Create a new report:**
```
Method: POST
URL:    http://localhost:5000/api/reports
Auth:   Bearer <your_token>
Body (raw JSON):
{
    "location": "Lahore, Punjab",
    "disaster_type": "Flood",
    "severity_level": "Critical",
    "description": "Severe flooding in residential area"
}
```

**Get financial summary:**
```
Method: GET
URL:    http://localhost:5000/api/financial/summary
Auth:   Bearer <your_token>
```

**Assign a rescue team:**
```
Method: POST
URL:    http://localhost:5000/api/teams/assign
Auth:   Bearer <your_token>
Body (raw JSON):
{
    "report_id": 1,
    "team_id": 1
}
```

> ⚠️ **Important:** The browser URL bar always sends GET requests.
> Typing a URL in the browser will show "Cannot GET" for POST endpoints — this is normal.
> Always use Postman for POST, PUT, and DELETE requests.

---

## User Roles & Credentials

All users have the same password: **Admin@123**

| Username | Role | Access Level |
|----------|------|--------------|
| admin_user | Administrator | Full access — all pages and operations |
| kamran_admin | Administrator | Full access — all pages and operations |
| ali_operator | Emergency Operator | Reports, teams, resources, hospitals, approvals |
| sara_operator | Emergency Operator | Reports, teams, resources, hospitals, approvals |
| omar_field | Field Officer | View reports, update team assignment status |
| hina_field | Field Officer | View reports, update team assignment status |
| zain_warehouse | Warehouse Manager | Resources, warehouses, allocation approvals |
| nadia_warehouse | Warehouse Manager | Resources, warehouses, allocation approvals |
| bilal_finance | Finance Officer | Donations, expenses, financial summary |
| ayesha_finance | Finance Officer | Donations, expenses, financial summary |

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/auth/login | No | Login and receive JWT token |
| POST | /api/auth/logout | Yes | Logout and log action |
| GET | /api/auth/me | Yes | Get current user info |
| GET | /api/auth/users | Admin only | Get all system users |
| POST | /api/auth/register | Admin only | Create new user |

### Emergency Reports

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/reports | Yes | Get all reports (supports filters) |
| GET | /api/reports/:id | Yes | Get single report by ID |
| POST | /api/reports | Admin, Operator | Submit new emergency report |
| PUT | /api/reports/:id | Admin, Operator, Field | Update report status |
| GET | /api/reports/stats/summary | Yes | Dashboard statistics |

### Rescue Teams

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/teams | Yes | Get all teams |
| GET | /api/teams/:id | Yes | Get single team |
| POST | /api/teams | Admin | Create new team |
| PUT | /api/teams/:id | Admin, Field | Update team details |
| POST | /api/teams/assign | Admin, Operator | Assign team to report |
| PUT | /api/teams/assignments/:id/complete | Admin, Operator, Field | Mark assignment complete |
| GET | /api/teams/:id/assignments | Yes | Team assignment history |

### Resources & Warehouses

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/resources | Yes | Get all resources |
| GET | /api/resources/:id | Yes | Get single resource |
| POST | /api/resources | Admin, Warehouse | Create new resource |
| PUT | /api/resources/:id | Admin, Warehouse | Update resource |
| GET | /api/resources/stock/summary | Yes | Stock summary by type |
| GET | /api/resources/warehouses | Yes | Get all warehouses |
| POST | /api/resources/warehouses | Admin, Warehouse | Create new warehouse |

### Resource Allocations

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/allocations | Yes | Get all allocations |
| POST | /api/allocations | Admin, Operator, Warehouse | Request resource allocation |
| PUT | /api/allocations/:id/approve | Admin, Warehouse | Approve and deduct stock |
| PUT | /api/allocations/:id/reject | Admin, Warehouse | Reject allocation |

### Hospitals & Patients

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/hospitals/hospitals | Yes | Get all hospitals with capacity |
| GET | /api/hospitals/hospitals/:id | Yes | Get single hospital |
| POST | /api/hospitals/hospitals | Admin | Add new hospital |
| PUT | /api/hospitals/hospitals/:id | Admin | Update hospital details |
| GET | /api/hospitals/patients | Yes | Get all patients |
| POST | /api/hospitals/patients | Admin, Operator | Admit new patient |
| PUT | /api/hospitals/patients/:id | Admin, Operator | Update patient status |

### Financial Management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/financial/summary | Admin, Finance | Financial overview with charts data |
| GET | /api/financial/donations | Admin, Finance | Get all donations |
| POST | /api/financial/donations | Admin, Finance | Record new donation |
| GET | /api/financial/expenses | Admin, Finance | Get all expenses |
| POST | /api/financial/expenses | Admin, Finance | Record new expense |
| PUT | /api/financial/expenses/:id/approve | Admin | Approve pending expense |

### Approvals

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/approvals | Yes | Get all approval requests |
| POST | /api/approvals | Yes | Create new approval request |
| PUT | /api/approvals/:id/action | Admin, Warehouse, Finance | Approve or reject request |

### Audit Logs

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/audit | Admin only | Get all audit logs (latest 500) |
| GET | /api/audit/summary | Admin only | Audit summary by action type |

---

## Project Structure

```
disaster_mis/
├── backend/
│   ├── config/
│   │   └── db.js                    # SQL Server connection pool (mssql)
│   ├── middleware/
│   │   ├── auth.js                  # JWT token verification
│   │   └── rbac.js                  # Role-based access control
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
│   ├── .env                         # Environment variables (not in git)
│   ├── .env.example                 # Template for .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js                    # Entry point
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── api/
│       │   └── axios.js             # Axios instance with interceptors
│       ├── context/
│       │   └── AuthContext.js       # Auth state management
│       ├── components/
│       │   └── common/
│       │       └── Layout.js        # Sidebar navigation
│       ├── pages/
│       │   ├── Login.js
│       │   ├── Dashboard.js         # Charts and statistics
│       │   ├── Reports.js
│       │   ├── Teams.js
│       │   ├── Resources.js
│       │   ├── Hospitals.js
│       │   ├── Financial.js
│       │   ├── Approvals.js
│       │   └── Audit.js
│       ├── App.js                   # Router setup
│       ├── index.js
│       └── index.css                # Global design system
│
└── disaster_mis_sqlserver_fixed.sql # Complete SQL Server database script
```

---

## Features

### Database (SQL Server)
- 14 normalized tables in 3NF
- 8 triggers using INSERTED/DELETED tables for automation
- 6 role-specific views with ISNULL null-safe arithmetic
- 24 indexes (14 clustered PKs + non-clustered + composite)
- ACID transactions using BEGIN TRANSACTION / TRY...CATCH / ROLLBACK
- Full audit trail with automatic logging via triggers

### Backend (Node.js + Express)
- JWT authentication with 24-hour expiry
- Role-based access control middleware (5 roles)
- 9 route modules with full CRUD operations
- Parameterized queries using mssql pool.request().input()
- Windows Authentication — no username/password needed
- Input validation and error handling on all endpoints

### Frontend (React)
- Dark-themed professional UI
- Role-based navigation (sidebar hides pages based on user role)
- Live charts using Recharts (bar, pie charts)
- All data loaded from real API — no hardcoded values
- Toast notifications for success and error feedback
- Modal forms for create operations
- Filter and search on all data tables
- Collapsible sidebar layout

---

## Troubleshooting

### "Failed to connect to localhost:1433"
TCP/IP is not enabled or SQL Server is not running.
- Follow Database Setup Step 1 to enable TCP/IP
- Open Windows Services → check SQL Server (SQLEXPRESS) is Running
- In SQL Server Configuration Manager → SQL Server Services → restart SQL Server

### "Cannot connect to database" on backend start
- Check `.env` file — `DB_HOST` must be `localhost\SQLEXPRESS` (single backslash)
- Make sure TCP/IP is enabled and SQL Server restarted
- Make sure the `disaster_mis` database exists in SSMS

### "Cannot GET /api/auth/login" in browser
This is completely normal. Login is a POST request. The browser only sends GET requests.
Use Postman with method set to POST.

### "Invalid username or password" on login
The password hash was not updated. Run the two steps in Database Setup Step 3.

### Frontend shows blank page
- Make sure both servers are running (port 5000 and port 3000)
- Open browser console (F12) and check for errors
- Make sure all src files are in the correct folder

### "Index already exists" error when re-running SQL script
The database already has data. Run this in SSMS first to reset everything:
```sql
USE master;
DROP DATABASE IF EXISTS disaster_mis;
CREATE DATABASE disaster_mis;
USE disaster_mis;
```
Then re-run the full SQL script.

### Port already in use
```cmd
:: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

:: Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### "Module not found" errors
Run `npm install` in both `backend` and `frontend` folders.

---

## Quick Start Summary

```cmd
:: 1. Enable TCP/IP in SQL Server Configuration Manager, restart SQL Server

:: 2. Open SSMS, connect to localhost\SQLEXPRESS with Windows Authentication
::    Run disaster_mis_sqlserver_fixed.sql (press F5)

:: 3. Set passwords — run in backend folder:
node -e "const b=require('bcryptjs');b.hash('Admin@123',10).then(h=>console.log(h));"
::    Copy the hash and run in SSMS:
::    USE disaster_mis; UPDATE users SET password_hash = 'paste_hash_here';

:: 4. Start backend (Terminal 1)
cd disaster_mis\backend
npm install
npm run dev

:: 5. Start frontend (Terminal 2)
cd disaster_mis\frontend
npm install
npm start

:: 6. Open browser
::    http://localhost:3000
::    Login: admin_user / Admin@123
```

---

*Smart Disaster Response MIS — Database Systems Project*
