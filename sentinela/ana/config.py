"""Configuration helpers for ANA module."""
import os

def get_ana_credentials():
    return {
        "identificador": os.environ.get("ANA_HIDROWS_IDENTIFICADOR") or os.environ.get("ANA_HIDROWEB_IDENTIFICADOR"),
        "senha": os.environ.get("ANA_HIDROWS_SENHA") or os.environ.get("ANA_HIDROWEB_SENHA"),
    }
