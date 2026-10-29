"""Vercel entry point for the Packaroji Flask application."""
from dotenv import load_dotenv
from backend.app import create_app

load_dotenv()
app = create_app()
