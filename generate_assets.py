import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('assets/logo', exist_ok=True)

# Generate a high-resolution logo for PDF, DOCX, and web header
width = 600
height = 140
img = Image.new('RGBA', (width, height), color=(255, 255, 255, 0))
draw = ImageDraw.Draw(img)

# Draw a stylized modern legal balance badge
# Outer rounded box
badge_x = 20
badge_y = 20
badge_size = 100

# Deep navy background circle/box for emblem
draw.rounded_rectangle(
    [badge_x, badge_y, badge_x + badge_size, badge_y + badge_size],
    radius=20,
    fill=(15, 23, 42, 255) # slate-900 / navy
)

# Subtle gold border on badge
draw.rounded_rectangle(
    [badge_x, badge_y, badge_x + badge_size, badge_y + badge_size],
    radius=20,
    outline=(217, 119, 6, 220), # gold/amber accent
    width=3
)

# Draw modern balance scale symbol in gold/white inside badge
# Center pillar
draw.line([(badge_x + 50, badge_y + 25), (badge_x + 50, badge_y + 80)], fill=(245, 158, 11, 255), width=4)
# Top horizontal bar
draw.line([(badge_x + 25, badge_y + 36), (badge_x + 75, badge_y + 36)], fill=(245, 158, 11, 255), width=4)
# Left pan strings & pan
draw.line([(badge_x + 27, badge_y + 36), (badge_x + 20, badge_y + 56)], fill=(203, 213, 225, 255), width=2)
draw.line([(badge_x + 27, badge_y + 36), (badge_x + 34, badge_y + 56)], fill=(203, 213, 225, 255), width=2)
draw.arc([(badge_x + 18, badge_y + 50), (badge_x + 36, badge_y + 64)], start=0, end=180, fill=(245, 158, 11, 255), width=3)
# Right pan strings & pan
draw.line([(badge_x + 73, badge_y + 36), (badge_x + 66, badge_y + 56)], fill=(203, 213, 225, 255), width=2)
draw.line([(badge_x + 73, badge_y + 36), (badge_x + 80, badge_y + 56)], fill=(203, 213, 225, 255), width=2)
draw.arc([(badge_x + 64, badge_y + 50), (badge_x + 82, badge_y + 64)], start=0, end=180, fill=(245, 158, 11, 255), width=3)
# Base plate
draw.line([(badge_x + 35, badge_y + 80), (badge_x + 65, badge_y + 80)], fill=(245, 158, 11, 255), width=4)

# Draw typography
# Try default fonts or system fonts
font_large = None
font_small = None
font_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
]
for p in font_paths:
    if os.path.exists(p):
        try:
            font_large = ImageFont.truetype(p, 48)
            font_sub = ImageFont.truetype(p, 16)
            break
        except Exception:
            pass

if font_large is None:
    font_large = ImageFont.load_default()
    font_sub = ImageFont.load_default()

# Primary brand text "LegalEase"
draw.text((140, 28), "LegalEase", fill=(15, 23, 42, 255), font=font_large)
# Gold "AI" tag
draw.text((410, 28), "AI", fill=(217, 119, 6, 255), font=font_large)
# Subtitle
draw.text((144, 84), "ENTERPRISE LEGAL INTELLIGENCE", fill=(100, 116, 139, 255), font=font_sub)

img.save("assets/logo/legalease_logo.png", "PNG")
print("Saved assets/logo/legalease_logo.png successfully")
