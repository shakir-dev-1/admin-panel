# 📘 Admin Panel

Admin Panel is a separate platform for managing administrative workflows on top of the existing main platform database. It provides secure Super Admin access, audit logging, and management capabilities — without modifying the original application schema.

---

## 🚀 Features

* ✅ **Secure Admin Authentication**

  * Email + hashed password login
  * JWT-based sessions
  * Super Admin role by design
* 📊 **Read and Manage Main Platform Data**

  * View, update, and delete business & user data
  * Works directly against the same database as the main platform
* 🛡 **Admin Audit Logs**

  * Logs admin actions via `AdminAuditLog`
  * Records action types, targets, and metadata

---

## 📁 Project Structure

* NestJS backend
* NextJS frontend

---

## 🧠 Requirements

* Node.js 18+
* PostgreSQL (same database as main platform)
* Environment variables configured (JWT secrets, DB connection strings)

---

## ⚙️ Getting Started

### 1. Install Dependencies

Open two terminals (one for frontend, one for backend):

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

---

### 2. Environment Variables

Each app (frontend and backend) has its own `.env.example` file. You should:

1. **Copy** it to `.env` in that same directory
2. **Fill in the actual values**

Example:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

> **Note:**
>
> * The backend must connect to the **same database** as the main platform.
> * Ensure `DATABASE_URL` in the backend `.env` is pointing to that database instance.
> * Do not commit `.env` files — they contain sensitive data. Only commit `.env.example`.

---

### 3. Generate Prisma Client (Backend Only)

In the backend folder, run:

```bash
cd backend
npx prisma generate
```

This ensures Prisma is ready to work with your models and the shared database.

---

### 4. Running the Apps

Each part must be started independently:

#### Backend

```bash
cd backend
npm run start:dev
```

The backend API will be available at its configured host and port (e.g., `http://localhost:3001`)

#### Frontend

```bash
cd frontend
npm run dev
```

The frontend admin UI will run at its own configured host and port (e.g., `http://localhost:3000`)

---

### 5. Accessing the Admin Panel

Depending on your configuration:

* Visit the **frontend admin UI** (e.g., `http://localhost:3000`)
* The admin UI will make API requests to the backend (configured in `.env` or passed at build time)

---

### 📦 Install Separately

Since this is a monorepo with independent applications, don’t run a single global install in the root — it won’t install subfolder dependencies.

---

## 🔐 Admin Authentication

Admin users are defined in the `admin` table. Passwords are hashed using bcrypt before storing.

Sample login flow:

1. `POST /auth/login`
2. Returns:

   * `accessToken` (JWT)
   * Admin info

All protected routes require a valid JWT.

---

## 📊 Audit Logging

For each admin action (create/update/delete), the application should write an entry to:

* `AdminAuditLog`

  * `adminId` — Admin performing the action
  * `actionType` — E.g., “DELETE_USER”
  * `targetUserId` — ID of the affected entity
  * `metadata` — Optional JSON extra data
  * `createdAt` — Timestamp of action

Audit logs help with accountability and tracking actions performed through the panel.

---

## 🧩 Security Considerations

* **HTTPS only:** Always serve over HTTPS in production
* **Token expiration:** JWT expires in `8h` by default
* **Refresh Tokens:** Not currently implemented for admin — add if required
* **Role Enforcement:** Only Super Admin role exists; more granular roles can be added later
* **Rate limiting:** Add request throttling to prevent brute-force login attempts

---

## 🎯 Future Enhancements

* MFA / 2FA for admin login
* Refresh token support for admin sessions
* RBAC integration if more than one admin type is needed
* Activity tracking & notifications

---
