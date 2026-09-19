import os
import sqlite3
import mimetypes
import json
import uuid
import hashlib
import secrets
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime, timedelta
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    Response,
    url_for,
    session,
    flash,
    send_from_directory,
)

from werkzeug.utils import secure_filename
from werkzeug.security import (
    generate_password_hash,
    check_password_hash,
)


# ============================================================
# APP
# ============================================================

app = Flask(__name__, static_folder=None)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "change-this-secret-key-before-production"
)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024


# ============================================================
# STATIC FILES
# ============================================================
# Render/Gunicorn can sometimes use the WSGI file-wrapper/sendfile
# path for static assets. This app serves static assets directly as
# bytes so CSS, JavaScript and images are delivered consistently.

STATIC_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "static",
)


@app.get("/static/<path:filename>", endpoint="static")
def static_file(filename):
    requested = os.path.realpath(os.path.join(STATIC_DIR, filename))
    static_root = os.path.realpath(STATIC_DIR)

    if not (requested == static_root or requested.startswith(static_root + os.sep)):
        return "Not Found", 404

    if not os.path.isfile(requested):
        return "Not Found", 404

    with open(requested, "rb") as file:
        data = file.read()

    mimetype = mimetypes.guess_type(requested)[0] or "application/octet-stream"
    response = Response(data, status=200, mimetype=mimetype)
    response.headers["Cache-Control"] = "public, max-age=3600"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DB_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(
        BASE_DIR,
        "packaroji.db"
    )
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads",
    "customizations"
)


os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

ALLOWED_UPLOADS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
    "svg",
}


# ============================================================
# BUSINESS INFORMATION
# ============================================================

BUSINESS = {
    "name": "Packaroji",
    "city": "Hyderabad",
    "phone": "+91 8374104569",
    "whatsapp": "918374104569",
    "email": "packaroji@gmail.com",
    "address": "Hyderabad",
    "map_url": (
        "https://www.google.com/maps/search/"
        "?api=1&query=Hyderabad%2C%20Telangana%2C%20India"
    ),
    "tagline": (
        "Eco-friendly food packaging for smarter takeaways."
    ),
}


# ============================================================
# AUTH / PASSWORD RESET EMAIL
# ============================================================

