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
    "phone": "+91 9573917795",
    "whatsapp": "919573917795",
    "email": "wandaa0626@gmail.com",
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


# ============================================================
# PRODUCT CATEGORIES
# Edit this list later to change the visible category menu.
# ============================================================

PRODUCT_CATEGORIES = [
    {"name": "Bowls", "icon": "🥣", "image": "products/bowl.svg", "description": "Meal, salad & takeaway bowls"},
    {"name": "Cups", "icon": "🥤", "image": "products/cup.svg", "description": "Drink, sauce & portion cups"},
    {"name": "Plates", "icon": "🍽️", "image": "products/plate.svg", "description": "Plates for food service"},
    {"name": "Bags", "icon": "🛍️", "image": "products/bag.svg", "description": "Carry bags for takeaway"},
    {"name": "Containers", "icon": "🥡", "image": "products/container.svg", "description": "Food containers for orders"},
    {"name": "Boxes", "icon": "📦", "image": "products/box.svg", "description": "Meal, bakery & display boxes"},
    {"name": "Trays", "icon": "🧺", "image": "products/tray.svg", "description": "Serving & catering trays"},
    {"name": "Pouches", "icon": "🛒", "image": "products/pouch.svg", "description": "Snack, dry food & more"},
    {"name": "Wraps & Liners", "icon": "🧻", "image": "products/wrap.svg", "description": "Food wraps, liners & serving paper"},
    {"name": "Cutlery", "icon": "🍴", "image": "products/cutlery.svg", "description": "Disposable forks, spoons & sets"},
]


# ============================================================
# PRODUCTS
# ============================================================

