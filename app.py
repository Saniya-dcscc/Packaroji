import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(PROJECT_ROOT, "Packaroji")
os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)

from Packaroji.app import app

__all__ = ["app"]