SMTP_HOST = os.environ.get("PACKAROJI_SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("PACKAROJI_SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("PACKAROJI_SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("PACKAROJI_SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get(
    "PACKAROJI_SMTP_FROM_EMAIL",
    BUSINESS["email"],
)

# Where Packaroji receives new-order alerts. Override on Render/Vercel if needed.
ORDER_NOTIFICATION_EMAIL = os.environ.get(
    "PACKAROJI_ORDER_NOTIFICATION_EMAIL",
    BUSINESS["email"],
)

# WhatsApp Cloud API (Meta) settings. These are intentionally read from
# environment variables so no credentials are stored in the repository.
WHATSAPP_ACCESS_TOKEN = os.environ.get("PACKAROJI_WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("PACKAROJI_WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ADMIN_TO = os.environ.get("PACKAROJI_WHATSAPP_ADMIN_TO", BUSINESS["whatsapp"])
WHATSAPP_API_VERSION = os.environ.get("PACKAROJI_WHATSAPP_API_VERSION", "v23.0")
WHATSAPP_TEMPLATE_NAME = os.environ.get("PACKAROJI_WHATSAPP_TEMPLATE_NAME", "")
WHATSAPP_TEMPLATE_LANGUAGE = os.environ.get("PACKAROJI_WHATSAPP_TEMPLATE_LANGUAGE", "en_US")
PASSWORD_RESET_MINUTES = 30
EMAIL_VERIFICATION_HOURS = 48


# ============================================================
# PRODUCT CATEGORIES
# Edit this list later to change the visible category menu.
# ============================================================

PRODUCT_CATEGORIES = [
    {"name": "Food Wrapping", "icon": "🧻", "image": "catalogue/kraft-butter-rolls.jpg", "description": "Foils, kraft paper, butter paper and wrap sheets"},
    {"name": "Aluminium Foil Packaging", "icon": "🥘", "image": "catalogue/foil-single-compartment.jpg", "description": "Single to multi-compartment foil food packaging"},
    {"name": "Kraft Paper Packaging", "icon": "📦", "image": "catalogue/clamshell-burger-snack-boxes.jpg", "description": "Trays, tubs, snack pouches, boxes and meal packaging"},
    {"name": "Sugarcane Bagasse", "icon": "🌿", "image": "catalogue/bagasse-single-clamshell.jpg", "description": "Clamshells, bowls, containers and meal trays"},
    {"name": "Takeout & Delivery", "icon": "🛍️", "image": "catalogue/sos-kraft-bags.jpg", "description": "Kraft bags for takeaway, delivery and retail orders"},
]


# ============================================================
# PRODUCTS
# ============================================================

PRODUCTS = [
    # Layer 1 — the layer that touches the food directly
    {
        "id": 1, "name": "Aluminium Foil Roll", "slug": "aluminium-foil-roll",
        "category": "Food Wrapping", "layer": "Layer 1 — Food Wrapping", "brandable": True,
        "packaging_categories": ["Food Packaging", "Food Wrapping"],
        "description": "Ideal for wrapping rotis, parathas, grilled items, and keeping hot meals fresh.",
        "long_description": "Aluminium foil roll for direct food wrapping and keeping hot meals fresh.",
        "sizes": "Available in multiple sizes; confirm your required size with Packaroji.",
        "material": "Aluminium foil", "features": ["Heat retention", "Moisture & odor seal", "Oven & grill safe"],
        "best_for": ["Rotis", "Parathas", "Grilled items", "Hot meals"], "image": "catalogue/aluminium-foil-roll.jpg",
    },
    {
        "id": 2, "name": "Plain Kraft & Butter Paper Rolls", "slug": "plain-kraft-butter-paper-rolls",
        "category": "Food Wrapping", "layer": "Layer 1 — Food Wrapping", "brandable": True,
        "packaging_categories": ["Food Packaging", "Food Wrapping"],
        "description": "Perfect for everyday packing of burgers, sandwiches, rolls, and bakery items.",
        "long_description": "Plain kraft and butter paper rolls for everyday food and bakery packing.",
        "sizes": "Available in multiple sizes; confirm your required size with Packaroji.",
        "material": "Kraft & butter paper", "features": ["100% greaseproof", "Tear-resistant fiber", "Breathable freshness"],
        "best_for": ["Burgers", "Sandwiches", "Rolls", "Bakery items"], "image": "catalogue/kraft-butter-rolls.jpg",
    },
    {
        "id": 3, "name": "Wrap Sheets", "slug": "wrap-sheets",
        "category": "Food Wrapping", "layer": "Layer 1 — Food Wrapping", "brandable": True,
        "packaging_categories": ["Food Packaging", "Food Wrapping"],
        "description": "Great for quick dispensing, wrapping grab-and-go snacks, and lining food baskets.",
        "long_description": "Wrap sheets designed for quick dispensing, grab-and-go wrapping and food-basket lining.",
        "sizes": "Available in multiple sizes; confirm your required size with Packaroji.",
        "material": "Food wrapping paper", "features": ["Quick pull-dispense", "Non-stick coating", "Pre-cut liner"],
        "best_for": ["Grab-and-go snacks", "Food baskets", "Quick-service wrapping"], "image": "catalogue/wrap-sheets.jpg",
    },
    {
        "id": 4, "name": "Branding Options", "slug": "branding-options",
        "category": "Food Wrapping", "layer": "Layer 1 — Food Wrapping", "brandable": True,
        "packaging_categories": ["Food Packaging", "Branding"],
        "description": "Greaseproof paper with aesthetic or brand prints for cafes and bakeries.",
        "long_description": "Branding options for food-safe printed wrapping and paper packaging.",
        "sizes": "Confirm print size, artwork and required quantity with Packaroji.",
        "material": "Greaseproof paper", "features": ["Food-safe inks", "Custom brand print", "Oil & rub resistant"],
        "best_for": ["Cafes", "Bakeries", "Branded food packaging"], "image": "catalogue/branding-options.jpg",
    },

    # Layer 2 — Aluminium foil packaging
    {
        "id": 5, "name": "Aluminium Foil — Single Compartment", "slug": "aluminium-foil-single-compartment",
        "category": "Aluminium Foil Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Aluminium Foil Packaging"],
        "description": "Ideal for Biryani, Rice Meals, Pasta, Curries and more.",
        "long_description": "Single-compartment aluminium foil packaging for hot food portions and takeaway meals.",
        "sizes": "Available in multiple sizes.", "material": "Food grade aluminium foil",
        "features": ["Food grade material", "Lightweight & durable", "Ideal for hot food", "Eco-friendly choice"],
        "best_for": ["Biryani", "Rice meals", "Pasta", "Curries", "Takeaway food", "Food delivery"], "image": "catalogue/foil-single-compartment.jpg",
    },
    {
        "id": 6, "name": "Aluminium Foil — 2 Compartment", "slug": "aluminium-foil-2-compartment",
        "category": "Aluminium Foil Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Aluminium Foil Packaging"],
        "description": "Perfect for Main + Side dishes, Rice + Curry and Combo Meals.",
        "long_description": "Two-compartment aluminium foil packaging for meals with separate portions.",
        "sizes": "Available in multiple sizes.", "material": "Food grade aluminium foil",
        "features": ["Food grade material", "Lightweight & durable", "Ideal for hot food", "Available in multiple sizes"],
        "best_for": ["Main + side dishes", "Rice + curry", "Combo meals"], "image": "catalogue/foil-2-compartment.jpg",
    },
    {
        "id": 7, "name": "Aluminium Foil — 3 Compartment", "slug": "aluminium-foil-3-compartment",
        "category": "Aluminium Foil Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Aluminium Foil Packaging"],
        "description": "Great for Complete Meals, Multiple Sides and Thali Options.",
        "long_description": "Three-compartment aluminium foil packaging for complete meals and multiple sides.",
        "sizes": "Available in multiple sizes.", "material": "Food grade aluminium foil",
        "features": ["Food grade material", "Lightweight & durable", "Ideal for hot food", "Available in multiple sizes"],
        "best_for": ["Complete meals", "Multiple sides", "Thali options"], "image": "catalogue/foil-3-compartment.jpg",
    },
    {
        "id": 8, "name": "Aluminium Foil — 4 Compartment", "slug": "aluminium-foil-4-compartment",
        "category": "Aluminium Foil Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Aluminium Foil Packaging"],
        "description": "Ideal for Full Meals, Multi-Cuisine Combos and Thali Options.",
        "long_description": "Four-compartment aluminium foil packaging for full meals, combos and thali options.",
        "sizes": "Available in multiple sizes.", "material": "Food grade aluminium foil",
        "features": ["Food grade material", "Lightweight & durable", "Ideal for hot food", "Available in multiple sizes"],
        "best_for": ["Full meals", "Multi-cuisine combos", "Thali options"], "image": "catalogue/foil-4-compartment.jpg",
    },
    {
        "id": 9, "name": "Aluminium Foil — Round", "slug": "aluminium-foil-round",
        "category": "Aluminium Foil Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Aluminium Foil Packaging"],
        "description": "Ideal for Salads, Gravies, Curries, Desserts and Baked Items.",
        "long_description": "Round aluminium foil packaging for salads, gravies, curries, desserts and baked items.",
        "sizes": "Available in multiple sizes.", "material": "Food grade aluminium foil",
        "features": ["Food grade material", "Lightweight & durable", "Ideal for hot food", "Available in multiple sizes"],
        "best_for": ["Salads", "Gravies", "Curries", "Desserts", "Baked items"], "image": "catalogue/foil-round.jpg",
    },

    # Layer 2 — Kraft paper packaging
    {
        "id": 10, "name": "Open Food Trays / Boats", "slug": "open-food-trays-boats",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Ideal for Nachos, Fries, Tacos, Fried Snacks, and Finger Foods.",
        "long_description": "Open kraft food trays and boats for quick-service snacks and finger foods.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Nachos", "Fries", "Tacos", "Fried snacks", "Finger foods"], "image": "catalogue/open-food-trays-boats.jpg",
    },
    {
        "id": 11, "name": "Scoops & Snack Pouches", "slug": "scoops-snack-pouches",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Perfect for French Fries, Churros, Nuggets, Popcorn, and Wraps.",
        "long_description": "Kraft scoops and snack pouches for quick-service snacks.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["French fries", "Churros", "Nuggets", "Popcorn", "Wraps"], "image": "catalogue/scoops-snack-pouches.jpg",
    },
    {
        "id": 12, "name": "Clamshell Burger & Snack Boxes", "slug": "clamshell-burger-snack-boxes",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Ideal for Burgers, Foot Long Subs, Fried Chicken, Wraps, Frankie Rolls and Sandwiches.",
        "long_description": "Kraft clamshell boxes for burgers, subs, fried chicken, wraps and sandwiches.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Burgers", "Foot long subs", "Fried chicken", "Wraps", "Frankie rolls", "Sandwiches"], "image": "catalogue/clamshell-burger-snack-boxes.jpg",
    },
    {
        "id": 13, "name": "Round Tall & Flat Tubs", "slug": "round-tall-flat-tubs",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Ideal for Soups, Gravies, Desserts, Ice Cream, and Grain Bowls.",
        "long_description": "Kraft tubs for soups, gravies, desserts, ice cream and grain bowls.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Soups", "Gravies", "Desserts", "Ice cream", "Grain bowls"], "image": "catalogue/round-tall-flat-tubs.jpg",
    },
    {
        "id": 14, "name": "Rectangular Meal Boxes", "slug": "rectangular-meal-boxes",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Perfect for Layer Meals, Biryani, Meal Combos, and Gourmet Mains.",
        "long_description": "Rectangular kraft meal boxes for layered meals, biryani, combos and gourmet mains.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Layer meals", "Biryani", "Meal combos", "Gourmet mains"], "image": "catalogue/rectangular-meal-boxes.jpg",
    },
    {
        "id": 15, "name": "Folded Boxes", "slug": "folded-boxes",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Kraft Paper Packaging"],
        "description": "Great for Noodles, Fried Rice, Salads, Pastas, and Bakery Items.",
        "long_description": "Folded kraft boxes for noodles, fried rice, salads, pastas and bakery items.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Noodles", "Fried rice", "Salads", "Pastas", "Bakery items"], "image": "catalogue/folded-boxes.jpg",
    },

    # Layer 2 — Bakery packaging
    {
        "id": 16, "name": "Folded Boxes V2", "slug": "folded-boxes-v2",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Ideal for Fried Rice, Noodles, Pasta, Salads, and Hot Combos.",
        "long_description": "A folded-box format for hot combos and everyday takeaway food.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Fried rice", "Noodles", "Pasta", "Salads", "Hot combos"], "image": "catalogue/folded-boxes-v2.jpg",
    },
    {
        "id": 17, "name": "Stand-Up Pouches & Bags", "slug": "stand-up-pouches-bags",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Perfect for Dry Fruits, Coffee Beans, Breads, and Snacks.",
        "long_description": "Bakery-special stand-up pouches and bags for dry foods and snacks.",
        "sizes": "Available in multiple sizes.", "material": "Food packaging paper/pouch material", "features": ["Food grade material", "Grease resistant", "Available in multiple sizes"],
        "best_for": ["Dry fruits", "Coffee beans", "Breads", "Snacks"], "image": "catalogue/stand-up-pouches-bags.jpg",
    },
    {
        "id": 18, "name": "Dome Shaped Cake Box", "slug": "dome-shaped-cake-box",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Great for Cakes, Pastries, Picnic Packs, and Gift Hampers.",
        "long_description": "Dome-shaped bakery box designed for cakes, pastries, picnic packs and gift hampers.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Cakes", "Pastries", "Picnic packs", "Gift hampers"], "image": "catalogue/dome-cake-box.jpg",
    },
    {
        "id": 19, "name": "Window Bakery Boxes", "slug": "window-bakery-boxes",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Ideal for Cupcakes, Muffins, Brownies, Donuts, and Tea Cakes.",
        "long_description": "Window bakery boxes that showcase baked products while providing food packaging.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Cupcakes", "Muffins", "Brownies", "Donuts", "Tea cakes"], "image": "catalogue/window-bakery-boxes.jpg",
    },
    {
        "id": 20, "name": "Cake & Tart Boxes", "slug": "cake-tart-boxes",
        "category": "Kraft Paper Packaging", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Designed for Whole Cakes, Cheesecakes, Pies, and Premium Bakes.",
        "long_description": "Bakery boxes designed for whole cakes, cheesecakes, pies and premium bakes.",
        "sizes": "Available in multiple sizes.", "material": "Kraft paper", "features": ["Food grade material", "Grease resistant", "Microwave safe", "Biodegradable", "Available in multiple sizes"],
        "best_for": ["Whole cakes", "Cheesecakes", "Pies", "Premium bakes"], "image": "catalogue/cake-tart-boxes.jpg",
    },

    # Layer 2 — Sugarcane bagasse
    {
        "id": 21, "name": "Single Compartment Clamshell", "slug": "bagasse-single-compartment-clamshell",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Ideal for Gourmet Burgers, Sandwiches, Bagels, and Sliders.",
        "long_description": "Sugarcane bagasse single-compartment clamshell for burgers, sandwiches, bagels and sliders.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Gourmet burgers", "Sandwiches", "Bagels", "Sliders"], "image": "catalogue/bagasse-single-clamshell.jpg",
    },
    {
        "id": 22, "name": "Long Clamshell", "slug": "bagasse-long-clamshell",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Perfect for Biryani, Fried Rice, Pasta, Noodles, Salads and Continental Mains.",
        "long_description": "Long sugarcane bagasse clamshell for long-format meals and mains.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Biryani", "Fried rice", "Pasta", "Noodles", "Salads", "Continental mains"], "image": "catalogue/bagasse-long-clamshell.jpg",
    },
    {
        "id": 23, "name": "2 Compartment Clamshell", "slug": "bagasse-2-compartment-clamshell",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Great for Rice + Curry Combos, Main + Starter, and Meal Pairings.",
        "long_description": "Two-compartment sugarcane bagasse clamshell for paired meal portions.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Rice + curry combos", "Main + starter", "Meal pairings"], "image": "catalogue/bagasse-2-compartment-clamshell.jpg",
    },
    {
        "id": 24, "name": "3 Compartment Clamshell", "slug": "bagasse-3-compartment-clamshell",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Ideal for Executive Combos, Main with Sides, and Multi-Curry Lunch Sets.",
        "long_description": "Three-compartment sugarcane bagasse clamshell for complete meals with sides.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Executive combos", "Main with sides", "Multi-curry lunch sets"], "image": "catalogue/bagasse-3-compartment-clamshell.jpg",
    },
    {
        "id": 25, "name": "Round Bowls — Bagasse", "slug": "bagasse-round-bowls",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Designed for Salads, Poke Bowls, Curries, Gravies, and Desserts.",
        "long_description": "Sugarcane bagasse round bowls for salads, poke bowls, curries, gravies and desserts.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Salads", "Poke bowls", "Curries", "Gravies", "Desserts"], "image": "catalogue/bagasse-round-bowls.jpg",
    },
    {
        "id": 26, "name": "Oval Meal Container", "slug": "bagasse-oval-meal-container",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Perfect for Biryani, Gourmet Pastas, Noodle Bowls, and Lean Packaging.",
        "long_description": "Oval sugarcane bagasse meal container for biryani, gourmet pastas and noodle bowls.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Biryani", "Gourmet pastas", "Noodle bowls"], "image": "catalogue/bagasse-oval-meal-container.jpg",
    },
    {
        "id": 27, "name": "Single Compartment Container — Bagasse", "slug": "bagasse-single-compartment-container",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Ideal for Biryani, Pasta, Rice Bowls, Continental Mains, and Salads.",
        "long_description": "Single-compartment sugarcane bagasse container for mains and salads.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Biryani", "Pasta", "Rice bowls", "Continental mains", "Salads"], "image": "catalogue/bagasse-single-container.jpg",
    },
    {
        "id": 28, "name": "2 Compartment Container — Bagasse", "slug": "bagasse-2-compartment-container",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Perfect for Rice + Curry Combos, Main + Starter, and Chinese Bowls.",
        "long_description": "Two-compartment sugarcane bagasse container for combo meals and paired portions.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Rice + curry combos", "Main + starter", "Chinese bowls"], "image": "catalogue/bagasse-2-container.jpg",
    },
    {
        "id": 29, "name": "3 Compartment Meal Tray", "slug": "bagasse-3-compartment-meal-tray",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Great for Mini Thalis, Executive Combos, Roti + Dal + Sabzi Sets.",
        "long_description": "Three-compartment sugarcane bagasse meal tray for thalis and executive combos.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Mini thalis", "Executive combos", "Roti + dal + sabzi sets"], "image": "catalogue/bagasse-3-meal-tray.jpg",
    },
    {
        "id": 30, "name": "4 Compartment Meal Tray", "slug": "bagasse-4-compartment-meal-tray",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Ideal for Premium Executive Thalis, South Indian Meals, and Complete Combos.",
        "long_description": "Four-compartment sugarcane bagasse meal tray for complete meals and premium thalis.",
        "sizes": "Available in multiple sizes.", "material": "Sugarcane bagasse", "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes"],
        "best_for": ["Premium executive thalis", "South Indian meals", "Complete combos"], "image": "catalogue/bagasse-4-meal-tray.jpg",
    },
    {
        "id": 31, "name": "Round Bowls — Meal Tray Format", "slug": "bagasse-round-bowls-meal-tray-format",
        "category": "Sugarcane Bagasse", "layer": "Layer 2 — Main Portion Packaging", "brandable": True,
        "packaging_categories": ["Food Packaging", "Sugarcane Bagasse"],
        "description": "Designed for Grand Indian Thalis, Corporate Lunch Boxes, and Multi-Course Platters.",
        "long_description": "A round-bowl meal format shown in the catalogue for thalis, corporate lunches and multi-course platters.",
        "sizes": "Available in multiple sizes; up to 8 compartments available.", "material": "Sugarcane bagasse",
        "features": ["Food grade material", "Oil & water resistant", "Microwave safe", "Freezer safe", "Available in multiple sizes", "Available up to 8 compartments"],
        "best_for": ["Grand Indian thalis", "Corporate lunch boxes", "Multi-course platters"], "image": "catalogue/bagasse-round-bowls-tray.jpg",
    },

    # Layer 3 — takeout & delivery
    {
        "id": 32, "name": "SOS Kraft Bags — 70–100 GSM", "slug": "sos-kraft-bags-70-100-gsm",
        "category": "Takeout & Delivery", "layer": "Layer 3 — Takeout & Delivery", "brandable": True,
        "packaging_categories": ["Food Packaging", "Takeout & Delivery"],
        "description": "70–100 GSM brown kraft paper; ideal for bakery items, sandwiches, grocery deliveries, and over-the-counter takeaways.",
        "long_description": "SOS kraft bags in 70–100 GSM brown kraft paper for bakery, sandwich, grocery and takeaway orders.",
        "sizes": "70–100 GSM", "material": "Brown kraft paper", "features": ["High load bearing", "Spill & tear resistant", "Self-standing flat bottom", "Available in multiple sizes", "100% recyclable & plastic-free"],
        "best_for": ["Bakery items", "Sandwiches", "Grocery deliveries", "Over-the-counter takeaways"], "image": "catalogue/sos-kraft-bags.jpg",
    },
    {
        "id": 33, "name": "Wide-Base Die-Cut Bags — 110–140 GSM", "slug": "wide-base-die-cut-bags-110-140-gsm",
        "category": "Takeout & Delivery", "layer": "Layer 3 — Takeout & Delivery", "brandable": True,
        "packaging_categories": ["Food Packaging", "Takeout & Delivery"],
        "description": "110–140 GSM heavy-duty kraft; perfect for broad base containers, meal box combos, bakery boxes, and fast food takeouts.",
        "long_description": "Heavy-duty wide-base die-cut kraft bags for broad containers and larger takeaway packaging.",
        "sizes": "110–140 GSM", "material": "Heavy-duty kraft", "features": ["High load bearing", "Spill & tear resistant", "Self-standing flat bottom", "Available in multiple sizes", "100% recyclable & plastic-free"],
        "best_for": ["Broad base containers", "Meal box combos", "Bakery boxes", "Fast food takeouts"], "image": "catalogue/wide-base-die-cut-bags.jpg",
    },
    {
        "id": 34, "name": "SOS Kraft Bags — 100–130 GSM", "slug": "sos-kraft-bags-100-130-gsm",
        "category": "Takeout & Delivery", "layer": "Layer 3 — Takeout & Delivery", "brandable": True,
        "packaging_categories": ["Food Packaging", "Takeout & Delivery"],
        "description": "100–130 GSM with up to 5 kg capacity; great for multi-item deliveries, cloud kitchen orders, retail takeaways, and premium brand packaging.",
        "long_description": "Higher-capacity SOS kraft bags for multi-item deliveries and premium takeout packaging.",
        "sizes": "100–130 GSM | Up to 5 kg capacity", "material": "Kraft paper", "features": ["High load bearing", "Spill & tear resistant", "Self-standing flat bottom", "Available in multiple sizes", "100% recyclable & plastic-free"],
        "best_for": ["Multi-item deliveries", "Cloud kitchen orders", "Retail takeaways", "Premium brand packaging"], "image": "catalogue/sos-kraft-bags-heavy.jpg",
    },
    {
        "id": 35, "name": "Wide-Base Die-Cut Bags — 80–120 GSM", "slug": "wide-base-die-cut-bags-80-120-gsm",
        "category": "Takeout & Delivery", "layer": "Layer 3 — Takeout & Delivery", "brandable": True,
        "packaging_categories": ["Food Packaging", "Takeout & Delivery"],
        "description": "80–120 GSM in kraft and bleached white; designed for heavy food containers, thali boxes, cake boxes, and sturdy doorstep delivery.",
        "long_description": "Wide-base die-cut bags in kraft and bleached white for sturdy doorstep delivery.",
        "sizes": "80–120 GSM", "material": "Kraft & bleached white", "features": ["High load bearing", "Spill & tear resistant", "Reinforced handle strength", "Moisture & grease barrier", "100% recyclable & plastic-free"],
        "best_for": ["Heavy food containers", "Thali boxes", "Cake boxes", "Doorstep delivery"], "image": "catalogue/wide-base-die-cut-bags-white.jpg",
    },
]



