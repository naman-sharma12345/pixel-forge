# SYLLABUS_MAP: where each topic is demonstrated

Use this file to show the evaluator the exact file for each topic. Paths are relative to the repository root.

> **Check before submitting.** The lab brief only fixes two module numbers explicitly: **Module 4** (model
> relationships) and **Module 6** (AJAX and reports). The other modules below are grouped by topic. Match the
> module numbers against your official syllabus sheet and rename the headings if they differ.

## Modules

### Project setup, settings, URL routing (early modules)
| Topic | Where |
|---|---|
| Project and apps (`startproject`, `startapp`) | `pixelforge/`, `core/`, `accounts/`, `catalog/`, `commerce/`, `dashboard/` |
| Settings from environment (`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`) | `pixelforge/settings.py`, `.env.example` |
| Root URLconf, `include()`, app namespaces, named URLs, path converters | `pixelforge/urls.py`, `*/urls.py` (e.g. `asset/<slug:slug>/`) |
| Custom error handlers | `pixelforge/urls.py` (`handler403/404/500`), `core/views.py`, `templates/404.html` |
| Static files | `static/css/pixelforge.css`, `static/js/*.js`, `STATICFILES_DIRS` |
| Function-based views, `HttpResponse`, `JsonResponse`, `FileResponse` | every `views.py` |
| Request methods and decorators (`require_POST`, `login_required`) | `commerce/views.py`, `accounts/decorators.py` |

### Django Template Language
| Topic | Where |
|---|---|
| Template inheritance (`extends`, `block`) | `templates/base.html` and every page template |
| `include` with context | `templates/partials/*.html` (asset card, price tag, pagination, field) |
| Custom template tags and filters | `core/templatetags/pf.py` (`inr`, `star`, ...) |
| Context processors | `core/context_processors.py` |
| `{% url %}`, `{% static %}`, `{% csrf_token %}`, `json_script` | throughout, e.g. `dashboard/templates/dashboard/studio.html` |

### Forms and validation
| Topic | Where |
|---|---|
| `Form` (GET filters) | `catalog/forms.py::ExploreForm` |
| `ModelForm` | `catalog/forms.py::AssetForm`, `ReviewForm`, `accounts/forms.py::ProfileForm` |
| Custom `clean_<field>` and `clean()` | `AssetForm.clean_file`, `clean_price`, `clean_tag_list`, `clean` |
| File upload validation (extension, size) | `AssetForm.clean_thumbnail`, `clean_file`, `MultipleFileField` |
| `UserCreationForm` / `AuthenticationForm` / `PasswordChangeForm` subclasses | `accounts/forms.py` |
| `messages` framework | `static/js/app.js` renders Django messages as toasts; set in all views |

### Authentication, sessions, permissions
| Topic | Where |
|---|---|
| Custom user model (`AbstractUser`) | `accounts/models.py::User`, `AUTH_USER_MODEL` |
| Login / logout / registration | `accounts/views.py`, `accounts/urls.py` |
| Login by username or email, banned-user message | `accounts/forms.py::LoginForm` |
| Sessions (sign out everywhere on ban) | `dashboard/services.py::sign_out_everywhere` |
| Role-based access | `accounts/decorators.py` (`creator_required`, `admin_required`) |
| `LOGIN_URL`, `next` redirects | `pixelforge/settings.py`, `accounts/views.py` |
| CSRF protection | every `<form method="post">`; `fetch()` sends `X-CSRFToken` in `static/js/app.js` |

### Module 4: Models and relationships
| Relationship | Where |
|---|---|
| **One-to-one** | `accounts.CreatorProfile.user` |
| **Many-to-many** | `catalog.Asset.tags` and `accounts.User.wishlist` |
| **Foreign key** (with `related_name`, `on_delete`) | `Asset.creator`, `Asset.category`, `Review.asset/user`, `Order.user`, `OrderItem.order`, `Purchase.user/asset/order` |
| Constraints (`UniqueConstraint`, validators) | one review per user per asset, one purchase per user per asset, rating 1 to 5 |
| Custom manager / QuerySet methods | `catalog/models.py::AssetQuerySet` (`published`, `with_stats`, `search`) |
| Aggregation and annotation (`Count`, `Avg`, `Sum`, `TruncDate`) | `catalog/views.py::asset_detail`, `dashboard/services.py`, `core/views.py::home` |
| `select_related` / `prefetch_related` | `catalog/views.py`, `commerce/views.py` |
| Transactions and row locking | `commerce/services.py::confirm_payment` |
| Migrations including a data migration | `catalog/migrations/0001_initial.py`, `0002_seed_categories.py` |
| Management command | `core/management/commands/seed_demo.py` |

