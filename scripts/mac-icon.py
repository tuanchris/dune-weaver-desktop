"""Make build/icon-mac.png from the mobile app's icon (app.json `expo.icon`).

macOS doesn't mask app icons like iOS does: it expects the shape baked in
(Apple's grid: an 824 px rounded square centred on a 1024 canvas, with a soft
shadow in the margin). Re-run when the mobile icon changes:

    python3 scripts/mac-icon.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MOBILE = ROOT.parent / "dune-weaver-mobile"
SRC = MOBILE / json.loads((MOBILE / "app.json").read_text())["expo"]["icon"]
OUT = ROOT / "build" / "icon-mac.png"
CANVAS, BODY, RADIUS, SS = 1024, 824, 185, 4  # SS: supersampling for a smooth edge

mask = Image.new("L", (BODY * SS, BODY * SS), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, BODY * SS - 1, BODY * SS - 1), RADIUS * SS, fill=255)
mask = mask.resize((BODY, BODY), Image.LANCZOS)

body = Image.open(SRC).convert("RGBA").resize((BODY, BODY), Image.LANCZOS)
body.putalpha(mask)

off = (CANVAS - BODY) // 2
shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
shadow.paste((0, 0, 0, 90), (off, off + 12), mask)
icon = Image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)), Image.new("RGBA", (CANVAS, CANVAS)))
icon.alpha_composite(body, (off, off))
OUT.parent.mkdir(exist_ok=True)
icon.save(OUT)
print(f"wrote {OUT.relative_to(ROOT)}")
