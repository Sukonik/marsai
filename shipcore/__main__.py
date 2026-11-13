"""Run: python -m shipcore  (serves on 127.0.0.1:8765)"""
from __future__ import annotations

import argparse
import sys

LOOPBACK = {"127.0.0.1", "localhost", "::1"}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="shipcore", description="MARSAI ShipCore local service")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--unsafe-bind", action="store_true", help="allow non-loopback hosts (not recommended)")
    args = ap.parse_args(argv)
    if args.host not in LOOPBACK and not args.unsafe_bind:
        print("Refusing to bind to a non-loopback address. ShipCore is a local service.", file=sys.stderr)
        return 2
    import uvicorn

    from .server import create_app

    uvicorn.run(create_app(), host=args.host, port=args.port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