PRODUCTS = [

    {
        "id": 1,
        "name": "Wide-Bottom Kraft Takeout Bag",
        "slug": "wide-bottom-kraft-takeout-bag",
        "category": "Bags",
        "packaging_categories": [
            "Food Packaging"
        ],
        "description": (
            "Square-bottom kraft bag built with extra depth "
            "to hold food containers, meal boxes and catering "
            "trays flat without tipping."
        ),
        "long_description": (
            "A practical kraft takeaway bag designed for "
            "restaurants, cloud kitchens, caterers and "
            "takeaway businesses. Its wide square bottom "
            "provides better stability for meal boxes, "
            "containers and takeaway orders."
        ),
        "sizes": (
            "Available in multiple sizes; confirm your "
            "required size with Packaroji."
        ),
        "material": "Kraft paper",
        "features": [
            "Wide square bottom",
            "Suitable for takeaway orders",
            "Designed for better stability",
            "Available in multiple sizes",
            "Customization available",
        ],
        "best_for": [
            "Restaurants",
            "Cloud kitchens",
            "Caterers",
            "Takeaway businesses",
        ],
        "image": "products/bag.svg",
    },


    {
        "id": 2,
        "name": "Twist-Handle Bag",
        "slug": "twist-handle-bag",
        "category": "Bags",
        "packaging_categories": [
            "Food Packaging",
            "Bakery Packaging"
        ],
        "description": (
            "Flat-bottom kraft bag with reinforced twisted "
            "paper handles."
        ),
        "long_description": (
            "A clean and practical kraft carry bag with "
            "reinforced twisted paper handles. Suitable "
            "for takeaway food, bakery orders, cafés and "
            "retail-style food packaging."
        ),
        "sizes": (
            "Available in multiple sizes; confirm your "
            "required size with Packaroji."
        ),
        "material": "Kraft paper",
        "features": [
            "Reinforced twisted handles",
            "Flat bottom",
            "Easy to carry",
            "Suitable for food and bakery orders",
            "Customization available",
        ],
        "best_for": [
            "Cafés",
            "Restaurants",
            "Bakeries",
            "Takeaway businesses",
        ],
        "image": "products/bag.svg",
    },


    {
        "id": 3,
        "name": "Windowed Lock-Corner Box",
        "slug": "windowed-lock-corner-box",
        "category": "Boxes",
        "packaging_categories": [
            "Bakery Packaging",
            "Food Packaging"
        ],
        "description": (
            "A versatile kraft box with a clear top window "
            "that displays pastries, donuts or cold lunch "
            "combos while keeping them secure."
        ),
        "long_description": (
            "A presentation-focused kraft box featuring "
            "a clear window so customers can see the product "
            "inside. The lock-corner construction helps keep "
            "the box secure during handling and delivery."
        ),
        "sizes": (
            "Available in multiple sizes; confirm your "
            "required size with Packaroji."
        ),
        "material": "Kraft paper with clear window",
        "features": [
            "Clear display window",
            "Lock-corner construction",
            "Suitable for bakery products",
            "Suitable for selected food items",
            "Customization available",
        ],
        "best_for": [
            "Bakeries",
            "Pastry shops",
            "Donut shops",
            "Cafés",
            "Food businesses",
        ],
        "image": "products/box.svg",
    },


    {
        "id": 4,
        "name": "Stand-Up Pouch with Oval Window",
        "slug": "stand-up-pouch-oval-window",
        "category": "Pouches",
        "packaging_categories": [
            "Bakery Packaging",
            "Food Packaging"
        ],
        "description": (
            "Clear front window, heat-sealable top and "
            "re-sealable zip lock — perfect for cookies, "
            "granola, dry snacks, nuts and coffee beans."
        ),
        "long_description": (
            "A stand-up pouch designed for dry food and "
            "snack products. The front window provides "
            "product visibility while the resealable "
            "closure makes it practical for products that "
            "customers may consume over multiple servings."
        ),
        "sizes": (
            "Available in multiple sizes; confirm your "
            "required size with Packaroji."
        ),
        "material": "Kraft-style flexible packaging",
        "features": [
            "Oval product window",
            "Stand-up structure",
            "Heat-sealable top",
            "Resealable zip lock",
            "Suitable for dry products",
            "Customization available",
        ],
        "best_for": [
            "Bakeries",
            "Snack brands",
            "Coffee businesses",
            "Dry-food businesses",
        ],
        "image": "products/pouch.svg",
    },


    {
        "id": 5,
        "name": (
            "Food-Safe Liners & Wraps for Fresh Food, "
            "Hot Meals & Bakery Treats"
        ),
        "slug": "food-safe-liners-wraps",
        "category": "Wraps & Liners",
        "packaging_categories": [
            "Food Packaging",
            "Bakery Packaging"
        ],
        "description": (
            "Unbleached kraft tissue or paper coated to "
            "resist oils and moisture — perfect for wrapping "
            "burgers, sandwiches, paninis and shawarmas."
        ),
        "long_description": (
            "Food-safe paper liners and wraps designed "
            "for food presentation, serving and takeaway "
            "packaging. Depending on the selected "
            "specification, these can be used for fresh "
            "food, hot meals and bakery products."
        ),
        "sizes": (
            "Available in multiple formats; confirm your "
            "required format with Packaroji."
        ),
        "material": "Kraft tissue / food-safe paper",
        "features": [
            "Suitable for food contact applications",
            "Oil and moisture resistance options",
            "Useful for wrapping and lining",
            "Suitable for hot food applications",
            "Suitable for bakery products",
            "Customization available",
        ],
        "best_for": [
            "Restaurants",
            "Burger shops",
            "Cafés",
            "Bakeries",
            "Cloud kitchens",
        ],
        "image": "products/wrap.svg",
    },


    {
        "id": 6,
        "name": (
            "Portion / Sauce Cups & Containers with Lids"
        ),
        "slug": "portion-sauce-cups-containers",
        "category": "Cups",
        "packaging_categories": [
            "Food Packaging",
            "Bakery Packaging"
        ],
        "description": (
            "Small 2oz to 4oz kraft cups designed for "
            "dipping sauces, dressings, jams or single-bite "
            "bakery treats."
        ),
        "long_description": (
            "Compact portion containers designed for "
            "sauces, dips, dressings, jams and selected "
            "small food portions. Available with lids and "
            "in different capacities."
        ),
        "sizes": (
            "2 oz to 4 oz and other options on request."
        ),
        "material": "Kraft / food-packaging material",
        "features": [
            "Compact portion size",
            "Available with lids",
            "Suitable for sauces and dips",
            "Suitable for jams and dressings",
            "Multiple capacity options",
            "Customization available",
        ],
        "best_for": [
            "Restaurants",
            "Cafés",
            "Bakeries",
            "Cloud kitchens",
            "Food delivery businesses",
        ],
        "image": "products/cup.svg",
    },

    {
        "id": 12,
        "name": "Disposable Cutlery Set",
        "slug": "disposable-cutlery-set",
        "category": "Cutlery",
        "packaging_categories": ["Food Packaging"],
        "description": "Practical disposable fork and spoon sets for takeaway, catering and food-service orders.",
        "long_description": "A convenient disposable cutlery option for restaurants, cafés, cloud kitchens, catering services and takeaway orders. Ask Packaroji about available combinations and quantities.",
        "sizes": "Available in standard food-service formats; confirm your requirement with Packaroji.",
        "material": "Food-service disposable material",
        "features": ["Fork and spoon options", "Suitable for takeaway and catering", "Convenient food-service format", "Available in bulk quantities"],
        "best_for": ["Restaurants", "Cafés", "Cloud kitchens", "Caterers", "Takeaway businesses"],
        "image": "products/cutlery.svg",
    },


    {
        "id": 7, "name": "Kraft Takeaway Bowl", "slug": "kraft-takeaway-bowl",
        "category": "Bowls", "packaging_categories": ["Food Packaging"],
        "description": "Practical takeaway bowls for meals, salads and food service.",
        "long_description": "A flexible bowl format suitable for takeaway meals, salads and everyday food-service applications.",
        "sizes": "Multiple capacities available on request.", "material": "Food-packaging material",
        "features": ["Multiple capacities", "Takeaway friendly", "Customization available"],
        "best_for": ["Restaurants", "Cafés", "Cloud kitchens"], "image": "products/bowl.svg",
    },
    {
        "id": 8, "name": "Paper Drink Cup", "slug": "paper-drink-cup",
        "category": "Cups", "packaging_categories": ["Food Packaging"],
        "description": "Paper cups for hot or cold drinks with branding options.",
        "long_description": "A clean paper cup option for cafés, beverage counters and takeaway drinks.",
        "sizes": "Multiple capacities available on request.", "material": "Paper food-packaging material",
        "features": ["Hot and cold drink use", "Multiple sizes", "Branding available"],
        "best_for": ["Cafés", "Restaurants", "Beverage businesses"], "image": "products/cup.svg",
    },
    {
        "id": 9, "name": "Food Serving Plate", "slug": "food-serving-plate",
        "category": "Plates", "packaging_categories": ["Food Packaging"],
        "description": "Simple serving plates for takeaway, catering and food service.",
        "long_description": "A practical serving plate format that can be specified for different food-service needs.",
        "sizes": "Multiple sizes available on request.", "material": "Food-packaging material",
        "features": ["Food-service ready", "Multiple sizes", "Customization available"],
        "best_for": ["Caterers", "Restaurants", "Food service"], "image": "products/plate.svg",
    },
    {
        "id": 10, "name": "Takeaway Food Container", "slug": "takeaway-food-container",
        "category": "Containers", "packaging_categories": ["Food Packaging"],
        "description": "Everyday takeaway containers for meals, sides and delivery orders.",
        "long_description": "A versatile container format for takeaway and delivery businesses, with specification options available.",
        "sizes": "Multiple sizes available on request.", "material": "Food-packaging material",
        "features": ["Delivery friendly", "Multiple sizes", "Customization available"],
        "best_for": ["Cloud kitchens", "Restaurants", "Delivery businesses"], "image": "products/container.svg",
    },
    {
        "id": 11, "name": "Serving & Catering Tray", "slug": "serving-catering-tray",
        "category": "Trays", "packaging_categories": ["Food Packaging", "Bakery Packaging"],
        "description": "Serving trays for catering, bakery presentation and food service.",
        "long_description": "A practical tray format for food presentation, catering and bakery service.",
        "sizes": "Multiple sizes available on request.", "material": "Food-packaging material",
        "features": ["Catering friendly", "Presentation focused", "Customization available"],
        "best_for": ["Caterers", "Bakeries", "Restaurants"], "image": "products/tray.svg",
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
            reset_token_expires_at TEXT
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


@app.get(
    "/products/bakery"
)
def bakery_products():

    bakery = [
        product
        for product in PRODUCTS
        if "Bakery Packaging"
        in product[
            "packaging_categories"
        ]
    ]

    return render_template(
        "bakery.html",
        products=bakery,
        page_title="Bakery Packaging"
    )


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


    if (
        not customer_name
        or not phone
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
            customization_files
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            order_id=order_id,
            order_success=1
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
        f"Address: {order.get('address') or '—'}\n\n"
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
            password_hash
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            utc_now(),
            name,
            email,
            phone,
            password_hash,
        )
    )


    conn.commit()


    user_id = cursor.lastrowid

    created_user = {
        "id": user_id,
        "name": name,
        "email": email,
        "phone": phone,
    }

    # Account creation must succeed even if an email provider is unavailable.
    send_signup_confirmation_email(created_user)

    conn.close()


    session["user_id"] = user_id


    flash(
        "Your Packaroji account has been created."
    )


    return redirect(
        url_for(
            "account"
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
