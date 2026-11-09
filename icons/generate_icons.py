"""生成扩展图标 icon16/48/128.png（简单的蓝色地球）。需要: pip install pillow"""
import os

from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))

for size in (16, 48, 128):
    img = Image.new("RGBA", (size, size), (37, 99, 235, 255))
    d = ImageDraw.Draw(img)
    m = size * 0.12
    d.ellipse([m, m, size - m, size - m], outline=(255, 255, 255, 255), width=max(2, size // 16))
    d.line([size / 2, m, size / 2, size - m], fill=(255, 255, 255, 255), width=max(1, size // 24))
    d.line([m, size / 2, size - m, size / 2], fill=(255, 255, 255, 255), width=max(1, size // 24))
    img.save(os.path.join(OUT, f"icon{size}.png"))
    print("wrote", f"icon{size}.png")