### Django Admin
| Topic | Where |
|---|---|
| `ModelAdmin` with `list_display`, filters, search, inlines | `accounts/admin.py`, `catalog/admin.py`, `commerce/admin.py` |
| Custom admin action (CSV export) | `core/admin_utils.py` |

### Module 6: AJAX, files and reports
| Topic | Where |
|---|---|
| AJAX search endpoint returning JSON | `/api/search/` → `catalog/views.py::api_search`, used by the command palette in `static/js/app.js` |
| AJAX-refreshed Explore grid (partial template) | `catalog/views.py::explore`, `catalog/templates/catalog/_results.html`, `static/js/explore.js` |
| AJAX wishlist and cart toggles with non-JS fallback | `accounts/views.py::wishlist_toggle`, `commerce/views.py::cart_add` |
| Upload with progress (XHR) and JSON field errors | `catalog/views.py::studio_new`, `static/js/studio.js` |
| File storage, `ImageField`, `FileField`, Pillow | `catalog/models.py`, `core/pixelart.py` |
| Private files and permission-checked download | `catalog/models.py::PrivateFileStorage`, `commerce/views.py::download` |
| **PDF** with reportlab | receipt `commerce/views.py::receipt_pdf`; sales report `dashboard/views.py::sales_pdf`; admin summary `summary_pdf`; helpers in `core/pdf.py` |
| **CSV** export | `catalog/views.py::explore_csv`, `dashboard/views.py::sales_csv`, `orders_csv` |
| Charts (Chart.js via CDN, `json_script`) | `dashboard/templates/dashboard/studio.html`, `static/js/dashboard.js` |

### Testing and deployment
| Topic | Where |
|---|---|
| Unit and integration tests (`TestCase`, test client) | `*/tests.py`, run with `python manage.py test` (75 tests) |
| Deployment checklist | `README.md` (Deployment notes), `python manage.py check --deploy` |

## Course outcomes

The brief names CO1 to CO5 without wording them, so these are grouped by what they evidence. Rename to match your sheet.

| CO | Evidence |
|---|---|
| **CO1** Build a web project structure with Django: apps, settings, URL routing, views | `pixelforge/`, five apps, `*/urls.py`, `MIGRATION_MAP.md` |
| **CO2** Build dynamic pages with the template language and static files | `templates/`, `partials/`, `core/templatetags/pf.py`, `static/` |
| **CO3** Handle user input with forms, validation, uploads, sessions and authentication | `*/forms.py`, `accounts/`, `catalog/views.py::studio_new` |
| **CO4** Design and query relational models with the ORM and Admin | `*/models.py`, migrations, `seed_demo`, `*/admin.py`, `dashboard/services.py` |
| **CO5** Add AJAX, file handling and reporting, then test and ship | `/api/search/`, `static/js/*.js`, PDF and CSV views, `*/tests.py`, README deployment notes |

## `manage.py check --deploy` warnings

All five come from running with development settings and are expected. They go away when the site is hosted over HTTPS with `DEBUG=0`.

| Warning | Meaning |
|---|---|
| `security.W004` SECURE_HSTS_SECONDS not set | Tells browsers to use HTTPS only. Enable once the site is served over TLS. |
| `security.W008` SECURE_SSL_REDIRECT not True | Redirect HTTP to HTTPS. Only meaningful behind TLS. |
| `security.W012` SESSION_COOKIE_SECURE not True | Session cookie should travel only over HTTPS. Off locally because `runserver` is HTTP. |
| `security.W016` CSRF_COOKIE_SECURE not True | Same, for the CSRF cookie. |
| `security.W018` DEBUG is True | Debug pages leak internals. Set `DEBUG=0` in production. |
