import os
from pathlib import Path
from flask import Flask
from flask_mail import Mail

mail = Mail()


def create_app():
    project_root = Path(__file__).resolve().parents[2]
    app = Flask(
        __name__,
        template_folder=str(project_root / "frontend" / "templates"),
        static_folder=str(project_root / "public" / "static"),
        static_url_path="/static",
    )
    secret_key = os.getenv("SECRET_KEY")
    if os.getenv("VERCEL_ENV", "").lower() in {"production", "preview"} and not secret_key:
        raise RuntimeError("SECRET_KEY must be configured in Vercel Environment Variables.")
    vercel_url = os.getenv("VERCEL_URL", "").strip()
    inferred_base_url = f"https://{vercel_url}" if vercel_url else "http://127.0.0.1:5000"
    app.config.update(
        SECRET_KEY=secret_key or "local-development-only-change-me",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "true" if os.getenv("VERCEL_ENV", "").lower() == "production" else "false").lower() == "true",
        MAX_CONTENT_LENGTH=64 * 1024,
        MAIL_SERVER=os.getenv("MAIL_SERVER", ""),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "true").lower() == "true",
        MAIL_USE_SSL=os.getenv("MAIL_USE_SSL", "false").lower() == "true",
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER", ""),
        ENQUIRY_RECIPIENT=os.getenv("ENQUIRY_RECIPIENT", "packaroji@gmail.com"),
        PUBLIC_BASE_URL=(os.getenv("PUBLIC_BASE_URL") or inferred_base_url).rstrip("/"),
        CONTACT_EMAIL=os.getenv("CONTACT_EMAIL", "packaroji@gmail.com"),
        WHATSAPP_NUMBER=os.getenv("WHATSAPP_NUMBER", "918374104569"),
        PHONE_DISPLAY=os.getenv("PHONE_DISPLAY", "+91 8374104569"),
        PHONE_LINK=os.getenv("PHONE_LINK", "+918374104569"),
    )
    mail.init_app(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request_is_https():
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    from .routes.pages import pages
    from .routes.enquiries import enquiries
    app.register_blueprint(pages)
    app.register_blueprint(enquiries)
    return app


def request_is_https():
    # Honour the forwarded protocol header when running behind a TLS proxy.
    from flask import request
    return request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"