# ============================================================
# DATABASE
# ============================================================

def db():

    conn = sqlite3.connect(
        DB_PATH
    )

    conn.row_factory = sqlite3.Row

    return conn


def init_db():

    conn = db()

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            password_hash TEXT NOT NULL,
            reset_token_hash TEXT,
            reset_token_expires_at TEXT,
            email_verified INTEGER NOT NULL DEFAULT 0,
            verify_token_hash TEXT,
            verify_token_expires_at TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            user_id INTEGER,
            customer_name TEXT NOT NULL,
            business_name TEXT,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT,
            items TEXT NOT NULL,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'New',
            customizations TEXT,
            customization_files TEXT,
            FOREIGN KEY(user_id)
                REFERENCES users(id)
        );
        """
    )

    order_columns = {
        row[1]
        for row in conn.execute(
            "PRAGMA table_info(orders)"
        ).fetchall()
    }

    user_columns = {
        row[1]
        for row in conn.execute(
            "PRAGMA table_info(users)"
        ).fetchall()
    }

    if "reset_token_hash" not in user_columns:

        conn.execute(
            "ALTER TABLE users ADD COLUMN reset_token_hash TEXT"
        )

    if "reset_token_expires_at" not in user_columns:

        conn.execute(
            "ALTER TABLE users ADD COLUMN reset_token_expires_at TEXT"
        )

    if "email_verified" not in user_columns:

        conn.execute(
            "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"
        )

        # Accounts created before this feature existed never had a chance
        # to verify, so grandfather them in rather than locking them out.
        conn.execute(
            "UPDATE users SET email_verified = 1"
        )

    if "verify_token_hash" not in user_columns:

        conn.execute(
            "ALTER TABLE users ADD COLUMN verify_token_hash TEXT"
        )

    if "verify_token_expires_at" not in user_columns:

        conn.execute(
            "ALTER TABLE users ADD COLUMN verify_token_expires_at TEXT"
        )

    if "user_id" not in order_columns:

        conn.execute(
            """
            ALTER TABLE orders
            ADD COLUMN user_id INTEGER
            """
        )

    if "customizations" not in order_columns:

        conn.execute(
            """
            ALTER TABLE orders
            ADD COLUMN customizations TEXT
            """
        )

    if "customization_files" not in order_columns:

        conn.execute(
            """
            ALTER TABLE orders
            ADD COLUMN customization_files TEXT
            """
        )

    if "payment_method" not in order_columns:

        conn.execute(
            """
            ALTER TABLE orders
            ADD COLUMN payment_method TEXT
            """
        )

    conn.commit()

    conn.close()


init_db()


# ============================================================
# PRODUCT HELPERS
# ============================================================

def find_product(slug):

    for product in PRODUCTS:

        if product["slug"] == slug:
            return product

    return None


def find_product_by_id(product_id):

    try:
        product_id = int(product_id)

    except (
        TypeError,
        ValueError
    ):
        return None

    for product in PRODUCTS:

        if product["id"] == product_id:
            return product

    return None


def find_product_by_name(name):

    name = (
        name or ""
    ).strip()

    for product in PRODUCTS:

        if product["name"] == name:
            return product

    return None


# ============================================================
# CART HELPERS
# ============================================================

def get_cart():

    cart = session.get(
        "cart",
        []
    )

    if not isinstance(
        cart,
        list
    ):
        cart = []

    return cart


def save_cart(cart):

    session["cart"] = cart

    session.modified = True


def cart_count():

    total = 0

    for item in get_cart():

        try:

            total += int(
                item.get(
                    "quantity",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):
            pass

    return total


def build_cart_item(
    product,
    quantity,
    packaging_type,
    customized=False,
    customization=None,
    files=None,
):
    """
    Keep all cart fields in one consistent format.
    This makes the product, cart, checkout and
    order-history templates work with the same data.
    """

    return {
        "cart_id": uuid.uuid4().hex,

        "product_id": product["id"],
        "product_slug": product["slug"],
        "product_name": product["name"],

        # Template-friendly aliases
        "id": product["id"],
        "slug": product["slug"],
        "name": product["name"],
        "category": product["category"],
        "image": product["image"],
        "description": product["description"],
        "sizes": product["sizes"],

        "quantity": int(quantity),

        "customized": bool(customized),

        "customization": (
            customization
            if customized
            else None
        ),

        "files": files or [],
    }


# ============================================================
# USER HELPERS
# ============================================================

def current_user():

    user_id = session.get(
        "user_id"
    )

    if not user_id:
        return None

    conn = db()

    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    conn.close()

    return user


def login_required(view):

    @wraps(view)
    def wrapped(*args, **kwargs):

        # A session can outlive a user record (for example after a
        # database reset/redeploy). Validate the actual user instead of
        # trusting only the session ID, so stale sessions never cause a
        # 500 error on /account or other protected pages.
        user = current_user()

        if user is None:

            session.pop(
                "user_id",
                None
            )

            flash(
                "Your session has expired. Please log in again."
            )

            return redirect(
                url_for(
                    "login",
                    next=request.path
                )
            )

        return view(
            *args,
            **kwargs
        )

    return wrapped


def admin_required(view):

    @wraps(view)
    def wrapped(*args, **kwargs):

        if not session.get(
            "admin"
        ):

            return redirect(
                url_for("admin")
            )

        return view(
            *args,
            **kwargs
        )

    return wrapped


# ============================================================
# GENERAL HELPERS
# ============================================================

def allowed_packaging_type(value):

    if value in {
        "Bakery Packaging",
        "Food Packaging",
    }:
        return value

    return "Food Packaging"


def utc_now():

    return (
        datetime.utcnow()
        .isoformat(
            timespec="seconds"
        )
        + "Z"
    )


def safe_json_loads(
    value,
    fallback
):
    try:

        if not value:
            return fallback

        return json.loads(
            value
        )

    except (
        TypeError,
        json.JSONDecodeError
    ):
        return fallback


# ============================================================
# ORDER CONVERSION
# ============================================================

def parse_order_items(
    items_text,
    customizations=None
):
    """
    Convert the compact database representation back
    into proper dictionaries for the website.

    Stored example:

    Product Name — 10 unit(s) — Food Packaging — CUSTOMIZED
    """

    customizations = (
        customizations
        or []
    )

    lines = (
        items_text or ""
    ).splitlines()

    items = []

    customization_index = 0

    for line in lines:

        line = line.strip()

        if not line:
            continue

        parts = [
            part.strip()
            for part in line.split(" — ")
        ]

        product_name = (
            parts[0]
            if parts
            else "Product"
        )

        product = find_product_by_name(
            product_name
        )

        quantity = 1

        packaging_type = (
            "Food Packaging"
        )

        customized = (
            "CUSTOMIZED" in line
        )

        for part in parts[1:]:

            if "unit(s)" in part:

                number = (
                    part
                    .replace(
                        "unit(s)",
                        ""
                    )
                    .strip()
                )

                try:
                    quantity = int(
                        number
                    )

                except ValueError:
                    quantity = 1

            elif part in {
                "Bakery Packaging",
                "Food Packaging",
            }:

                packaging_type = part

        if product:

            item = build_cart_item(
                product=product,
                quantity=quantity,
                packaging_type=packaging_type,
                customized=customized,
                customization=None,
                files=[],
            )

        else:

            item = {
                "cart_id": uuid.uuid4().hex,
                "product_id": None,
                "product_slug": "",
                "product_name": product_name,

                "id": None,
                "slug": "",
                "name": product_name,
                "category": "Packaging",
                "image": "",
                "description": "",

                "quantity": quantity,
                "packaging_type": packaging_type,

                "customized": customized,
                "customization": None,
                "files": [],
            }


        if customized:

            if (
                customization_index
                < len(customizations)
            ):

                item["customization"] = (
                    customizations[
                        customization_index
                    ]
                )

            customization_index += 1


        items.append(item)

    return items


def order_view(row):

    data = dict(row)

    customizations = safe_json_loads(
        data.get(
            "customizations"
        ),
        []
    )

    customization_files = safe_json_loads(
        data.get(
            "customization_files"
        ),
        []
    )

    items = parse_order_items(
        data.get("items"),
        customizations
    )

    data["items_text"] = (
        data.get("items")
        or ""
    )

    data["items"] = items

    data["customization_list"] = (
        customizations
    )

    data["customization_files"] = (
        customization_files
    )

    data["customization_file_list"] = (
        customization_files
    )

    data["has_customization"] = any(
        item.get("customized")
        for item in items
    )

    data["customization"] = (
        customizations[0]
        if customizations
        else None
    )

    return data


def raw_order_view(row):

    """
    Used by the admin customer-history
    template which expects the original
    text stored in order.items.
    """

    data = dict(row)

    data["customization_file_list"] = (
        safe_json_loads(
            data.get(
                "customization_files"
            ),
            []
        )
    )

    return data


# ============================================================
# TEMPLATE GLOBALS
# ============================================================

@app.template_filter("from_json")
def from_json_filter(value):
    try:
        return json.loads(value or "[]")
    except (TypeError, ValueError):
        return []


@app.context_processor
def inject_globals():

    return {
        "business": BUSINESS,
        "products": PRODUCTS,
        "product_categories": PRODUCT_CATEGORIES,
        "cart_count": cart_count(),
        "current_user": current_user(),
    }


# ============================================================
# HOME
# ============================================================

@app.get(
    "/",
    endpoint="home"
)
@app.get(
    "/",
    endpoint="index"
)
def home():

    conn = db()
    conn.close()

    return render_template(
        "index.html"
    )


# ============================================================
# PRODUCTS
# ============================================================

@app.get(
    "/products",
    endpoint="products_page"
)
@app.get(
    "/products",
    endpoint="products"
)
def products_page():

    return render_template(
        "category_products.html",
        products=PRODUCTS,
        category_name="All Disposable Food Packaging & Food-Service Products",
        category_description=(
            "Explore Packaroji's complete range of disposable food packaging, "
            "takeaway packaging and food-service essentials, including bowls, "
            "cups, plates, bags, boxes, containers, trays, pouches, wraps and disposable cutlery."
        ),
        category_icon="📦",
        is_all_products=True,
    )


@app.get("/products/category/<category_slug>")
def product_category_page(category_slug):

    normalized_slug = category_slug.strip().lower()
    category = next(
        (item for item in PRODUCT_CATEGORIES
         if item["name"].lower().replace(" & ", "-").replace(" ", "-") == normalized_slug),
        None,
    )

    # Also accept simple slugs such as wraps-liners.
    if not category and normalized_slug == "wraps-liners":
        category = next((item for item in PRODUCT_CATEGORIES if item["name"] == "Wraps & Liners"), None)

    if not category:
        return render_template("404.html"), 404

    products = [p for p in PRODUCTS if p.get("category") == category["name"]]

    return render_template(
        "category_products.html",
        products=products,
        category_name=category["name"],
        category_description=(
            f"Shop {category['name'].lower()} for restaurants, cafés, bakeries, "
            "cloud kitchens, caterers and takeaway businesses. Explore product details, "
            "food-service uses, customization options and business ordering."
        ),
        category_icon=category["icon"],
        is_all_products=False,
    )


@app.get("/products/collection/<collection_slug>")
def product_collection_page(collection_slug):
    slug = collection_slug.strip().lower()
    collections = {
        "food-wrapping": {
            "name": "Food Wrapping",
            "description": "The layer that touches the food directly: aluminium foil, kraft & butter paper rolls, wrap sheets.",
            "kind": "layer1",
            "products": lambda: [p for p in PRODUCTS if p.get("layer") == "Layer 1 — Food Wrapping" and p.get("slug") != "branding-options"],
        },
        "main-portion-packaging": {
            "name": "Main Portion Packaging",
            "description": "Sustainably sourced materials — aluminium, kraft paper, and sugarcane bagasse — engineered for heat retention, grease resistance, and full biodegradability, from the first wrap to the final bite.",
            "kind": "layer2",
            "products": lambda: [p for p in PRODUCTS if p.get("layer") == "Layer 2 — Main Portion Packaging"],
        },
        "takeout-delivery": {
            "name": "Takeout & Delivery",
            "description": "Takeout & delivery packaging designed for food businesses, from everyday takeaway bags to higher-capacity delivery formats.",
            "kind": "layer3",
            "products": lambda: [p for p in PRODUCTS if p.get("layer") == "Layer 3 — Takeout & Delivery"],
        },
        "branding": {
            "name": "Branding Options",
            "description": "Branded packaging that helps cafes, bakeries, restaurants and food-service businesses carry their identity from the first impression to the final bite.",
            "kind": "branding",
            "products": lambda: [p for p in PRODUCTS if p.get("brandable")],
        },
    }
    collection = collections.get(slug)
    if not collection:
        return render_template("404.html"), 404

    # Layer 2 is intentionally a small material-selection hub.
    # Each material opens its own product page instead of showing every product here.
    if slug == "main-portion-packaging":
        layer2_materials = [
            {"name": "Aluminium Packaging", "slug": "aluminium-packaging", "category": "Aluminium Foil Packaging", "image": "catalogue/foil-single-compartment.jpg"},
            {"name": "Kraft Paper Packaging", "slug": "kraft-paper-packaging", "category": "Kraft Paper Packaging", "image": "catalogue/open-food-trays-boats.jpg"},
            {"name": "Sugarcane Bagasse", "slug": "sugarcane-bagasse", "category": "Sugarcane Bagasse", "image": "catalogue/bagasse-single-clamshell.jpg"},
        ]
        return render_template(
            "category_products.html",
            products=[],
            category_name=collection["name"],
            category_description=collection["description"],
            category_icon="📦",
            is_all_products=False,
            is_collection=True,
            collection_kind=collection["kind"],
            layer2_materials=layer2_materials,
            layer2_grouped_products={},
        )

    return render_template(
        "category_products.html",
        products=collection["products"](),
        category_name=collection["name"],
        category_description=collection["description"],
        category_icon="✨" if slug == "branding" else "📦",
        is_all_products=False,
        is_collection=True,
        collection_kind=collection["kind"],
        layer2_materials=[],
        layer2_grouped_products={},
    )


@app.get("/products/collection/main-portion-packaging/<material_slug>")
def layer2_material_page(material_slug):
    materials = {
        "aluminium-packaging": "Aluminium Foil Packaging",
        "kraft-paper-packaging": "Kraft Paper Packaging",
        "sugarcane-bagasse": "Sugarcane Bagasse",
    }
    category = materials.get(material_slug.strip().lower())
    if not category:
        return render_template("404.html"), 404
    products = [p for p in PRODUCTS if p.get("layer") == "Layer 2 — Main Portion Packaging" and p.get("category") == category]
    return render_template(
        "category_products.html",
        products=products,
        category_name=category,
        category_description=f"{category} products from the Packaroji catalogue.",
        category_icon="📦",
        is_all_products=False,
        is_collection=True,
        collection_kind="layer2-material",
        material_name=category,
        layer2_materials=[],
        layer2_grouped_products={},
    )


@app.get("/products/bakery")
def bakery_products():
    # Bakery has been removed as a standalone page.
    # Send users directly to the homepage product slider instead.
    return redirect(url_for("home") + "#packaging-options")


@app.get(
    "/products/food"
)
def food_products():

    food = [
        product
        for product in PRODUCTS
        if "Food Packaging"
        in product[
            "packaging_categories"
        ]
    ]

    return render_template(
        "food.html",
        products=food,
        page_title="Food Packaging"
    )


# ============================================================
# INDIVIDUAL PRODUCT
# ============================================================

@app.get(
    "/product/<slug>"
)
def product_detail(slug):

    product = find_product(
        slug
    )

    if not product:

        return render_template(
            "404.html"
        ), 404

    return render_template(
        "product.html",
        product=product
    )


# ============================================================
# CUSTOMIZATION PAGE
# ============================================================

@app.get(
    "/order"
)
def order_page():

    product_slug = request.args.get(
        "product",
        ""
    ).strip()

    packaging_type = allowed_packaging_type(
        request.args.get(
            "packaging_type",
            "Food Packaging"
        )
    )

    selected_product = None

    if product_slug:

        selected_product = find_product(
            product_slug
        )

    return render_template(
        "order.html",
        selected_product=selected_product,
        selected_packaging_type=packaging_type,
    )


# ============================================================
# CART PAGE
# ============================================================

@app.get(
    "/cart",
    endpoint="cart_page"
)
@app.get(
    "/cart",
    endpoint="cart"
)
def cart_page():

    return render_template(
        "cart.html",
        cart=get_cart()
    )


# ============================================================
# ADD STANDARD PRODUCT TO CART
# ============================================================

@app.post(
    "/cart/add"
)
def add_to_cart():

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    product_slug = (
        request.form.get(
            "product",
            ""
        ).strip()
        or str(
            data.get(
                "product",
                ""
            )
        ).strip()
    )

    packaging_type = (
        request.form.get(
            "packaging_type",
            ""
        ).strip()
        or str(
            data.get(
                "packaging_type",
                ""
            )
        ).strip()
    )

    packaging_type = allowed_packaging_type(
        packaging_type
    )


    quantity_value = (
        request.form.get(
            "quantity",
            ""
        ).strip()
        or str(
            data.get(
                "quantity",
                "1"
            )
        )
    )


    try:

        quantity = int(
            quantity_value
        )

    except ValueError:

        quantity = 1


    if quantity < 1:
        quantity = 1


    product = find_product(
        product_slug
    )


    if not product:

        return jsonify({
            "ok": False,
            "success": False,
            "message": "Product not found.",
        }), 404


    cart = get_cart()


    for item in cart:

        if (
            item.get(
                "product_slug"
            )
            == product_slug
            and not item.get(
                "customized",
                False
            )
            and item.get(
                "packaging_type"
            )
            == packaging_type
        ):

            item["quantity"] = (
                int(
                    item.get(
                        "quantity",
                        0
                    )
                )
                + quantity
            )

            save_cart(cart)

            return jsonify({
                "ok": True,
                "success": True,
                "message": (
                    f"{product['name']} "
                    "added to cart."
                ),
                "cart_count": cart_count(),
            })


    cart.append(
        build_cart_item(
            product=product,
            quantity=quantity,
            packaging_type=packaging_type,
            customized=False,
        )
    )


    save_cart(cart)


    return jsonify({
        "ok": True,
        "success": True,
        "message": (
            f"{product['name']} "
            "added to cart."
        ),
        "cart_count": cart_count(),
    })


# ============================================================
# UPDATE CART
# ============================================================

@app.post(
    "/cart/update"
)
def update_cart():

    cart_id = request.form.get(
        "cart_id",
        ""
    ).strip()

    # Support older template field
    if not cart_id:

        cart_id = request.form.get(
            "product",
            ""
        ).strip()


    try:

        quantity = int(
            request.form.get(
                "quantity",
                "1"
            )
        )

    except ValueError:

        quantity = 1


    new_cart = []


    for item in get_cart():

        if item.get(
            "cart_id"
        ) == cart_id:

            if quantity > 0:

                item["quantity"] = quantity

                new_cart.append(item)

        else:

            new_cart.append(item)


    save_cart(
        new_cart
    )


    return redirect(
        url_for(
            "cart_page"
        )
    )


# ============================================================
# REMOVE FROM CART
# ============================================================

@app.post(
    "/cart/remove"
)
def remove_from_cart():

    cart_id = request.form.get(
        "cart_id",
        ""
    ).strip()


    if not cart_id:

        cart_id = request.form.get(
            "product",
            ""
        ).strip()


    cart = [
        item
        for item in get_cart()
        if item.get(
            "cart_id"
        )
        != cart_id
    ]


    save_cart(
        cart
    )


    return redirect(
        url_for(
            "cart_page"
        )
    )


# ============================================================
# CLEAR CART
# ============================================================

@app.post(
    "/cart/clear"
)
def clear_cart():

    save_cart([])

    return redirect(
        url_for(
            "cart_page"
        )
    )


# ============================================================
# CUSTOMIZATION → CART
# ============================================================

@app.post(
    "/cart/customize"
)
def add_customized_to_cart():

    product_slug = request.form.get(
        "product",
        ""
    ).strip()


    product = find_product(
        product_slug
    )


    if not product:

        return jsonify({
            "ok": False,
            "message": "Product not found.",
        }), 404


    packaging_type = allowed_packaging_type(
        request.form.get(
            "packaging_type",
            "Food Packaging"
        ).strip()
    )


    try:

        quantity = int(
            request.form.get(
                "quantity",
                "1"
            )
        )

    except ValueError:

        quantity = 1


    if quantity < 1:
        quantity = 1


    # ========================================================
    # EXACT CUSTOMER CUSTOMIZATION DETAILS
    # ========================================================

    customization = {

        "product": product["name"],

        "quantity": quantity,

        "packaging_type": packaging_type,

        "description": request.form.get(
            "custom_description",
            ""
        ).strip(),

        "dimensions": "",
        "shape": "",
        "color": "",

        "printing": request.form.get(
            "custom_printing",
            ""
        ).strip(),

        "branding": request.form.get(
            "custom_branding",
            ""
        ).strip(),

        "additional": request.form.get(
            "custom_additional",
            ""
        ).strip(),
    }


    # ========================================================
    # FILE UPLOADS
    # ========================================================

    uploaded_files = []


    total_size = 0


    for uploaded in request.files.getlist(
        "customization_files"
    ):

        if (
            not uploaded
            or not uploaded.filename
        ):
            continue


        original_name = secure_filename(
            uploaded.filename
        )


        if (
            not original_name
            or "." not in original_name
        ):

            return jsonify({
                "ok": False,
                "message": (
                    "One of the uploaded "
                    "files has an invalid filename."
                ),
            }), 400


        extension = (
            original_name
            .rsplit(
                ".",
                1
            )[1]
            .lower()
        )


        if extension not in ALLOWED_UPLOADS:

            return jsonify({
                "ok": False,
                "message": (
                    "Allowed files are PNG, JPG, "
                    "JPEG, WEBP, PDF or SVG."
                ),
            }), 400


        uploaded.seek(0, 2)

        file_size = uploaded.tell()

        uploaded.seek(0)


        total_size += file_size


        if total_size > (
            16 * 1024 * 1024
        ):

            return jsonify({
                "ok": False,
                "message": (
                    "The selected files are "
                    "larger than the 16 MB total limit."
                ),
            }), 413


        stored_name = (
            f"{uuid.uuid4().hex}_"
            f"{original_name}"
        )


        uploaded.save(
            os.path.join(
                UPLOAD_DIR,
                stored_name
            )
        )


        uploaded_files.append({

            "original_name":
                original_name,

            "stored_name":
                stored_name,

        })


    # ========================================================
    # ADD TO CART
    # ========================================================

    cart = get_cart()


    cart.append(
        build_cart_item(
            product=product,
            quantity=quantity,
            packaging_type=packaging_type,
            customized=True,
            customization=customization,
            files=uploaded_files,
        )
    )


    save_cart(
        cart
    )


    return jsonify({
        "ok": True,
        "message": (
            f"{product['name']} "
            "customization was added to your cart."
        ),
        "cart_count": cart_count(),
    })


# ============================================================
# CHECKOUT
# ============================================================

@app.route(
    "/checkout",
    methods=[
        "GET",
        "POST"
    ]
)
@login_required
def checkout():

    cart = get_cart()


    if not cart:

        flash(
            "Your cart is empty."
        )

        return redirect(
            url_for(
                "cart_page"
            )
        )


    user = current_user()


    # --------------------------------------------------------
    # DISPLAY CHECKOUT
    # --------------------------------------------------------

    if request.method == "GET":

        return render_template(
            "checkout.html",
            cart=cart,
            user=user,
        )


    # --------------------------------------------------------
    # ACCEPT BOTH OLD AND NEW FIELD NAMES
    # --------------------------------------------------------

    customer_name = (
        request.form.get(
            "customer_name",
            ""
        ).strip()
        or request.form.get(
            "name",
            ""
        ).strip()
    )


    business_name = request.form.get(
        "business_name",
        ""
    ).strip()


    phone = request.form.get(
        "phone",
        ""
    ).strip()


    email = (
        request.form.get(
            "email",
            ""
        ).strip()
        or (
            user["email"]
            if user
            else ""
        )
    )


    address = request.form.get(
        "address",
        ""
    ).strip()


    notes = request.form.get(
        "notes",
        ""
    ).strip()

    payment_method = request.form.get(
        "payment_method",
        "cod"
    ).strip().lower()

    if payment_method not in {"cod", "upi"}:
        payment_method = "cod"


    if (
        not customer_name
        or not phone
        or not address
    ):

        flash(
            "Please enter your name and phone number."
        )

        return redirect(
            url_for(
                "checkout"
            )
        )


    # ========================================================
    # BUILD SAVED ORDER
    # ========================================================

    item_lines = []

    customizations = []

    customization_files = []


    for item in cart:

        line = (
            f"{item.get('product_name')} — "
            f"{item.get('quantity')} unit(s) — "
            f"{item.get('packaging_type')}"
        )


        if item.get(
            "customized"
        ):

            line += (
                " — CUSTOMIZED"
            )


            customization = (
                item.get(
                    "customization"
                )
                or {}
            )


            customizations.append(
                customization
            )


            for file_data in item.get(
                "files",
                []
            ):

                customization_files.append(
                    file_data
                )


        item_lines.append(
            line
        )


    conn = db()


    cursor = conn.execute(
        """
        INSERT INTO orders (
            created_at,
            user_id,
            customer_name,
            business_name,
            phone,
            email,
            address,
            items,
            notes,
            status,
            customizations,
            customization_files,
            payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            utc_now(),

            user["id"]
            if user
            else None,

            customer_name,

            business_name,

            phone,

            email,

            address,

            "\n".join(
                item_lines
            ),

            notes,

            "New",

            json.dumps(
                customizations,
                ensure_ascii=False
            ),

            json.dumps(
                customization_files,
                ensure_ascii=False
            ),

            payment_method,
        )
    )


    conn.commit()


    order_id = cursor.lastrowid

    new_order = {
        "customer_name": customer_name,
        "business_name": business_name,
        "phone": phone,
        "email": email,
        "address": address,
        "items": "\n".join(item_lines),
        "notes": notes,
        "status": "New",
        "payment_method": payment_method,
    }

    # Notifications must never cancel an otherwise successful order.
    send_new_order_notification(order_id, new_order)
    send_customer_order_confirmation(order_id, new_order)

    conn.close()


    # Empty cart only after successful DB save
    save_cart([])


    flash(
        "Your order request has been received. "
        "Packaroji will contact you with pricing "
        "and availability."
    )


    return redirect(
        url_for(
            "customer_order_detail",
            order_id=order_id
        )
    )


