"""
[INPUT]: 依赖 Pillow；源图 build/icon-source.png（正方形位图，任意尺寸）
[OUTPUT]: 生成 build/icon.png（1024 画布：824 圆角方 22.5% 半径 + 柔和投影，macOS Dock 形态）与 src/renderer/src/assets/logo.png（256 圆角方，无留白无投影，rail 里按 24px 渲染）
[POS]: samo-app 的图标配方脚本；换 logo = 换 icon-source.png 再跑一次，永远不要直接提交满幅方形图标（Dock 会没圆角）
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'build' / 'icon-source.png'
DOCK = ROOT / 'build' / 'icon.png'
RAIL = ROOT / 'src' / 'renderer' / 'src' / 'assets' / 'logo.png'
RADIUS = 0.225  # macOS 圆角方形的半径比例


def rounded(img: Image.Image, size: int) -> Image.Image:
    """把源图裁成 size×size 的圆角方形（RGBA），4× 超采样抗锯齿"""
    tile = img.convert('RGBA').resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * RADIUS), fill=255)
    tile.putalpha(mask.resize((size, size), Image.LANCZOS))
    return tile


def dock_icon(src: Image.Image) -> Image.Image:
    canvas, tile_size = 1024, 824
    tile = rounded(src, tile_size)
    origin = ((canvas - tile_size) // 2, (canvas - tile_size) // 2)
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    shadow = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))  # 柔和投影：同形、下偏 18、模糊 22
    shadow.paste(Image.new('RGBA', (tile_size, tile_size), (0, 0, 0, 110)), (origin[0], origin[1] + 18), tile.split()[3])
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
    out.alpha_composite(tile, origin)
    return out


if __name__ == '__main__':
    src = Image.open(SRC)
    if src.width != src.height:  # 非正方形：居中裁方
        side = min(src.size)
        src = src.crop(((src.width - side) // 2, (src.height - side) // 2, (src.width + side) // 2, (src.height + side) // 2))
    dock_icon(src).save(DOCK)
    rounded(src, 256).save(RAIL)
    print(f'icon → {DOCK.relative_to(ROOT)} 1024, {RAIL.relative_to(ROOT)} 256')
