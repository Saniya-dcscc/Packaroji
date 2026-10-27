import os
from flask import Flask
from flask_mail import Mail

mail = Mail()


def create_app():
    app = Flask(
        __name__,
        template_folder="../../frontend/templates",
        static_folder="../../frontend/static",
        static_url_path="/static",
    )
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key and os.getenv("FLASK_ENV", "").lower() == "production":
        raise RuntimeError("SECRET_KEY must be configured in production.")
    app.config.update(
        SECRET_KEY=secret_key or "local-development-only-change-me",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        MAX_CONTENT_LENGTH=64 * 1024,
        MAIL_SERVER=os.getenv("MAIL_SERVER", ""),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=os.getenv("MAIL_USE_TLS", "true").lower() == "true",
        MAIL_USE_SSL=os.getenv("MAIL_USE_SSL", "false").lower() == "true",
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER", ""),
        ENQUIRY_RECIPIENT=os.getenv("ENQUIRY_RECIPIENT", "packaroji@gmail.com"),
        PUBLIC_BASE_URL=os.getenv("PUBLIC_BASE_URL", "https://packaroji.com").rstrip("/"),
        WHATSAPP_NUMBER=os.getenv("WHATSAPP_NUMBER", "918374104569"),
        PHONE_DISPLAY=os.getenv("PHONE_DISPLAY", "+91 8374104569"),
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
    # Render terminates TLS at its proxy; honour the forwarded protocol header.
    from flask import request
    return request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"