# ============================================================
# CUSTOMER / ADMIN NOTIFICATIONS
# ============================================================

def _smtp_ready():
    return bool(
        SMTP_HOST
        and SMTP_USERNAME
        and SMTP_PASSWORD
        and SMTP_FROM_EMAIL
    )


def send_email(to_email, subject, body):
    """Send a plain-text email through the configured SMTP server."""
    if not (_smtp_ready() and to_email):
        app.logger.warning("Packaroji email not sent: SMTP settings or recipient are missing.")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = to_email
    message.set_content(body)

    try:
        context = ssl.create_default_context()
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=20) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.starttls(context=context)
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        app.logger.exception("Unable to send Packaroji email to %s", to_email)
        return False


def send_whatsapp_text(message_text, to_number=None):
    """Send an admin WhatsApp text using Meta WhatsApp Cloud API.

    For production, Meta may require an approved template when initiating
    a business-initiated conversation. If a template name is configured,
    send_whatsapp_template() should be used instead.
    """
    if not (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID and (to_number or WHATSAPP_ADMIN_TO)):
        app.logger.warning("Packaroji WhatsApp notification not sent: WhatsApp settings are incomplete.")
        return False

    recipient = (to_number or WHATSAPP_ADMIN_TO).replace("+", "").replace(" ", "").replace("-", "")
    url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"preview_url": False, "body": message_text},
    }
    return _post_whatsapp(url, payload)


