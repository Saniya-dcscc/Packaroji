import re
import time
from collections import defaultdict
from flask import Blueprint, request, current_app, redirect, url_for, flash, session
from flask_mail import Message
from .. import mail
from .pages import PRODUCTS

enquiries = Blueprint("enquiries", __name__)

# Lightweight per-instance limiter: 5 form submissions per client IP per 10 minutes.
# For stronger cross-instance protection on serverless hosting, use a shared rate-limit store.
_RATE_WINDOW_SECONDS = 600
_RATE_MAX_REQUESTS = 5
_rate_buckets = defaultdict(list)
_last_rate_cleanup = 0.0


def _rate_limited(client_key):
    """Return True when a client exceeds the in-process fixed time window."""
    global _last_rate_cleanup
    now = time.monotonic()
    cutoff = now - _RATE_WINDOW_SECONDS
    recent = [stamp for stamp in _rate_buckets[client_key] if stamp > cutoff]
    if len(recent) >= _RATE_MAX_REQUESTS:
        _rate_buckets[client_key] = recent
        return True
    recent.append(now)
    _rate_buckets[client_key] = recent
    if now - _last_rate_cleanup > _RATE_WINDOW_SECONDS:
        for key in list(_rate_buckets):
            valid = [stamp for stamp in _rate_buckets[key] if stamp > cutoff]
            if valid:
                _rate_buckets[key] = valid
            else:
                del _rate_buckets[key]
        _last_rate_cleanup = now
    return False


FIELDS = ("name", "business", "phone", "email", "product", "quantity", "city", "message")
PRODUCT_CHOICES = {product[1] for product in PRODUCTS} | {
    "Sample Kit Request", "Other / Help Me Source"
}


def back_to_form():
    # Always redirect to our own contact route; never trust an arbitrary Referer URL.
    product = request.form.get("product", "").strip()
    target = url_for("pages.simple_page", page="contact", product=product)
    return redirect(target + "#quote-form")


@enquiries.post("/enquiry")
def submit():
    # Vercel provides x-vercel-forwarded-for; otherwise fall back to the direct peer.
    # Use only the first address and do not trust arbitrary X-Forwarded-For values.
    client_key = request.headers.get("x-vercel-forwarded-for", "").split(",", 1)[0].strip()
    if not client_key:
        client_key = request.remote_addr or "unknown"
    if _rate_limited(client_key):
        flash("Too many enquiries were submitted from this connection. Please wait a few minutes and try again.", "error")
        return back_to_form(), 429

    if request.form.get("website", "").strip():  # Honeypot for basic bot filtering.
        return redirect(url_for("pages.thank_you"))

    token = request.form.get("csrf_token", "")
    if not token or token != session.get("csrf_token"):
        flash("Your form session expired. Please reload the page and try again.", "error")
        return back_to_form()

    d = {k: request.form.get(k, "").strip() for k in FIELDS}
    if not all(d[k] for k in ("name", "phone", "email", "product")):
        flash("Please complete your name, phone, email and product interest.", "error")
        return back_to_form()
    if request.form.get("consent") != "yes":
        flash("Please confirm that Packaroji may use your details to respond.", "error")
        return back_to_form()
    if d["product"] not in PRODUCT_CHOICES:
        flash("Please choose a valid product interest.", "error")
        return back_to_form()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", d["email"]):
        flash("Please enter a valid email address.", "error")
        return back_to_form()
    if any(len(d[k]) > limit for k, limit in {"name":120,"business":180,"phone":40,"email":180,"product":100,"quantity":120,"city":120,"message":4000}.items()):
        flash("One or more fields are too long. Please review your enquiry.", "error")
        return back_to_form()

    cfg = current_app.config
    if not (cfg["MAIL_SERVER"] and cfg["MAIL_USERNAME"] and cfg["MAIL_PASSWORD"] and cfg["MAIL_DEFAULT_SENDER"]):
        flash("Email is not configured yet. Please contact us by WhatsApp or phone while the site owner completes setup.", "error")
        return back_to_form()

    body = "\n".join(f"{k.title()}: {d[k] or 'Not provided'}" for k in FIELDS)
    try:
        mail.send(Message(
            subject=f"Packaroji B2B enquiry — {d['product']}",
            recipients=[cfg["ENQUIRY_RECIPIENT"]],
            reply_to=d["email"],
            body="New website enquiry:\n\n" + body,
        ))
    except Exception:
        current_app.logger.exception("Enquiry email delivery failed")
        flash("We couldn't send the enquiry right now. Please contact us via WhatsApp or phone.", "error")
        return back_to_form()

    # Do not email arbitrary customer-supplied addresses; this avoids turning the form into a spam relay.
    session.pop("csrf_token", None)
    return redirect(url_for("pages.thank_you"))
