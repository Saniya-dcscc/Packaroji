# Packaroji — Render Deployment

This package is a corrected deployment-ready copy of Packaroji. It keeps the existing site content and fixes static asset delivery.

## Recommended way to use this package

Replace the contents of your existing GitHub folder:

`Packaroji-DEPLOY-READY`

with the contents of this ZIP. **Do not create another nested folder.**

Then keep these Render settings:

- **Root Directory:** `Packaroji-DEPLOY-READY`
- **Build Command:** `pip install -r requirements.txt`
- **Pre-Deploy Command:** leave empty
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT app:app`

Do not add `packaroji start up` or any other old folder path.

## Environment variables

Set these in Render:

- `SECRET_KEY` = a strong random secret
- `PACKAROJI_ADMIN_PASSWORD` = your admin password

Do not commit a `.env` file.

## Static asset fix

The Flask app disables Flask's automatic static-file handler and serves files under `/static/` directly as response bytes. This avoids the problematic WSGI/sendfile path and ensures CSS, JavaScript, and image files are delivered with their actual contents.
