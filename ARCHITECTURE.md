# Packaroji — Backend & Frontend Organization

This document defines where each type of code must live. Existing website design, content, layout, images, animations, and user-facing behavior must be preserved while reorganizing code.

## 1. Backend

Backend code belongs in the Python/Flask application layer.

### Backend responsibilities

- Flask routes and URL endpoints
- Database connection and queries
- Product, category, collection, and catalogue data retrieval
- Login, signup, logout, sessions, and authentication
- Customer/account operations
- Form processing and server-side validation
- Quote/enquiry processing
- Contact/WhatsApp business configuration
- Server-side permissions and access control
- Rendering data passed into Jinja templates
- Error handling and server-side logging

### Backend location

- `app.py` — Flask application, routes, server-side logic
- Any existing Python backend modules — database and reusable backend helpers
- Any existing server configuration files — environment and deployment configuration

### Backend rules

- Never place database credentials in HTML, CSS, or browser JavaScript.
- Never trust client-side validation as the only validation.
- Never put private keys, secrets, or server-only business logic in `static/`.
- Keep database writes and authentication decisions on the server.

## 2. Frontend

Frontend code belongs in templates, CSS, JavaScript, and public assets.

### Frontend responsibilities

- HTML/Jinja page structure and visible content
- Navigation, header, footer, and page sections
- Responsive layout and styling
- Buttons, sliders, dropdowns, modals, and visible interactions
- Layer-by-layer scroll animation and video controls
- Hero animations and visual transitions
- Cookie banner display and browser-side preference handling
- Client-side form interaction and user feedback
- Accessibility attributes and responsive behavior

### Frontend locations

- `templates/` — HTML/Jinja page structure
- `static/css/style.css` — shared styling and responsive styles
- `static/js/main.js` — shared navigation and general frontend interactions
- `static/js/packaging-layers.js` — packaging-layer scroll/video interaction only
- `static/js/landing-fixes.js` — landing-page-only frontend adjustments
- `static/js/cookie-consent.js` — cookie banner and browser-side cookie preference logic only
- `static/images/` — public images and logos
- `static/videos/` — public videos used by the website
- `static/catalogue-Packaroji.pdf` — public catalogue asset

## 3. Separation rules

- HTML structure stays in `templates/`; do not place large page structures inside JavaScript.
- Visual styling stays in CSS; do not add large style blocks to unrelated JavaScript files.
- Browser interactions stay in the appropriate JavaScript file; do not place them inside `cookie-consent.js` unless they are cookie-related.
- Backend data processing stays in Python; do not duplicate database logic in frontend JavaScript.
- Keep each JavaScript file focused on one responsibility.
- Reuse existing functions instead of appending duplicate implementations.
- Do not delete existing sections, footer, sliders, product links, or layer content during organization.
- Do not change visible design or wording merely for code organization.
- Keep file names descriptive and consistent.
- Check all template script references after moving any JavaScript file.
- Preserve existing routes, IDs, classes, data attributes, and endpoint names unless a change is required for a verified bug fix.

## 4. Safety process

1. Work on the safe architecture branch first.
2. Read the current file before modifying it.
3. Move only code that has been verified to belong elsewhere.
4. Update script references when a JavaScript file is moved.
5. Check for duplicate functions and duplicate event listeners.
6. Verify the home page, navigation, products, account pages, forms, footer, slider, and packaging layers.
7. Do not merge into the main branch until the organized version has been reviewed.

## 5. Non-negotiable requirement

The purpose of this organization is to improve maintainability without changing how the Packaroji website looks or behaves. Any visual or functional change must be treated as a separate, explicitly approved task.
