import re
from flask import Blueprint, request, render_template, current_app, redirect, url_for, flash, session
from flask_mail import Message
from app import mail

enquiries = Blueprint("enquiries", __name__)
FIELDS = ("name", "business", "phone", "email", "product", "quantity", "city", "message")
PRODUCT_CHOICES = {
    "Sugarcane Bagasse Clamshells", "Kraft Food Boxes", "Aluminium Foil Containers",
    "Kraft Carry Bags", "Paper Cups & Lids", "Custom Printed Packaging",
    "Food Wraps & Liners", "Cutlery & Food-Service Consumables",
    "Sample Kit Request", "Other / Help Me Source",
}


def back_to_form():
    # Always redirect to our own contact route; never trust an arbitrary Referer URL.
    product = request.form.get("product", "").strip()
    target = url_for("pages.simple_page", page="contact", product=product)
    return redirect(target + "#quote-form")


@enquiries.post("/enquiry")
def submit():
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

    # Customer acknowledgement is best-effort: it must not turn a delivered enquiry into an error.
    try:
        mail.send(Message(
            subject="We received your Packaroji enquiry",
            recipients=[d["email"]],
            body=("Thank you for contacting Packaroji. We have received your enquiry. "
                  "For urgent queries, call " + cfg["PHONE_DISPLAY"] + ".\n\n" + body +
                  "\n\nPackaroji — Packaging Done Right"),
        ))
    except Exception:
        current_app.logger.exception("Customer acknowledgement email failed")

    session.pop("csrf_token", None)
    return redirect(url_for("pages.thank_you"))
