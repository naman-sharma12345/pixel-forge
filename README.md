# Pixel Forge

A polished marketplace where indie game developers buy and sell game assets (sprites, tilesets, characters, UI kits, backgrounds, VFX, fonts, 3D models) and audio (sound effects, music).

## Team Members & Responsibilities

1. **Abhishek** - Backend Foundation, Authentication, User Management, API Documentation (Swagger/OpenAPI), Core Utilities & Middleware
2. **Parth** - Assets & Reviews (Catalog, Search/Filter, Upload, Review & Rating System)
3. **Adwait** - Commerce, Library & Administration (Cart, Orders, Mock Payments, Library, Downloads, Creator Analytics, Admin Dashboard, Seeding)
4. **Naman** - Frontend Application (React 18, Vite, TypeScript, Tailwind CSS, Wavesurfer.js, Zustand, TanStack Query)

## Repository Structure

```text
pixel-forge/
├── client/                # Frontend application (Naman)
└── server/                # Backend API service (Abhishek, Parth, Adwait)
    ├── src/
    │   ├── config/        # Environment and database setup
    │   ├── docs/          # OpenAPI / Swagger specification
    │   ├── middleware/    # Auth, validation, uploads, rate limiting, error handling
    │   ├── models/        # Mongoose data models
    │   ├── modules/       # Feature modules (controllers, routes, services, schemas)
    │   ├── routes/        # Main route aggregator
    │   └── utils/         # Helpers for errors, responses, pagination, tokens, storage
    ├── uploads/           # Runtime file storage (uploads/public and uploads/private)
    └── server.js          # Server entry point
```

## Getting Started

### Prerequisites
- Node.js >= 20
- MongoDB instance (MongoDB Atlas or local MongoDB)

### Server Setup

1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.*
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Access the API and interactive Swagger documentation:
   - Health Check: `http://localhost:5000/api/health`
   - Swagger Docs: `http://localhost:5000/api/docs`

### Client Setup

1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set environment variables in `.env`:
   ```bash
   VITE_API_URL=http://localhost:5000/api
   VITE_USE_MOCKS=false
   ```
4. Start the Vite dev server:
   ```bash
   npm run dev
   ```
