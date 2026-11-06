"""Publish only original generated test MP4s; no downloaded SNS media."""
from pathlib import Path
import json,subprocess,html
root=Path(__file__).resolve().parents[1];source=root/'reports/remix-ten';out=root/'docs/samples/remix';out.mkdir(parents=True,exist_ok=True);qa=json.loads((source/'qa.json').read_text());cards=[]
for m in qa['media']:
 d=m['design'];name=m['archetype']+'.mp4';target=out/name
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source/name),'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(target)],check=True)
 cards.append(f'<article><h2>{html.escape(d["title"])}</h2><p>{d["layout"]} / {d["rule"]} / {d["ending"]}</p><video controls playsinline preload="none" src="{name}"></video><p>15秒 · seed {d["seed"]} · Original procedural video / synthesized audio</p><a download href="{name}">MP4を保存</a></article>')
(out/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VIRAL REMIX — 10 original samples</title><style>body{background:#101322;color:#eff8ff;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px}article{background:#1b2338;padding:16px;border-radius:16px}video{width:100%;max-height:65vh}a{color:#bbf878}p{overflow-wrap:anywhere}</style><a href="../../">アプリへ戻る</a><h1>VIRAL REMIX — 独自設計10本</h1><p>15秒・360×640・H264/AAC。実録画テストの成果物。iPhone実機未検証。構図・ルール・展開・集計する結末を変更。人気や収益は保証しません。</p><main>'+''.join(cards)+'</main></html>')
(out/'qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
