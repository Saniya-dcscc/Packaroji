# Packaroji — Eco Food Packaging Website

A responsive Flask + HTML + CSS + vanilla JavaScript website for a Hyderabad sugarcane-bagasse food-packaging business.

## Included

- Responsive mobile/tablet/desktop layout
- Packaroji branding and green/beige/brown palette
- Hero section using the supplied background image
- Product catalogue with hover motion
- No public product prices
- Order/enquiry form that stores requests in SQLite
- Per-product customization requests with exact written specifications
- Upload of customer logos/designs/reference files (PNG, JPG, JPEG, WEBP, PDF, SVG)
- Private admin-only access to uploaded customization files
- Admin dashboard at `/admin`
- Review submission + admin approval
- Login / Sign Up combined navigation control
- Forgot-password flow with secure, expiring email reset links
- WhatsApp and phone CTAs
- SEO title/meta descriptions
- Open Graph metadata
- JSON-LD structured data
- `sitemap.xml`
- `robots.txt`
- Gunicorn-ready deployment
- Product image placeholders ready for the photos you will provide

## Important before going live

1. Open `app.py` and edit the `BUSINESS` settings OR set the environment variables:
   - `PACKAROJI_PHONE`
   - `PACKAROJI_WHATSAPP` (digits only, including country code)
   - `PACKAROJI_EMAIL`
   - `SECRET_KEY`
   - `PACKAROJI_ADMIN_PASSWORD`
   - `PACKAROJI_SMTP_HOST`
   - `PACKAROJI_SMTP_PORT` (usually `587`, or `465` for SSL)
   - `PACKAROJI_SMTP_USERNAME`
   - `PACKAROJI_SMTP_PASSWORD`
   - `PACKAROJI_SMTP_FROM_EMAIL` (optional; defaults to `PACKAROJI_EMAIL`)

3. Customized orders: customers can tick **I need this product customized** for any selected product. They can enter exact requirements for size, shape/compartments, colour, printing, branding and additional instructions, plus upload multiple reference files. These details are stored with the order and shown in the admin dashboard.

4. Before production, always confirm customized specifications with the customer. The website stores what the customer submitted; it does not automatically promise that a requested custom shape, print or material specification is manufacturable.

2. Replace placeholder product images in:
   `static/images/products/`
   with your actual product photos.
   The current project will still work if those photos are missing because the product cards show a clean placeholder.

3. Change `static/images/hero-bg.png` only if you want a different hero/background image.

4. Run locally:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate

   pip install -r requirements.txt
   python app.py
   ```
   Then open `http://127.0.0.1:5000`

5. Production:
   ```bash
   gunicorn app:app
   ```

## Render deployment

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Add environment variables for the business contact details, secret key and admin password.

### Database note

SQLite is fine for a starter deployment, but some cloud hosts use ephemeral disks. For a production business receiving regular orders, move the orders/reviews database to PostgreSQL and attach persistent storage/database service. The Flask routes are deliberately kept simple so this can be upgraded.

## SEO note

No website can honestly guarantee the #1 Google position. This project implements strong technical/on-page SEO, but ranking also depends on domain age, content, backlinks, local SEO, Google Business Profile, reviews, site speed and competition.

For Hyderabad visibility, use phrases naturally such as:
- sugarcane bagasse packaging Hyderabad
- bagasse food containers Hyderabad
- eco-friendly food packaging Hyderabad
- biodegradable takeaway packaging Hyderabad
- compostable food packaging Hyderabad
- bagasse plates and containers for restaurants
