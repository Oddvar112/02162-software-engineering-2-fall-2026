"""Generate the review gallery using the rendered models and canonical roster."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
roster = json.loads((ROOT / "lib/robots.json").read_text())
cards = []
for index, robot in enumerate(roster, 1):
    name, role, quote, shape = [html.escape(robot[key]) for key in ("name", "role", "personality", "shape")]
    identifier, color = robot["id"], robot["color"]
    cards.append(f'''<article style="--paint:{color}">
      <div class="portrait"><span class="number">{index:02}</span><img src="/robots/previews/{identifier}.png" alt="{name}: {shape}" width="850" height="900"></div>
      <div class="details"><div class="title"><h2>{name}</h2><span class="swatch" aria-label="{color}"></span></div>
      <p class="role">{role}</p><p class="quote">{quote}</p>
      <a href="/models/robots/{identifier}.glb" download>Download animated GLB <span aria-hidden="true">↗</span></a></div>
    </article>''')

page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Factory Misfits · RoboRally</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#101f29;color:#f3eee1;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1800px;margin:auto;padding:38px 44px 28px}header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:28px}
.eyebrow{font-size:11px;letter-spacing:.22em;color:#9eb8c5;font-weight:700;margin:0 0 12px}h1{font-size:43px;letter-spacing:-.045em;line-height:1;margin:0}
.subtitle{color:#abc0cb;font-size:14px;line-height:1.6;max-width:310px;margin:0}.subtitle strong{font-weight:400;color:#eee6d6}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}article{background:#1a303d;border:1px solid #304550;border-radius:14px;overflow:hidden}
.portrait{position:relative;background:radial-gradient(ellipse at 50% 58%,#2e4856,#1a303d 75%);height:280px}
.portrait img{width:100%;height:100%;object-fit:contain;display:block}.number{position:absolute;left:15px;top:15px;font-size:11px;letter-spacing:.1em;color:#819ba9}
.details{padding:16px 19px 18px;background:#162b37}.title{display:flex;align-items:center;justify-content:space-between;gap:8px}h2{font-size:25px;letter-spacing:-.035em;margin:0;color:var(--paint)}
.swatch{height:9px;width:9px;flex:none;background:var(--paint);border-radius:50%}.role{font-size:11px;text-transform:uppercase;letter-spacing:.065em;color:#c7d5dc;margin:9px 0 11px;font-weight:700}
.quote{font-size:12px;line-height:1.55;color:#94afbd;min-height:38px;margin:0 0 13px}a{font-size:11px;color:#dbe5e9;text-decoration:none}a:hover{text-decoration:underline}a:focus-visible{outline:2px solid var(--paint);outline-offset:5px}a span{margin-left:5px;color:var(--paint)}
footer{display:flex;justify-content:space-between;margin-top:22px;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#708d9e;gap:20px}
@media(min-width:1700px){.portrait{height:320px}}@media(max-width:1050px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}header{align-items:flex-start}h1{font-size:36px}main{padding:28px}}
@media(max-width:680px){main{padding:24px 16px}header{display:block}h1{font-size:34px}.subtitle{margin-top:15px;max-width:none}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.portrait{height:215px}.details{padding:13px}h2{font-size:24px}.role{font-size:9px;line-height:1.4}.quote{font-size:11px;min-height:52px}footer{font-size:8px;line-height:1.5}}
</style></head><body><main>
<header><div><p class="eyebrow">ROBORALLY / CHARACTER LINEUP / 01—10</p><h1>The Factory Misfits.</h1></div><p class="subtitle"><strong>Ten robots. Zero quality control.</strong><br>A very questionable team of factory-floor originals.<br><a href="/game">Try idle and movement animations ↗</a></p></header>
<section class="grid" aria-label="Ten distinct robot characters">''' + "\n".join(cards) + '''</section>
<footer><span>Original 3D models · Shared world, individual personalities</span><span>Blender source + self-contained GLB assets</span></footer>
</main></body></html>'''
(ROOT / "public/robots/lineup.html").write_text(page)
print("Wrote public/robots/lineup.html")
