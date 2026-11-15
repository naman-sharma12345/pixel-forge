# MIGRATION_MAP: MERN → Django

The original MERN project lives untouched in `legacy/` (`legacy/client` = React, `legacy/server` = Express + MongoDB).
This file maps every legacy page, API module and model field to its Django equivalent.

## 1. Pages (`legacy/client/src/pages`)

| Legacy page | URL | URL name | View (function) | Template | Form |
|---|---|---|---|---|---|
| HomePage | `/` | `core:home` | `core.views.home` | `core/home.html` | – |
| ExplorePage | `/explore/` | `catalog:explore` | `catalog.views.explore` | `catalog/explore.html` + `catalog/_results.html` (AJAX partial) | `ExploreForm` (GET) |
| CategoryRedirect | `/category/<key>/` | `catalog:category` | `catalog.views.category_redirect` | – (redirect to `explore/?category=`) | – |
| AssetDetailPage | `/asset/<slug>/` | `catalog:detail` | `catalog.views.asset_detail` | `catalog/detail.html` | `ReviewForm` |
| ReviewsSection (create/edit) | `/asset/<slug>/review/` | `catalog:review_save` | `catalog.views.review_save` | (on detail page) | `ReviewForm` |
| ReviewsSection (delete) | `/review/<id>/delete/` | `catalog:review_delete` | `catalog.views.review_delete` | – | – |
| UserProfilePage | `/u/<username>/` | `accounts:profile` | `accounts.views.profile` | `accounts/profile.html` | – |
| LoginPage | `/accounts/login/` | `accounts:login` | Django `LoginView` | `accounts/login.html` | `LoginForm` (AuthenticationForm) |
| (logout in navbar) | `/accounts/logout/` | `accounts:logout` | Django `LogoutView` | – | – |
| RegisterPage | `/accounts/register/` | `accounts:register` | `accounts.views.register` | `accounts/register.html` | `RegisterForm` (UserCreationForm) |
| SettingsPage (profile tab) | `/settings/` | `accounts:settings` | `accounts.views.settings_view` | `accounts/settings.html` | `ProfileForm` (ModelForm) |
| SettingsPage (security tab) | `/settings/?tab=security` | `accounts:settings` | same | same | `PasswordChangeForm` |
| SettingsPage (orders tab) | `/settings/?tab=orders` | `accounts:settings` | same | same | – |
| BecomeCreatorCard / modal | `/settings/become-creator/` | `accounts:become_creator` | `accounts.views.become_creator` (POST) | – | – |
| WishlistPage | `/wishlist/` | `accounts:wishlist` | `accounts.views.wishlist` | `accounts/wishlist.html` | – |
| (heart button) | `/wishlist/toggle/<slug>/` | `accounts:wishlist_toggle` | `accounts.views.wishlist_toggle` (POST, AJAX + fallback) | – | – |
| CartPage | `/cart/` | `commerce:cart` | `commerce.views.cart` | `commerce/cart.html` | – |
| CartDrawer / add / remove | `/cart/add/<slug>/`, `/cart/remove/<slug>/`, `/cart/clear/` | `commerce:cart_add`, `cart_remove`, `cart_clear` | `commerce.views.*` (POST, AJAX + fallback) | – | – |
| PixelPayModal | `/checkout/pay/<ref>/` | `commerce:pay` | `commerce.views.pay` | `commerce/pay.html` | – |
| (checkout start) | `/checkout/` | `commerce:checkout` | `commerce.views.checkout` (POST) | – | – |
| (mock confirm) | `/checkout/pay/<ref>/confirm/` | `commerce:pay_confirm` | `commerce.views.pay_confirm` (POST) | – | – |
| CheckoutSuccessPage | `/checkout/success/<ref>/` | `commerce:success` | `commerce.views.success` | `commerce/success.html` | – |
| (free claim) | `/claim/<slug>/` | `commerce:claim` | `commerce.views.claim` (POST) | – | – |
| LibraryPage | `/library/` | `commerce:library` | `commerce.views.library` | `commerce/library.html` | `LibraryFilterForm` |
| (downloads module) | `/download/<slug>/` | `commerce:download` | `commerce.views.download` | – | – |
| (receipt, new) | `/orders/<ref>/receipt.pdf` | `commerce:receipt` | `commerce.views.receipt_pdf` | – | – |
| StudioOverviewPage | `/studio/` | `dashboard:studio` | `dashboard.views.studio_overview` | `dashboard/studio.html` | – |
| StudioAssetsPage | `/studio/assets/` | `catalog:studio_assets` | `catalog.views.studio_assets` | `catalog/studio_assets.html` | – |
| StudioNewPage (wizard) | `/studio/new/` | `catalog:studio_new` | `catalog.views.studio_new` | `catalog/studio_form.html` | `AssetForm` (ModelForm) |
| StudioEditPage | `/studio/edit/<id>/` | `catalog:studio_edit` | `catalog.views.studio_edit` | `catalog/studio_form.html` | `AssetForm` |
| (archive / delete) | `/studio/archive/<id>/` | `catalog:studio_archive` | `catalog.views.studio_archive` (POST) | – | – |
| StudioSalesPage | `/studio/sales/` | `dashboard:studio_sales` | `dashboard.views.studio_sales` | `dashboard/studio_sales.html` | `DateRangeForm` |
| (CSV / PDF, new) | `/studio/sales.csv`, `/studio/sales.pdf` | `dashboard:sales_csv`, `sales_pdf` | `dashboard.views.*` | – | `DateRangeForm` |
| AdminOverviewPage | `/panel/` | `dashboard:admin` | `dashboard.views.admin_overview` | `dashboard/admin.html` | – |
| AdminUsersPage | `/panel/users/` | `dashboard:admin_users` | `dashboard.views.admin_users` | `dashboard/admin_users.html` | `UserFilterForm` |
| (ban / role toggle) | `/panel/users/<id>/ban/` | `dashboard:admin_ban` | `dashboard.views.admin_ban` (POST) | – | – |
| AdminAssetsPage | `/panel/assets/` | `dashboard:admin_assets` | `dashboard.views.admin_assets` | `dashboard/admin_assets.html` | `RejectForm` |
| (moderation actions) | `/panel/assets/<id>/moderate/` | `dashboard:admin_moderate` | `dashboard.views.admin_moderate` (POST) | – | `RejectForm` |
| (reports, new) | `/panel/orders.csv`, `/panel/summary.pdf`, `/explore/export.csv` | `dashboard:orders_csv`, `summary_pdf`, `catalog:explore_csv` | `dashboard.views.*` | – | – |
| CommandPalette | `/api/search/?q=` | `catalog:api_search` | `catalog.views.api_search` (JsonResponse) | modal in `partials/navbar.html` | – |
| NotFoundPage (+ mini-game) | any unknown URL | handler404 | `core.views.handler404` | `404.html` | – |
| ErrorBoundary | server errors | handler500 | `core.views.handler500` | `500.html` | – |
| (403) | denied access | handler403 | `core.views.handler403` | `403.html` | – |

