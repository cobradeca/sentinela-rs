"""Sentinela ANA integration module.

Minimal scaffold: auth, estacoes, nivel, diagnostico, config.
"""

from .auth import AnaAuth
from .estacoes import check_station
from .nivel import fetch_station_level
from .diagnostico import diagnosticar_causa

__all__ = ["AnaAuth", "check_station", "fetch_station_level", "diagnosticar_causa"]
