from pathlib import Path
from flask import Blueprint, render_template, current_app, send_from_directory, abort, session, request
import secrets
pages = Blueprint("pages", __name__)
PRODUCTS = [
("bagasse-clamshells","Sugarcane Bagasse Clamshells","Bagasse Packaging","Molded-fibre meal containers for takeaway and food-service use."),
("kraft-food-boxes","Kraft Food Boxes","Kraft Packaging","Paperboard food boxes for meals, snacks and takeaway presentation."),
("aluminium-foil-containers","Aluminium Foil Containers","Aluminium Packaging","Portion formats for rice meals, curries, combos and catering."),
("kraft-carry-bags","Kraft Carry Bags","Takeout & Delivery","Kraft paper carry bags for takeaway, bakery and delivery orders."),
("paper-cups","Paper Cups & Lids","Cups & Consumables","Single-wall and insulated cup formats for beverage service."),
("custom-printed-packaging","Custom Printed Packaging","Branding & Identity","Branded wraps, boxes, carry bags, cups, stickers and seals."),
("food-wraps-and-liners","Food Wraps & Liners","Food-contact Packaging","Foil, kraft, butter paper, wrap sheets and parchment options."),
("cutlery-and-consumables","Cutlery & Food-Service Consumables","Cups & Consumables","Cutlery, plates, dip cups, napkins and related supplies.")]
@pages.app_context_processor
def common():
    if request.endpoint == "pages.simple_page" and request.view_args and request.view_args.get("page") == "contact":
        session.setdefault("csrf_token", secrets.token_urlsafe(32))
    return {"csrf_token": session.get("csrf_token", ""), "products": PRODUCTS, "whatsapp_number":current_app.config["WHATSAPP_NUMBER"], "phone_display":current_app.config["PHONE_DISPLAY"], "public_base_url":current_app.config["PUBLIC_BASE_URL"]}
@pages.route("/health/")
def health():
    from flask import jsonify
    return jsonify(status="ok"), 200

@pages.route("/")
def home(): return render_template("index.html", title="B2B Food Packaging & Custom Branding", description="Food packaging and custom branding for restaurants, cloud kitchens, cafes, bakeries and caterers.")
@pages.route("/products/")
def products_page(): return render_template("products.html", title="Food Packaging Products", description="Explore Packaroji packaging categories and request a B2B quotation.")
@pages.route("/products/<slug>/")
def product_detail(slug):
    p = next((x for x in PRODUCTS if x[0] == slug), None)
    if not p: abort(404)
    return render_template("product_detail.html", product=p, title=p[1], description=p[3])
@pages.route("/<page>/")
def simple_page(page):
    valid = {"industries":"Industries We Serve","custom-printing":"Custom Printing & Branding","quality":"Certifications & Quality","how-to-order":"How to Order","about":"About Packaroji","faq":"Frequently Asked Questions","contact":"Contact Packaroji","privacy":"Privacy Policy","resources":"Blog & Resources"}
    if page not in valid: abort(404)
    return render_template("simple.html", page_key=page, page_title=valid[page], title=valid[page], description=f"{valid[page]} — Packaroji")
@pages.route("/thank-you/")
def thank_you(): return render_template("thank_you.html", title="Thank You")
@pages.route("/sitemap.xml")
def sitemap():
    base = current_app.config["PUBLIC_BASE_URL"]
    paths = ["/", "/products/"] + [f"/products/{p[0]}/" for p in PRODUCTS] + [
        "/industries/", "/custom-printing/", "/quality/", "/how-to-order/",
        "/about/", "/faq/", "/contact/", "/privacy/", "/resources/"
    ]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f"<url><loc>{base}{path}</loc></url>" for path in paths) + '</urlset>'
    from flask import Response
    return Response(xml, mimetype="application/xml")
@pages.route("/robots.txt")
def robots(): return send_from_directory(Path(__file__).resolve().parents[3]/"frontend"/"static", "robots.txt", mimetype="text/plain")
@pages.app_errorhandler(404)
def not_found(e): return render_template("404.html", title="Page Not Found"), 404
