# Pixel Forge — Server Deployment Guide

> [!NOTE]
> Deployment is **OPTIONAL**. Pixel Forge is designed to run locally for evaluation and grading. Running locally avoids cloud ephemeral disk limitations.

> [!WARNING]
> **Ephemeral Disk on Free Tier**: Render's free web service disk is wiped on every restart or deployment spin-down. When the server restarts, locally stored uploads (`server/uploads/`) disappear. If deployed on Render's free tier, the seed script must run directly on the server to regenerate sample assets on that instance's disk.

---

## 1. MongoDB Atlas Setup
1. Create or log in to a [MongoDB Atlas](https://www.mongodb.com/atlas) account.
2. Build an **M0 (Free)** cluster.
3. In **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere) so Render instances can connect.
4. In **Database Access**, create a dedicated database user (e.g., `pixelforge_user` with a strong password).
5. In **Database** > **Connect** > **Drivers**, copy the connection string:
   ```env
   mongodb+srv://pixelforge_user:<password>@cluster0.abcde.mongodb.net/pixelforge?retryWrites=true&w=majority
   ```

---

## 2. Render Web Service Deployment

### Option A: Using `render.yaml` Blueprint
1. In the Render Dashboard, click **New +** > **Blueprint**.
2. Connect your Git repository.
3. Render reads `server/render.yaml` automatically and configures the service with `rootDir: server`.
4. Enter the required secrets marked `sync: false` (`MONGODB_URI`, `CLIENT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SERVER_URL`).

### Option B: Manual Setup
1. In Render, select **New +** > **Web Service**.
2. Connect the `pixel-forge` repository.
3. Set the following settings:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
   - **Health Check Path**: `/api/health`

---

## 3. Environment Variables Configuration

Set the following variables in the **Environment** tab:

| Variable | Recommended Value | Notes |
| :--- | :--- | :--- |
| `PORT` | `5000` | Render injects this or uses default |
| `NODE_ENV` | `production` | Enforces production security headers |
| `MONGODB_URI` | `mongodb+srv://...` | From MongoDB Atlas |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Frontend production origin (for CORS) |
| `SERVER_URL` | `https://your-server.onrender.com` | Public server URL (for uploads) |
| `JWT_ACCESS_SECRET` | `<random-64-character-hex>` | Secret for access & download tokens |
| `JWT_REFRESH_SECRET` | `<random-64-character-hex>` | Secret for refresh token cookies |
| `ACCESS_TOKEN_TTL` | `15m` | Lifetime of short-lived tokens |
| `REFRESH_TOKEN_TTL` | `7d` | Lifetime of refresh token |
| `UPLOAD_DIR` | `uploads` | Storage folder relative to server root |
| `PLATFORM_FEE_PERCENT` | `10` | Marketplace cut from creator earnings |

### Cookie Settings in Production
In production (`NODE_ENV=production`), refresh cookies (`pf_rt`) are automatically set with `sameSite: 'none'` and `secure: true` (handled in `src/utils/tokens.js`). This enables cross-origin credentialed requests between the Vercel frontend and Render backend.

---

## 4. Seeding Content on the Server

Because images, audio files, and model files reside on disk, seed the server instance directly so the files exist in `uploads/`:

1. In `server/package.json`, ensure the following script exists:
   ```json
   "start:seed": "node scripts/seed.js --reset --force && node server.js"
   ```
2. In the Render Dashboard, temporarily change the **Start Command** to:
   ```bash
   npm run start:seed
   ```
3. Trigger a **Manual Deploy**. The seed script will:
   - Connect to MongoDB Atlas.
   - Procedurally generate 48 pixel art, WAV, and OBJ files.
   - Save them into `server/uploads/public/` and `server/uploads/private/`.
   - Populate users, orders, and reviews.
   - Start the Express server on completion.
4. Once seeded successfully, revert the **Start Command** back to `npm start`.

---

## 5. Verification & Health Check

1. **API Health Check**:
   ```bash
   curl -I https://your-server.onrender.com/api/health
   # Expected: HTTP/2 200 with { "success": true, "data": { "status": "ok", "time": ... } }
   ```
2. **API Documentation**:
   Open `https://your-server.onrender.com/api/docs` in the browser to view the Swagger UI.
3. **Public Upload Verification**:
   Check an asset thumbnail URL directly in the browser to confirm file delivery from `GET /uploads/*`.

> [!TIP]
> **Free Tier Spin-Down**: The Render free tier spins down web services after 15 minutes of inactivity. For live evaluations or presentations, open `https://your-server.onrender.com/api/health` 1–2 minutes beforehand to wake up the server instance.