## 2. API modules (`legacy/server/src/modules`) → Django

| Express module / endpoint | Django equivalent |
|---|---|
| `auth` register / login / logout | `accounts:register`, `accounts:login`, `accounts:logout` (sessions replace JWT access + refresh tokens, so no `/auth/refresh`) |
| `users` GET/PATCH `/me`, avatar | `accounts:settings` (`ProfileForm`, multipart avatar) |
| `users` password | `accounts:settings?tab=security` (`PasswordChangeForm`; session kept alive with `update_session_auth_hash`) |
| `users` become-creator | `accounts:become_creator` + `CreatorProfile` row |
| `users` wishlist GET/POST/DELETE | `accounts:wishlist`, `accounts:wishlist_toggle` (`User.wishlist` M2M) |
| `users` GET `/:username` | `accounts:profile` (ORM aggregation) |
| `assets` list / home / categories / tags | `catalog:explore`, `core:home`, `Category.objects.annotate(Count)`, tag chips in explore |
| `assets` GET `/:slug`, related | `catalog:detail` (related = same category, by sales) |
| `assets` POST / PATCH / DELETE / mine | `catalog:studio_new`, `studio_edit`, `studio_archive`, `studio_assets` |
| `reviews` | `catalog:review_save`, `review_delete`; summary via `aggregate()` |
| `cart` | `commerce:cart`, `cart_add`, `cart_remove`, `cart_clear` (`CartItem`) |
| `orders` checkout / list / detail | `commerce:checkout`, `accounts:settings?tab=orders`, `commerce:success` |
| `payments` mock confirm | `commerce:pay_confirm` (idempotent, `transaction.atomic`) |
| `library` list / claim | `commerce:library`, `commerce:claim` |
| `downloads` signed link + file | `commerce:download` (permission check + `FileResponse`; no public URL, no token) |
| `creator` stats / sales | `dashboard:studio`, `dashboard:studio_sales` (+ CSV / PDF) |
| `admin` stats / users / assets | `dashboard:admin`, `admin_users`, `admin_assets` and the built-in Django Admin at `/admin/` |
| `scripts/seed.js` | `python manage.py seed_demo [--reset]` |

## 3. Model fields

