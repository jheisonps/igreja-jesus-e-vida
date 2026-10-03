from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from pathlib import Path
root=Path(__file__).resolve().parent
for style in ['Regular','Bold']:
 source=TTFont(root/f'NimbusRoman-{style}.otf');gs=source.getGlyphSet();glyphs={}
 for name in source.getGlyphOrder():
  pen=TTGlyphPen(gs);curve=Cu2QuPen(pen,max_err=1,reverse_direction=True);gs[name].draw(curve);glyphs[name]=pen.glyph()
 fb=FontBuilder(source['head'].unitsPerEm,isTTF=True);fb.setupGlyphOrder(source.getGlyphOrder());fb.setupCharacterMap(source.getBestCmap());fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(source['hmtx'].metrics)
 fb.setupHorizontalHeader(ascent=source['hhea'].ascent,descent=source['hhea'].descent)
 fb.setupNameTable({'familyName':'Church Roman','styleName':style,'uniqueFontIdentifier':'ChurchRoman-'+style,'fullName':'Church Roman '+style,'psName':'ChurchRoman-'+style,'version':'Version 1.0'})
 fb.setupOS2(sTypoAscender=source['OS/2'].sTypoAscender,sTypoDescender=source['OS/2'].sTypoDescender,usWinAscent=source['OS/2'].usWinAscent,usWinDescent=source['OS/2'].usWinDescent,usWeightClass=source['OS/2'].usWeightClass);fb.setupPost();fb.setupMaxp();fb.save(root/f'ChurchRoman-{style}.ttf')
