"""Local preview server for the whole site.

Plain `python -m http.server` only shows the front page properly, because the
site's clean URLs (/albums, /picoctf, /resume ...) only exist through the
rewrites in vercel.json. This server applies those same rewrites, and tells the
browser to re-check every file on each load, so a normal reload always shows
your latest edits.

    python3 serve.py            # this computer only:  http://localhost:8000/
    python3 serve.py --lan      # also your phone on the same Wi-Fi: http://<this PC's IP>:8000/

Standard library only. Stop it with Ctrl+C.
"""
import json, os, re, socket, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(next((a for a in sys.argv[1:] if a.isdigit()), 8000))
LAN = "--lan" in sys.argv

RULES = []
for r in json.load(open(os.path.join(ROOT, "vercel.json")))["rewrites"]:
    pat = "^" + r["source"] + "$"   # sources are plain paths with regex groups, as Vercel reads them
    RULES.append((re.compile(pat), r["destination"].replace("$1", r"\1")))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def rewrite(self):
        u = urlsplit(self.path)
        for rx, dest in RULES:
            if rx.match(u.path):
                self.path = rx.sub(dest, u.path) + ("?" + u.query if u.query else "")
                break

    def do_GET(self):
        self.rewrite()
        super().do_GET()

    def do_HEAD(self):
        self.rewrite()
        super().do_HEAD()

    def send_error(self, code, message=None, explain=None):
        # serve the site's own 404 page, like Vercel does
        if code == 404 and os.path.exists(os.path.join(ROOT, "404.html")):
            body = open(os.path.join(ROOT, "404.html"), "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.0.2.1", 80))  # no packet is sent; just picks the outgoing interface
        return s.getsockname()[0]
    except OSError:
        return "your-PC-IP"
    finally:
        s.close()


print(f"Site preview:  http://localhost:{PORT}/")
if LAN:
    print(f"On your phone: http://{lan_ip()}:{PORT}/   (same Wi-Fi)")
print("Ctrl+C to stop.")
ThreadingHTTPServer(("0.0.0.0" if LAN else "127.0.0.1", PORT), Handler).serve_forever()