def send_whatsapp_template(template_name, body_params, to_number=None):
    """Send an approved Meta WhatsApp template message."""
    if not (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID and template_name and (to_number or WHATSAPP_ADMIN_TO)):
        app.logger.warning("Packaroji WhatsApp template not sent: WhatsApp settings are incomplete.")
        return False

    recipient = (to_number or WHATSAPP_ADMIN_TO).replace("+", "").replace(" ", "").replace("-", "")
    url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": WHATSAPP_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(value)} for value in body_params],
            }],
        },
    }
    return _post_whatsapp(url, payload)


def _post_whatsapp(url, payload):
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib_request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib_request.urlopen(req, timeout=20) as response:
            response.read()
        return True
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        app.logger.error("WhatsApp API returned %s: %s", exc.code, details)
        return False
    except (OSError, URLError):
        app.logger.exception("Unable to send Packaroji WhatsApp notification")
        return False


def build_order_notification_text(order_id, order):
    return (
        f"New Packaroji order PK-{int(order_id):05d}\n\n"
        f"Customer: {order.get('customer_name') or '—'}\n"
        f"Business: {order.get('business_name') or '—'}\n"
        f"Email: {order.get('email') or '—'}\n"
        f"Phone: {order.get('phone') or '—'}\n"
        f"Address: {order.get('address') or '—'}\n"
        f"Payment: {(order.get('payment_method') or '—').upper()}\n\n"
        f"Products / Quantity:\n{order.get('items') or '—'}\n\n"
        f"Notes: {order.get('notes') or '—'}\n\n"
        "Open the Packaroji Admin Orders page to review the complete order."
    )


