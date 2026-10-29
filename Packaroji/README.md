# Packaroji B2B Quote Website

A responsive Flask website for B2B food-packaging enquiries. It is quote-only: there is no cart, checkout, payment processing, customer account or admin dashboard. Product specifications, MOQ, availability and pricing are confirmed individually by the Packaroji team.

## Run locally (Windows)

1. Install Python 3.10 or newer.
2. Open PowerShell in the project root.
3. Create and activate a virtual environment:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
4. Install dependencies: `python -m pip install -r backend/requirements.txt`
5. Copy `.env.example` to `.env` and configure email settings.
6. Run `python backend/run.py` and open http://127.0.0.1:5000.

## Enquiry form behaviour

- Server-side required-field, email-format, field-length and product-choice checks.
- Session token validation and a honeypot field for basic form-spam reduction.
- The business notification is sent first; the customer acknowledgement is best-effort so a failed acknowledgement does not misreport a successfully delivered enquiry.
- SMTP must be configured for the form to send. Without it, the form displays a clear message and gives the visitor phone/WhatsApp alternatives.
- The health endpoint checks that the web process is responding; it does not test SMTP delivery.

## Before launch checklist

- Verify the public phone/WhatsApp number, recipient email, domain and registered business details.
- Confirm all product descriptions, specifications, MOQ, lead times, delivery terms, GST details, certifications and food-contact claims with the business.
- Test an enquiry end-to-end using a real inbox and confirm both the business notification and customer acknowledgement behaviour.
- Check mobile navigation, form validation, all product pages, sitemap and 404 page.
- Review the privacy notice and retention practices, add verified testimonials/photos only with permission, and connect Search Console/analytics if desired.
- Configure your custom domain and HTTPS in Vercel before sharing the site publicly.

## Project structure

The project is deliberately split into `backend/` and `frontend/` so the files are easier to find. The website still needs Flask to run: do not open `frontend/templates/index.html` directly with VS Code Live Server, because Jinja template instructions only work when Flask renders the page. Start the app using the local instructions above and open `http://127.0.0.1:5000/`.

```text
Packaroji_B2B_Quote_Website/
├── backend/
│   ├── run.py                 # Flask entry point
│   ├── requirements.txt       # Python dependencies
│   └── app/
│       ├── __init__.py        # Flask setup and configuration
│       └── routes/            # Python page and enquiry routes
├── frontend/
│   ├── templates/             # Jinja HTML templates, including index.html
│   └── static/
│       ├── css/               # Stylesheets
│       ├── js/                # Browser-side JavaScript
│       ├── images/             # Logo and site images
│       └── robots.txt
├── app.py                    # Vercel Flask entry point\n├── requirements.txt          # Vercel dependencies\n├── vercel.json               # Vercel routing configuration\n├── public/static/            # Static assets served by Vercel\n├── .env.example               # Example local environment variables
├── .gitignore
└── README.md
```

- Edit `frontend/templates/index.html` for homepage content.
- Edit `frontend/templates/base.html` for shared layout and navigation.
- Edit `frontend/static/css/style.css` for styling.
- Edit `frontend/static/js/main.js` for browser interactions.
- Edit Python files in `backend/app/routes/` for server-side routes and enquiry handling.
- `/sitemap.xml` is generated dynamically by Flask; no separate sitemap file is needed.

## Deploy to Vercel

The root-level `app.py`, `requirements.txt`, and `vercel.json` are configured for Vercel's Python runtime. The `public/static/` directory mirrors the frontend static assets for Vercel's static-file serving. Set the variables from `.env.example` in **Vercel → Project → Settings → Environment Variables**. Do not upload `.env` or real credentials.

The Flask application remains organized under `backend/`, and HTML/Jinja templates remain under `frontend/templates/`. For local development, use `python backend/run.py`.
