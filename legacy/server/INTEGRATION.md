# Pixel Forge — Team Integration Checklist

This document provides the exact step-by-step protocol for integrating and merging all feature branches into `main`.

---

## 1. Branch Merge Order

Branches must be merged sequentially in the following contract order:

1. **`feat/auth-users` (Abhishek)** — Foundation, Authentication, Users, Core Utils, Middleware, OpenAPI docs.
2. **`feat/assets` (Parth)** — Asset catalog, search/filter, multi-file uploads, reviews, ratings.
3. **`feat/commerce` (Adwait)** — Cart, orders, mock payments, user library, downloads, creator stats, admin stats, and seed script.
4. **`feat/frontend` (Naman)** — React 18 client, Vite, Tailwind CSS, TanStack Query, Zustand store, Wavesurfer.js audio player.

---

## 2. Resolving Conflicts on STUB Files

During development, Abhishek provided stub files with the header `// STUB created by Abhishek - <owner> replaces this file`:
- `server/src/modules/assets/*` & `server/src/models/Asset.js` (Owner: **Parth**)
- `server/src/modules/reviews/*` & `server/src/models/Review.js` (Owner: **Parth**)
- `server/src/modules/cart/*`, `orders/*`, `payments/*`, `library/*`, `downloads/*`, `creator/*`, `admin/*` (Owner: **Adwait**)
- `server/src/models/Cart.js`, `Order.js`, `Purchase.js`, `server/src/utils/ownership.js` (Owner: **Adwait**)

### Conflict Resolution Rule:
> [!IMPORTANT]
> When merging `feat/assets` or `feat/commerce`, **always keep the incoming owner's version** of their owned files. The stub files were placeholders designed to be replaced by the respective owners.

```bash
# Example for Parth's merge:
git checkout main
git merge feat/assets
# If git conflicts on a stub file owned by Parth:
git checkout --theirs src/models/Asset.js src/models/Review.js src/modules/assets/* src/modules/reviews/*
git add .
git commit -m "feat: merge assets and reviews from Parth"
```

---

## 3. Verification Protocol After Every Merge

Run these commands in `server/` immediately after each branch merge:

```bash
# 1. Update any newly added dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start development server to verify boot & route mounting
npm run dev
```

---

## 4. End-to-End Smoke Test Sequence

Once all backend branches (`auth-users`, `assets`, `commerce`) are merged, perform this end-to-end smoke test sequence covering every module in contract order:

1. **Health Check**:
   - `GET /api/health` $\rightarrow$ verify `200` with `status: 'ok'` and `db: 'connected'`.
2. **Register Buyer**:
   - `POST /api/auth/register` $\rightarrow$ register a new account (returns `201` with `accessToken` and sets `pf_rt` cookie).
3. **Upgrade to Creator**:
   - `POST /api/users/me/become-creator` $\rightarrow$ verify role changes to `creator`.
4. **Upload Asset**:
   - `POST /api/assets` (multipart) $\rightarrow$ upload asset with thumbnail, preview, and product archive (`201` returned).
5. **Browse Catalog**:
   - `GET /api/assets` $\rightarrow$ verify uploaded asset appears with `status: 'published'` in `AssetCard` format.
6. **Add to Cart**:
   - `POST /api/cart/items` $\rightarrow$ add asset to cart (returns `CartView` with subtotal).
7. **Checkout**:
   - `POST /api/orders/checkout` $\rightarrow$ create order with mock provider (`providerOrderId` returned).
8. **Confirm Payment**:
   - `POST /api/payments/mock/confirm` $\rightarrow$ send `{ orderId, outcome: 'success' }` (creates `Purchase` record).
9. **Verify Library**:
   - `GET /api/library` $\rightarrow$ purchased asset appears in `LibraryItem` shape.
10. **Generate Download Link**:
    - `GET /api/downloads/:assetId` $\rightarrow$ returns signed download token URL.
11. **Download File**:
    - `GET /api/downloads/file/:token` $\rightarrow$ streams downloaded file attachment.
12. **Submit Review**:
    - `POST /api/reviews` $\rightarrow$ post 5-star review for the purchased asset (updates asset `ratingAvg`).
13. **Creator Studio Stats**:
    - `GET /api/creator/stats` $\rightarrow$ view daily revenue series and top assets.
14. **Admin Dashboard**:
    - `GET /api/admin/stats` $\rightarrow$ login as admin and view platform-wide revenue and signup metrics.

---

## 5. Frontend Integration & Mock Toggle (`VITE_USE_MOCKS=false`)

When merging `feat/frontend` (Naman), verify the client connects directly to the live Express server:

1. In `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_USE_MOCKS=false
   ```
2. Start both server (`npm run dev` in `server/`) and client (`npm run dev` in `client/`).
3. Open `http://localhost:5173` in the browser and verify:
   - **Network Requests**: DevTools Network tab shows real API calls to `http://localhost:5000/api/...`.
   - **Credentials & Cookies**: `withCredentials: true` sends and receives the `pf_rt` cookie.
   - **CORS & Audio Playback**: Audio previews load and play seamlessly in Wavesurfer.js without CORS errors (served from `http://localhost:5000/uploads/...` with cross-origin CORP headers).
   - **Authentication State**: Logging in updates user state in Zustand store and retains session across page reloads via `/api/auth/refresh`.