def send_new_order_notification(order_id, order):
    """Notify the Packaroji admin by email and WhatsApp after an order is saved."""
    text = build_order_notification_text(order_id, order)
    email_sent = send_email(
        ORDER_NOTIFICATION_EMAIL,
        f"New Packaroji order PK-{int(order_id):05d}",
        text,
    )

    if WHATSAPP_TEMPLATE_NAME:
        whatsapp_sent = send_whatsapp_template(
            WHATSAPP_TEMPLATE_NAME,
            [
                f"PK-{int(order_id):05d}",
                order.get("customer_name") or "—",
                order.get("items") or "—",
            ],
        )
    else:
        whatsapp_sent = send_whatsapp_text(text)

    return email_sent or whatsapp_sent


def send_login_confirmation_email(user):
    """Notify a customer after a successful login."""
    name = user.get("name") or "there"
    return send_email(
        user.get("email"),
        "Packaroji login successful",
        f"""Hello {name},

You have successfully logged in to your Packaroji account.

Account email: {user.get('email') or '—'}

If this login was not made by you, please reset your password immediately.

Thank you,
Packaroji
{BUSINESS['phone']}
{BUSINESS['email']}
""",
    )


def send_signup_confirmation_email(user):
    """Confirm a newly created customer account by email."""
    name = user.get("name") or "there"
    return send_email(
        user.get("email"),
        "Welcome to Packaroji — your account is ready",
        f"""Hello {name},

Welcome to Packaroji. Your customer account has been created successfully.

Account email: {user.get('email') or '—'}

You can now log in to manage your account, view your orders, and place new orders.

Thank you for choosing Packaroji.

Packaroji
{BUSINESS['phone']}
{BUSINESS['email']}
""",
    )


def send_customer_order_confirmation(order_id, order):
    """Send the customer a confirmation email after an order is saved."""
    email = order.get("email")
    if not email:
        return False

    return send_email(
        email,
        f"Packaroji order received — PK-{int(order_id):05d}",
        f"""Hello {order.get('customer_name') or 'there'},

Thank you for your order request with Packaroji. We have received it successfully.

Order: PK-{int(order_id):05d}
Status: New

Products / Quantity:
{order.get('items') or '—'}

We will contact you regarding pricing, availability, and next steps.

Packaroji
{BUSINESS['phone']}
{BUSINESS['email']}
""",
    )


# ============================================================
# PASSWORD RESET HELPERS
# ============================================================

def _password_reset_hash(token):

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


# Same hashing scheme as password-reset tokens, kept as its own function so
# email-verification tokens and password-reset tokens are never mixed up.
def _verification_token_hash(token):

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def send_verification_email(email, name, verify_url):
    return send_email(
        email,
        "Verify your Packaroji account",
        f"""Hello {name or 'there'},

Thanks for creating a Packaroji account. Please verify your email address
to activate your account before logging in.

Use the link below within {EMAIL_VERIFICATION_HOURS} hours to verify:

{verify_url}

If you did not create this account, you can safely ignore this email.

Packaroji
""",
    )