### User (`legacy/server/src/models/User.js` → `accounts.User`)
| Mongoose | Django |
|---|---|
| name | `first_name` (display name) |
| username | `username` |
| email | `email` (unique) |
| passwordHash | `password` (Django hashers) |
| role | `role` (buyer / creator / admin) |
| avatarUrl, avatarKey | `avatar` ImageField |
| bio | `bio` (max 300) |
| socials.{website,twitter,itchio,github} | `website`, `twitter`, `itchio`, `github` |
| wishlist [ObjectId] | `wishlist` ManyToManyField(Asset) |
| tokenVersion | not needed (sessions) |
| isBanned | `is_active` (False = banned) |
| lastLoginAt | `last_login` |
| (new) | `CreatorProfile` one-to-one: `tagline`, `banner_seed` |

### Asset (`Asset.js` → `catalog.Asset`, `Category`, `Tag`, `AssetPreview`)
| Mongoose | Django |
|---|---|
| title, slug, description | same |
| creator | `creator` FK |
| category (enum) | `category` FK → `Category` (key, name, media_kind, icon, order) |
| mediaKind | property `media_kind` (from category) |
| tags [String] | `tags` M2M → `Tag` |
| price, license | same |
| thumbnail {url,key} | `thumbnail` ImageField |
| previews [{url,key,kind}] | `AssetPreview` rows (`file`, `kind`, `order`) |
| file {key,format,mimeType,bytes,originalName}, fileInfo | `file` FileField on private storage; format / size / name derived from it |
| fileFormats [String] | `file_formats` (comma-separated) |
| meta.{resolution,frames,durationSec,bpm,loopable,sampleRate} | `resolution`, `frames`, `duration_sec`, `bpm`, `loopable` (sample rate is dropped; it was display-only) |
| status, rejectionReason, isFeatured | `status`, `rejection_reason`, `is_featured` |
| stats.views, stats.downloads | `views`, `downloads` |
| stats.sales, ratingAvg, ratingCount, wishlistCount | computed with `Count` / `Avg` on `Purchase`, `Review`, `wishlisted_by` |

### Review, Cart, Order, Purchase
| Mongoose | Django |
|---|---|
| Review {asset,user,rating,comment} unique(asset,user) | `catalog.Review` + `UniqueConstraint` |
| Cart {user, items[]} | `commerce.CartItem` rows, `UniqueConstraint(user, asset)` |
| Order {items[], subtotal, platformFee, total, status, provider, paidAt} | `commerce.Order` + `OrderItem` (`reference` added, provider dropped: always simulated) |
| Order.items[].creatorEarning | `OrderItem.creator_earning` |
| Purchase {user, asset, order, pricePaid, downloadCount, lastDownloadedAt} | `commerce.Purchase` + `UniqueConstraint(user, asset)` |

## 4. Things that change shape, and why

| Legacy | Django | Why |
|---|---|---|
| React SPA + JSON API | Server-rendered templates | Syllabus: Django Template Language, template inheritance |
| JWT access + refresh cookie | Django sessions + CSRF | Built-in auth is the syllabus topic |
| Mock API (`src/mocks`) | not needed | Real database from day one |
| React Query cache | Plain requests, `select_related` / `prefetch_related` | Server-side ORM optimisation |
| Command palette (React) | AJAX search modal (`/api/search/`, debounced `fetch`) | No SPA state; vanilla JS |
| Infinite scroll on Explore | `Paginator`, 24 per page, plus an AJAX-refreshed grid | Pagination is a syllabus topic |
| Upload wizard (5 steps) | One `AssetForm` page split into 5 progressive sections + preview formset | Forms and ModelForms instead of client state; same fields and validation |
| Recharts | Chart.js 4 via CDN, data via `json_script` | Library mandated by the spec |
| Signed 5-minute download URL | Permission-checked `FileResponse` | Files live outside any served path |
| framer-motion transitions | CSS transitions / keyframes, `prefers-reduced-motion` respected | No JS framework |
| Admin panel (React) | Custom `dashboard` views **and** the built-in Django Admin | Both are demonstrated |
| CSV export (client-side) | Server-side `csv` module | Syllabus: reports |
| (none) | PDF receipts and reports with reportlab | Syllabus: PDF generation |

## 5. New routes with no legacy page

| URL | URL name | View | Purpose |
|---|---|---|---|
| `/panel/users/<id>/role/` | `dashboard:admin_role` | `dashboard.views.admin_role` (POST) | Admin changes a user's role |
| `/avatar/<username>.png` | `core:avatar` | `core.views.avatar` | Generated pixel avatar when no upload |
| `/banner/<seed>.png` | `core:banner` | `core.views.banner` | Generated landscape for profile banners and auth art |
| `/sheet/<seed>.png` | `core:sheet` | `core.views.sheet` | Generated 8-frame sprite sheet |
| `/art/<category>.png` | `core:category_art` | `core.views.category_art` | Category tile art on the home page |
| `/illustration/<kind>.png` | `core:illustration` | `core.views.illustration` | Empty-state and how-it-works illustrations |
| `handler403/404/500` | – | `core.views.handler*` | Custom error pages (`templates/403.html`, `404.html` with mini-game, `500.html`) |

