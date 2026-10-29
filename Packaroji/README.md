# Packaroji — B2B Food Packaging Website

Flask website for Packaroji's B2B food-packaging enquiries. The catalogue PDF has been removed for now; visitors can request product information through the enquiry form or WhatsApp.

## Project structure

```text
Packaroji_B2B_Quote_Website/
├── app.py                    # Vercel entry point; imports backend.run:app
├── requirements.txt          # Root dependencies used by Vercel
├── .env.example              # Example local environment settings
├── .gitignore
├── README.md
├── backend/
│   ├── __init__.py
│   ├── run.py                 # Flask app + local development entry point
│   └── app/
│       ├── __init__.py        # App factory and configuration
│       └── routes/
│           ├── pages.py
│           └── enquiries.py
├── frontend/
│   └── templates/             # Jinja templates
└── public/
    └── static/                # Canonical CSS, JS and image assets
```

## Run locally

1. Use Python 3.10 or newer.
2. From the project root, create and activate a virtual environment.
3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy `.env.example` to `.env` and set a long random `SECRET_KEY`. Add SMTP settings if you want enquiry emails to work locally.
5. Start the site from the project root:

   ```bash
   python -m backend.run
   ```

6. Open `http://127.0.0.1:5000`.

Do not open Jinja templates directly with VS Code Live Server; they must be rendered by Flask.

## Deploy to Vercel

- Import the GitHub repository containing this project's root files. Make sure the repository root has `app.py`, `requirements.txt`, `backend/`, `frontend/`, and `public/`.
- No `vercel.json` is required for this setup. Vercel detects the top-level Python entry point and serves files in `public/` as static assets.
- In **Vercel → Project → Settings → Environment Variables**, configure:
  - `SECRET_KEY`: a long, random secret; required for Preview and Production deployments.
  - `PUBLIC_BASE_URL`: the exact deployed site origin, such as your Vercel deployment URL or custom domain. Set this to the canonical domain you want sitemap and canonical tags to use. If left blank, the app uses `VERCEL_URL` on Vercel and localhost for local development.
  - `CONTACT_EMAIL`, `PHONE_DISPLAY`, `PHONE_LINK`, and `WHATSAPP_NUMBER`: the public business contact details.
  - `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USE_SSL`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`, and `ENQUIRY_RECIPIENT`: private SMTP settings for the enquiry form.
- For Gmail SMTP, `MAIL_PASSWORD` must be a Google App Password, not your normal Gmail password. Store real credentials only in Vercel Environment Variables or a local `.env`; never commit `.env`.
- Redeploy after changing environment variables.

## Enquiry form and security

- The form checks its CSRF token, validates required fields and consent server-side, and includes a honeypot field. It also applies a basic in-process limit of five submissions per client IP per ten minutes. On serverless hosting, this limiter is per instance; use a shared rate-limit store for stronger protection across instances.
- Enquiries are emailed only to the configured `ENQUIRY_RECIPIENT`. The site does **not** send acknowledgement emails to addresses entered by visitors.
- Configure SMTP before launch. If email is unavailable, the form explains that users should contact Packaroji by phone or WhatsApp.
- Review the privacy notice and data-retention practices before launch.

## Important environment variables

See `.env.example` for the complete list. Never commit secrets or real `.env` files.