def send_password_reset_email(email, name, reset_url):
    return send_email(
        email,
        "Reset your Packaroji password",
        f"""Hello {name or 'there'},

We received a request to reset your Packaroji account password.

Use the link below within {PASSWORD_RESET_MINUTES} minutes to create a new password:

{reset_url}

If you did not request this, you can safely ignore this email.

Packaroji
""",
    )


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.route(
    "/forgot-password",
    methods=[
        "GET",
        "POST"
    ]
)
def forgot_password():

    if session.get("user_id"):

        return redirect(
            url_for("account")
        )

    if request.method == "GET":

        return render_template(
            "forgot_password.html",
            email=request.args.get("email", "").strip().lower(),
        )

    email = request.form.get(
        "email",
        ""
    ).strip().lower()

    if not email:

        return render_template(
            "forgot_password.html",
            error="Please enter your email address."
        )

    conn = db()

    user = conn.execute(
        """
        SELECT id, name, email
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    if user:

        token = secrets.token_urlsafe(32)
        token_hash = _password_reset_hash(token)
        expires_at = (
            datetime.utcnow()
            + timedelta(minutes=PASSWORD_RESET_MINUTES)
        ).isoformat(timespec="seconds") + "Z"

        conn.execute(
            """
            UPDATE users
            SET reset_token_hash = ?,
                reset_token_expires_at = ?
            WHERE id = ?
            """,
            (
                token_hash,
                expires_at,
                user["id"],
            )
        )
        conn.commit()
        conn.close()

        reset_url = url_for(
            "reset_password",
            token=token,
            _external=True,
        )

        if not send_password_reset_email(
            user["email"],
            user["name"],
            reset_url,
        ):
            return render_template(
                "forgot_password.html",
                error=(
                    "Password reset email is not configured yet. "
                    "Please contact Packaroji for help."
                ),
                email=email,
            )

    else:
        conn.close()

    return render_template(
        "forgot_password.html",
        success=(
            "If an account exists for this email, a password reset "
            "link has been sent. Please check your inbox and spam folder."
        ),
        email=email,
    )


# ============================================================
# RESET PASSWORD
# ============================================================

@app.route(
    "/reset-password/<token>",
    methods=[
        "GET",
        "POST"
    ]
)
def reset_password(token):

    token_hash = _password_reset_hash(token)

    conn = db()

    user = conn.execute(
        """
        SELECT id, name, email, reset_token_expires_at
        FROM users
        WHERE reset_token_hash = ?
        """,
        (token_hash,)
    ).fetchone()

    if not user:
        conn.close()
        return render_template(
            "reset_password.html",
            error=(
                "This password reset link is invalid or has already been used."
            )
        ), 400

    try:
        expires_at = datetime.fromisoformat(
            user["reset_token_expires_at"].rstrip("Z")
        )
    except (
        TypeError,
        ValueError,
        AttributeError,
    ):
        expires_at = datetime.min

    if datetime.utcnow() > expires_at:
        conn.close()
        return render_template(
            "reset_password.html",
            error=(
                "This password reset link has expired. Please request a new one."
            )
        ), 400

    if request.method == "GET":
        conn.close()
        return render_template(
            "reset_password.html",
            token=token,
        )

    password = request.form.get(
        "password",
        ""
    )
    confirm_password = request.form.get(
        "confirm_password",
        ""
    )

    if len(password) < 6:
        conn.close()
        return render_template(
            "reset_password.html",
            token=token,
            error="Password must be at least 6 characters."
        )

    if password != confirm_password:
        conn.close()
        return render_template(
            "reset_password.html",
            token=token,
            error="Passwords do not match."
        )

    conn.execute(
        """
        UPDATE users
        SET password_hash = ?,
            reset_token_hash = NULL,
            reset_token_expires_at = NULL
        WHERE id = ?
        """,
        (
            generate_password_hash(password),
            user["id"],
        )
    )
    conn.commit()
    conn.close()

    flash(
        "Your password has been reset successfully. Please log in."
    )

    return redirect(
        url_for("login")
    )


# ============================================================
# VERIFY EMAIL
# ============================================================

@app.route(
    "/verify-email/<token>",
    methods=["GET"],
)
def verify_email(token):

    token_hash = _verification_token_hash(token)

    conn = db()

    user = conn.execute(
        """
        SELECT id, name, email, email_verified, verify_token_expires_at
        FROM users
        WHERE verify_token_hash = ?
        """,
        (token_hash,)
    ).fetchone()

    if not user:
        conn.close()
        flash(
            "This verification link is invalid or has already been used."
        )
        return redirect(url_for("login"))

    if user["email_verified"]:
        conn.close()
        flash("Your email is already verified. Please log in.")
        return redirect(url_for("login", email=user["email"]))

    try:
        expires_at = datetime.fromisoformat(
            (user["verify_token_expires_at"] or "").rstrip("Z")
        )
    except (TypeError, ValueError, AttributeError):
        expires_at = datetime.min

    if datetime.utcnow() > expires_at:
        conn.close()
        flash(
            "This verification link has expired. Enter your email below "
            "and we'll send you a new one."
        )
        return redirect(url_for("login", email=user["email"], mode="login"))

    conn.execute(
        """
        UPDATE users
        SET email_verified = 1,
            verify_token_hash = NULL,
            verify_token_expires_at = NULL
        WHERE id = ?
        """,
        (user["id"],)
    )
    conn.commit()
    conn.close()

    flash("Your email has been verified. You can now log in.")
    return redirect(url_for("login", email=user["email"]))


# ============================================================
# RESEND VERIFICATION EMAIL
# ============================================================

@app.route(
    "/resend-verification",
    methods=["POST"],
)
def resend_verification():

    email = request.form.get(
        "email", ""
    ).strip().lower()

    if not email:
        flash("Please enter your email address, then try again.")
        return redirect(url_for("login"))

    conn = db()

    user = conn.execute(
        """
        SELECT id, name, email, email_verified
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    if user and not user["email_verified"]:

        token = secrets.token_urlsafe(32)
        token_hash = _verification_token_hash(token)
        expires_at = (
            datetime.utcnow()
            + timedelta(hours=EMAIL_VERIFICATION_HOURS)
        ).isoformat(timespec="seconds") + "Z"

        conn.execute(
            """
            UPDATE users
            SET verify_token_hash = ?,
                verify_token_expires_at = ?
            WHERE id = ?
            """,
            (token_hash, expires_at, user["id"])
        )
        conn.commit()

        verify_url = url_for(
            "verify_email",
            token=token,
            _external=True,
        )

        send_verification_email(user["email"], user["name"], verify_url)

    conn.close()

    flash(
        "If that email needs verification, a new link has been sent. "
        "Please check your inbox and spam folder."
    )
    return redirect(url_for("login", email=email))


# ============================================================
# SIGN UP
# ============================================================

@app.route(
    "/signup",
    methods=[
        "GET",
        "POST"
    ]
)
def signup():

    if session.get(
        "user_id"
    ):

        return redirect(
            url_for(
                "account"
            )
        )


    if request.method == "GET":

        return redirect(
            url_for("login", mode="signup")
        )


    name = request.form.get(
        "name",
        ""
    ).strip()


    email = request.form.get(
        "email",
        ""
    ).strip().lower()


    phone = request.form.get(
        "phone",
        ""
    ).strip()


    password = request.form.get(
        "password",
        ""
    )


    confirm_password = request.form.get(
        "confirm_password",
        ""
    )


    if not name or not email or not password:

        flash(
            "Please fill in all required fields."
        )

        return render_template(
            "login.html",
            error="Please fill in all required fields.",
            auth_mode="signup",
        )


    if password != confirm_password:

        flash(
            "Passwords do not match."
        )

        return render_template(
            "login.html",
            error="Passwords do not match.",
            auth_mode="signup",
        )


    if len(password) < 6:

        flash(
            "Password must be at least 6 characters."
        )

        return render_template(
            "login.html",
            error="Password must be at least 6 characters.",
            auth_mode="signup",
        )


    conn = db()


    existing = conn.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()


    if existing:

        conn.close()

        return render_template(
            "login.html",
            error=(
                "This email is already registered. Please log in or use "
                "Forgot Password if you cannot remember your password."
            ),
            entered_email=email,
            auth_mode="login",
        )


    password_hash = generate_password_hash(
        password
    )


    cursor = conn.execute(
        """
        INSERT INTO users (
            created_at,
            name,
            email,
            phone,
            password_hash,
            email_verified
        )
        VALUES (?, ?, ?, ?, ?, 0)
        """,
        (
            utc_now(),
            name,
            email,
            phone,
            password_hash,
        )
    )


    user_id = cursor.lastrowid

    token = secrets.token_urlsafe(32)
    token_hash = _verification_token_hash(token)
    expires_at = (
        datetime.utcnow()
        + timedelta(hours=EMAIL_VERIFICATION_HOURS)
    ).isoformat(timespec="seconds") + "Z"

    conn.execute(
        """
        UPDATE users
        SET verify_token_hash = ?,
            verify_token_expires_at = ?
        WHERE id = ?
        """,
        (
            token_hash,
            expires_at,
            user_id,
        )
    )

    verify_url = url_for(
        "verify_email",
        token=token,
        _external=True,
    )

    if not send_verification_email(email, name, verify_url):

        # Don't leave an unverifiable account behind — let them try again
        # once email sending is working.
        conn.execute(
            "DELETE FROM users WHERE id = ?",
            (user_id,)
        )
        conn.commit()
        conn.close()

        return render_template(
            "login.html",
            error=(
                "We couldn't send a verification email right now. Please "
                "try again in a few minutes, or contact Packaroji for help."
            ),
            entered_email=email,
            auth_mode="signup",
        )

    conn.commit()
    conn.close()


    flash(
        "Your Packaroji account has been created. Please check your inbox "
        "(and spam folder) for a verification link before logging in."
    )


    return redirect(
        url_for(
            "login",
            email=email,
        )
    )


# ============================================================
# LOGIN
# ============================================================

@app.route(
    "/login",
    methods=[
        "GET",
        "POST"
    ]
)
def login():

    if session.get(
        "user_id"
    ):

        return redirect(
            url_for(
                "account"
            )
        )


    if request.method == "GET":

        return render_template(
            "login.html",
            entered_email=request.args.get("email", "").strip().lower(),
        )


    email = request.form.get(
        "email",
        ""
    ).strip().lower()


    password = request.form.get(
        "password",
        ""
    )


    conn = db()


    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()


    conn.close()


    if not user:

        return render_template(
            "login.html",
            error=(
                "No account was found with this email. Please check the "
                "email or sign up for a Packaroji account."
            ),
            entered_email=email,
        )


    if not check_password_hash(
        user["password_hash"],
        password
    ):

        return render_template(
            "login.html",
            error=(
                "The password is incorrect. Please try again or use "
                "Forgot Password to reset it from your email."
            ),
            entered_email=email,
        )


    if not user["email_verified"]:

        return render_template(
            "login.html",
            error=(
                "Please verify your email before logging in. Check your "
                "inbox (and spam folder) for the verification link we sent "
                "when you signed up."
            ),
            entered_email=email,
            needs_verification=True,
        )


    session["user_id"] = user["id"]

    # Send a successful-login confirmation. Email delivery failures are
    # logged but never block the user's login.
    send_login_confirmation_email(dict(user))


    next_page = request.args.get(
        "next"
    )


    if (
        next_page
        and next_page.startswith("/")
    ):

        return redirect(
            next_page
        )


    return redirect(
        url_for(
            "account"
        )
    )


# ============================================================
# LOGOUT
# ============================================================

@app.get(
    "/logout"
)
def logout():

    session.pop(
        "user_id",
        None
    )

    flash(
        "You have been logged out."
    )

    return redirect(
        url_for(
            "home"
        )
    )


# ============================================================
# ACCOUNT
# ============================================================

@app.get(
    "/account"
)
@login_required
def account():

    user = current_user()

    # Defensive guard for any direct call/path that reaches this view.
    # login_required normally handles this case, but the account page
    # should never crash if a session references a missing user.
    if user is None:
        session.pop(
            "user_id",
            None
        )
        flash(
            "Your session has expired. Please log in again."
        )
        return redirect(
            url_for(
                "login",
                next=request.path
            )
        )


    conn = db()


    rows = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user["id"],)
    ).fetchall()


    conn.close()


    orders = [
        order_view(row)
        for row in rows
    ]


    return render_template(
        "account.html",
        user=user,
        orders=orders,
    )


