# Generates the app icon, adaptive icon layers, splash images and favicon.
# Usage: python scripts/make-icon.py assets
import sys
from PIL import Image, ImageDraw
S=4
BG=(17,17,19,255); WHITE=(244,244,245,255); GREEN=(74,222,128,255)

def glyph(size, scale, body=WHITE, clasp=GREEN, bg=None, hole=None):
    """Minimal wallet: rounded body, a tab on the right with a green clasp. scale = wallet width / canvas."""
    N=size*S
    im=Image.new('RGBA',(N,N),bg or (0,0,0,0))
    d=ImageDraw.Draw(im)
    hole = hole if hole is not None else (bg or (0,0,0,0))
    W=N*scale; H=W*0.74; r=W*0.17
    x0=(N-W)/2; y0=(N-H)/2
    d.rounded_rectangle([x0,y0,x0+W,y0+H],radius=r,fill=body)
    # tab cut-out on the right
    tw=W*0.40; th=H*0.36; tx=x0+W-tw*0.80; ty=y0+(H-th)/2
    gapw=W*0.05
    d.rounded_rectangle([tx-gapw,ty-gapw,x0+W+N,ty+th+gapw],radius=th/2+gapw,fill=hole)
    d.rounded_rectangle([tx,ty,x0+W+W*0.02,ty+th],radius=th/2,fill=body)
    # clasp
    cr=th*0.22; cx=tx+th*0.5; cy=ty+th/2
    d.ellipse([cx-cr,cy-cr,cx+cr,cy+cr],fill=clasp)
    return im.resize((size,size),Image.LANCZOS)

out=sys.argv[1]
glyph(1024,0.54,bg=BG).save(f'{out}/icon.png')
Image.new('RGBA',(1024,1024),BG).save(f'{out}/android-icon-background.png')
glyph(1024,0.52,hole=(0,0,0,0)).save(f'{out}/android-icon-foreground.png')
glyph(1024,0.52,clasp=(0,0,0,0)).save(f'{out}/android-icon-monochrome.png')
glyph(1024,0.40,body=BG,clasp=(22,163,74,255)).save(f'{out}/splash-icon.png')
glyph(48,0.72,bg=BG).save(f'{out}/favicon.png')
glyph(1024,0.40).save(f'{out}/splash-icon-dark.png')