# ============================================================
# CUSTOMER ORDERS
# ============================================================

@app.get(
    "/orders",
    endpoint="customer_orders"
)
@app.get(
    "/orders",
    endpoint="orders"
)
@login_required
def customer_orders():

    user = current_user()


    conn = db()


    rows = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user["id"],)
    ).fetchall()


    conn.close()


    orders = [
        order_view(row)
        for row in rows
    ]


    return render_template(
        "orders.html",
        orders=orders
    )


# ============================================================
# CUSTOMER ORDER DETAIL
# ============================================================

@app.get(
    "/orders/<int:order_id>"
)
@login_required
def customer_order_detail(
    order_id
):

    user = current_user()


    conn = db()


    row = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE id = ?
        AND user_id = ?
        """,
        (
            order_id,
            user["id"]
        )
    ).fetchone()


    conn.close()


    if not row:

        return render_template(
            "404.html"
        ), 404


    order = order_view(
        row
    )


    return render_template(
        "order_detail.html",
        order=order
    )


# ============================================================
# REORDER
# ============================================================

@app.route(
    "/orders/<int:order_id>/reorder",
    methods=[
        "GET",
        "POST"
    ]
)
@login_required
def reorder(
    order_id
):

    user = current_user()


    conn = db()


    row = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE id = ?
        AND user_id = ?
        """,
        (
            order_id,
            user["id"]
        )
    ).fetchone()


    conn.close()


    if not row:

        if request.method == "POST":

            return jsonify({
                "ok": False,
                "message": "Order not found.",
            }), 404

        return render_template(
            "404.html"
        ), 404


    order = order_view(
        row
    )


    cart = get_cart()


    for item in order["items"]:

        product = find_product(
            item.get(
                "slug",
                ""
            )
        )


        if not product:
            continue


        if item.get(
            "customized"
        ):

            cart.append(
                build_cart_item(
                    product=product,
                    quantity=item.get(
                        "quantity",
                        1
                    ),
                    packaging_type=item.get(
                        "packaging_type",
                        "Food Packaging"
                    ),
                    customized=True,
                    customization=item.get(
                        "customization"
                    ),
                    files=order.get(
                        "customization_files",
                        []
                    ),
                )
            )


        else:

            # Add standard items again.
            # Similar standard items are merged.
            merged = False


            for existing in cart:

                if (
                    existing.get(
                        "product_slug"
                    )
                    == product["slug"]

                    and not existing.get(
                        "customized",
                        False
                    )
                ):

                    existing["quantity"] = (
                        int(
                            existing.get(
                                "quantity",
                                0
                            )
                        )
                        + int(
                            item.get(
                                "quantity",
                                1
                            )
                        )
                    )

                    merged = True

                    break


            if not merged:

                cart.append(
                    build_cart_item(
                        product=product,
                        quantity=item.get(
                            "quantity",
                            1
                        ),
                        packaging_type=item.get(
                            "packaging_type",
                            "Food Packaging"
                        ),
                        customized=False,
                    )
                )


    save_cart(
        cart
    )


    if request.method == "POST":

        return jsonify({
            "ok": True,
            "message": (
                "Your previous order "
                "has been added to your cart."
            ),
            "cart_count": cart_count(),
        })


    flash(
        "Your previous order has been added to your cart."
    )


    return redirect(
        url_for(
            "cart_page"
        )
    )



# ============================================================
# ADMIN PASSWORD
# ============================================================

ADMIN_PASSWORD = os.environ.get(
    "PACKAROJI_ADMIN_PASSWORD",
    "change-me"
)


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@app.route(
    "/admin",
    methods=[
        "GET",
        "POST"
    ]
)
def admin():

    if request.method == "POST":

        password = request.form.get(
            "password",
            ""
        )


        if password == ADMIN_PASSWORD:

            session["admin"] = True

            return redirect(
                url_for(
                    "admin"
                )
            )


        flash(
            "Incorrect admin password."
        )


    if not session.get(
        "admin"
    ):

        return render_template(
            "admin_login.html"
        )


    conn = db()


    order_rows = conn.execute(
        """
        SELECT
            orders.*,
            users.email AS account_email
        FROM orders
        LEFT JOIN users
            ON orders.user_id = users.id
        ORDER BY orders.id DESC
        """
    ).fetchall()


    customers = conn.execute(
        """
        SELECT
            id,
            created_at,
            name,
            email,
            phone
        FROM users
        ORDER BY id DESC
        """
    ).fetchall()


    conn.close()


    orders = [
        order_view(
            row
        )
        for row in order_rows
    ]


    customer_list = [
        dict(row)
        for row in customers
    ]


    return render_template(
        "admin.html",
        orders=orders,
        customers=customer_list
    )


# ============================================================
# ADMIN ORDER DETAIL
# ============================================================

@app.get(
    "/admin/order/<int:order_id>",
    endpoint="admin_order_detail"
)
@admin_required
def admin_order_detail(
    order_id
):

    conn = db()


    row = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE id = ?
        """,
        (order_id,)
    ).fetchone()


    conn.close()


    if not row:

        return render_template(
            "404.html"
        ), 404


    order = order_view(
        row
    )


    return render_template(
        "admin_order_detail.html",
        order=order
    )


# ============================================================
# ADMIN UPDATE STATUS
# ============================================================

@app.post(
    "/admin/order/<int:order_id>/status",
    endpoint="admin_update_order_status"
)
@app.post(
    "/admin/order/<int:order_id>/status",
    endpoint="update_order_status"
)
@admin_required
def update_order_status(
    order_id
):

    status = request.form.get(
        "status",
        "New"
    ).strip()


    allowed_statuses = {
        "New",
        "Pending",
        "Confirmed",
        "Processing",
        "Ready",
        "Shipped",
        "Delivered",
        "Completed",
        "Cancelled",
    }


    if status not in allowed_statuses:

        status = "New"


    conn = db()


    conn.execute(
        """
        UPDATE orders
        SET status = ?
        WHERE id = ?
        """,
        (
            status,
            order_id
        )
    )


    conn.commit()

    conn.close()


    return redirect(
        url_for(
            "admin"
        )
    )


# ============================================================
# ADMIN CUSTOMER ORDERS
# ============================================================

@app.get(
    "/admin/customer/<int:user_id>/orders"
)
@admin_required
def admin_customer_orders(
    user_id
):

    conn = db()


    customer = conn.execute(
        """
        SELECT *
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()


    rows = conn.execute(
        """
        SELECT *
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user_id,)
    ).fetchall()


    conn.close()


    if not customer:

        return render_template(
            "404.html"
        ), 404


    orders = [
        raw_order_view(
            row
        )
        for row in rows
    ]


    return render_template(
        "admin_customer_orders.html",
        customer=dict(customer),
        orders=orders
    )


# ============================================================
# ADMIN DOWNLOAD CUSTOMIZATION FILE
# ============================================================

@app.get(
    "/admin/order-file/<path:filename>",
    endpoint="download_customization_file"
)
@app.get(
    "/admin/order-file/<path:filename>",
    endpoint="admin_order_file"
)
def admin_order_file(
    filename
):

    if not session.get(
        "admin"
    ):

        return jsonify({
            "ok": False,
            "message": "Unauthorized.",
        }), 403


    safe_name = os.path.basename(
        filename
    )


    return send_from_directory(
        UPLOAD_DIR,
        safe_name,
        as_attachment=True
    )




# ============================================================
# ADMIN LOGOUT
# ============================================================

@app.get(
    "/admin/logout"
)
def admin_logout():

    session.pop(
        "admin",
        None
    )

    return redirect(
        url_for(
            "home"
        )
    )


# ============================================================
# LOGOUT ALL
# ============================================================

@app.get(
    "/logout-all"
)
def logout_all():

    session.clear()

    return redirect(
        url_for(
            "home"
        )
    )


# ============================================================
# SITEMAP
# ============================================================

@app.get(
    "/sitemap.xml"
)
def sitemap():

    xml = render_template(
        "sitemap.xml",
        request=request
    )

    return app.response_class(
        xml,
        mimetype="application/xml"
    )


# ============================================================
# ROBOTS
# ============================================================

@app.get(
    "/robots.txt"
)
def robots():

    sitemap_url = url_for(
        "sitemap",
        _external=True
    )


    return app.response_class(
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /admin/\n"
        "Disallow: /account\n"
        "Disallow: /orders\n"
        "Disallow: /cart\n"
        "Disallow: /checkout\n"
        "Sitemap: "
        + sitemap_url
        + "\n",
        mimetype="text/plain"
    )


# ============================================================
# 404
# ============================================================

@app.errorhandler(404)
def page_not_found(error):

    try:

        return render_template(
            "404.html"
        ), 404

    except Exception:

        return (
            "Page not found.",
            404
        )


# ============================================================
# 413
# ============================================================

@app.errorhandler(413)
def file_too_large(error):

    # JSON for AJAX customization upload
    if request.path.startswith(
        "/cart/customize"
    ):

        return jsonify({
            "ok": False,
            "message": (
                "The uploaded files are too large. "
                "Maximum total upload size is 16 MB."
            ),
        }), 413


    return (
        "The uploaded files are too large. "
        "Maximum total upload size is 16 MB.",
        413
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",

        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),

        debug=False
    )
