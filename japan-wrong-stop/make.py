#!/usr/bin/env python3
"""Japan Wrong Stop — ショート動画1本を script.json から自動生成する。

    python make.py script.json

処理の流れ:
  1. script.json を読み込み、動画ルール（尺・テロップ語数など）を検査
  2. OpenAI 画像生成で各シーンの 9:16 画像を作成（共通スタイル＋主人公を自動付与）
  3. OpenAI TTS で低めの男性声ナレーションを作成
  4. moviepy + ffmpeg でゆっくりズーム・テロップ・A/B 分割画面・環境音を合成し mp4 出力

生成済みの画像・音声は output/<slug>/ に保存され、再実行時は再利用される（--force で作り直し）。
--offline を付けると API を使わずに仮画像・無音で構図だけ確認できる。
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# 固定設定
# ---------------------------------------------------------------------------
W, H = 1080, 1920
SAMPLE_RATE = 44100

STYLE = (
    "Vertical 9:16, semi-realistic 2D anime-style illustration, muted cold color palette, "
    "dim fluorescent lighting, heavy shadows, film grain, eerie and quiet atmosphere, "
    "Japanese late-night setting, cinematic composition"
)
PROTAGONIST = (
    "a tired Japanese office worker in his late 20s, short black hair, dark navy suit, "
    "loosened tie, black backpack"
)
# 既存作品・実在人物への類似、文字、グロを避けるための共通の後置き
SAFETY_SUFFIX = (
    "Original character design and original art style, not resembling any existing anime, "
    "film, game or real person. No text, no letters, no signage writing, no logos, no watermark. "
    "No gore, no blood. Subtle, quiet horror."
)
VOICE_INSTRUCTIONS = (
    "Low, deep, calm adult male voice. Speak slowly and quietly, like someone recalling a true "
    "ghost story late at night. Restrained fear, slight breathiness, natural pauses between "
    "sentences. Not theatrical."
)

NARRATION_LEAD = 0.45   # シーン開始からナレーションまでの間（秒）
NARRATION_TAIL = 0.35   # ナレーション終了後に残す間（秒）
MAX_TEMPO = 1.25        # 尺に収まらない時の最大早回し倍率

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/ariblk.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",
]


def log(msg: str) -> None:
    print(f"[make] {msg}", flush=True)


# ---------------------------------------------------------------------------
# 入力の検査
# ---------------------------------------------------------------------------
def word_count(text: str) -> int:
    return len([w for w in text.replace("/", " ").split() if any(c.isalnum() for c in w)])


def validate(script: dict) -> list[str]:
    """動画ルールに反する点を返す（空なら合格）。"""
    errors: list[str] = []
    scenes = script.get("scenes") or []
    if not scenes:
        return ["scenes が空です"]

    total = sum(float(s["duration"]) for s in scenes)
    if not 55 <= total <= 60:
        errors.append(f"合計尺が {total:.1f} 秒です（55〜60 秒にしてください）")

    ids = {s["id"] for s in scenes}
    for s in scenes:
        d = float(s["duration"])
        if not 5 <= d <= 14:
            errors.append(f"シーン{s['id']}: {d} 秒（1シーン 5〜14 秒）")
        texts = [s.get("telop")] + list((s.get("choices") or {}).values())
        for t in filter(None, texts):
            if word_count(t) > 7:
                errors.append(f"シーン{s['id']}: テロップ「{t}」が {word_count(t)} 語（7語以内）")
        if s.get("image_from") and s["image_from"] not in ids:
            errors.append(f"シーン{s['id']}: image_from={s['image_from']} が存在しません")
        if not s.get("image_from") and not s.get("image_prompt"):
            errors.append(f"シーン{s['id']}: image_prompt がありません")

    hook = (scenes[0].get("telop") or "").strip()
    if not hook.lower().startswith("never"):
        errors.append("シーン1のテロップは「Never ___」型にしてください")

    last = scenes[-1]
    if last.get("layout") != "choice" or set((last.get("choices") or {}).keys()) != {"A", "B"}:
        errors.append("最終シーンは layout=\"choice\" と choices{A,B} が必要です")
    if "comment a or b" not in (last.get("telop") or "").lower() + " " + (last.get("narration") or "").lower():
        errors.append("最終シーンは「Comment A or B」で締めてください")

    if script.get("episode", 1) > 1:
        first_line = (scenes[0].get("narration") or "").strip()
        if "chose" not in first_line.lower() or "%" not in first_line:
            errors.append("第2話以降は「XX% chose A/B」でナレーションを始めてください")
    return errors


# ---------------------------------------------------------------------------
# 画像生成
# ---------------------------------------------------------------------------
def build_prompt(scene: dict) -> str:
    parts = [STYLE]
    if scene.get("protagonist", True):
        parts.append(f"Main character: {PROTAGONIST}")
    parts.append(f"Scene: {scene['image_prompt']}")
    parts.append(SAFETY_SUFFIX)
    return ". ".join(p.rstrip(". ") for p in parts) + "."


def cover_fit(img: Image.Image, w: int = W, h: int = H) -> Image.Image:
    """縦横比を保って拡大し、中央を w×h に切り抜く。"""
    img = img.convert("RGB")
    scale = max(w / img.width, h / img.height)
    resized = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def generate_image(client, prompt: str, raw_path: Path) -> None:
    model = os.getenv("OPENAI_IMAGE_MODEL") or "gpt-image-1"
    quality = os.getenv("OPENAI_IMAGE_QUALITY") or "high"
    if model.startswith("dall-e-3"):
        resp = client.images.generate(
            model=model, prompt=prompt, size="1024x1792", n=1,
            quality="hd" if quality == "high" else "standard", response_format="b64_json",
        )
    else:  # gpt-image 系：縦長は 1024x1536（2:3）→ 9:16 に中央切り抜き
        resp = client.images.generate(model=model, prompt=prompt, size="1024x1536", quality=quality, n=1)
    raw_path.write_bytes(base64.b64decode(resp.data[0].b64_json))


def placeholder_image(scene: dict, path: Path) -> None:
    """--offline 用の仮画像。"""
    rng = np.random.default_rng(scene["id"])
    y = np.linspace(0, 1, H)[:, None, None]
    top, bottom = np.array([20, 28, 40]), np.array([60, 75, 95]) * rng.uniform(0.6, 1.2)
    arr = (top * (1 - y) + bottom * y).repeat(W, axis=1)
    img = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(img)
    f = load_font(60)
    d.text((W // 2, H // 2 - 300), f"SCENE {scene['id']}", font=f, fill=(150, 160, 175), anchor="mm")
    d.multiline_text((80, H // 2 - 200), wrap_text(scene.get("image_prompt", ""), load_font(34), W - 160, d),
                     font=load_font(34), fill=(120, 130, 145))
    img.save(path)


# ---------------------------------------------------------------------------
# 音声
# ---------------------------------------------------------------------------
def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def audio_duration(path: Path) -> float:
    from moviepy import AudioFileClip
    with AudioFileClip(str(path)) as a:
        return float(a.duration)


def generate_tts(client, text: str, path: Path) -> None:
    model = os.getenv("OPENAI_TTS_MODEL") or "gpt-4o-mini-tts"
    voice = os.getenv("OPENAI_TTS_VOICE") or "onyx"
    kwargs = dict(model=model, voice=voice, input=text, response_format="mp3")
    if model.startswith("gpt-4o"):
        kwargs["instructions"] = VOICE_INSTRUCTIONS
    else:
        kwargs["speed"] = 0.92
    with client.audio.speech.with_streaming_response.create(**kwargs) as resp:
        resp.stream_to_file(path)


def write_wav(path: Path, samples: np.ndarray) -> None:
    """samples: float (-1..1), shape (n,) または (n, 2)"""
    if samples.ndim == 1:
        samples = np.stack([samples, samples], axis=1)
    pcm = (np.clip(samples, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())


def placeholder_tts(text: str, path: Path) -> None:
    """--offline 用：語数から長さを見積もった無音。"""
    dur = max(1.0, word_count(text) * 0.42)
    write_wav(path, np.zeros(int(dur * SAMPLE_RATE)))


def fit_audio(src: Path, dst: Path, limit: float) -> float:
    """ナレーションがシーンに収まらなければ早回しする。最終的な長さを返す。"""
    dur = audio_duration(src)
    if dur <= limit:
        if src != dst:
            dst.write_bytes(src.read_bytes())
        return dur
    tempo = min(dur / limit, MAX_TEMPO)
    subprocess.run(
        [ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(src), "-filter:a", f"atempo={tempo:.4f}", str(dst)],
        check=True,
    )
    new = audio_duration(dst)
    if new > limit:
        log(f"  ⚠ ナレーションが {new:.2f}s でシーン枠 {limit:.2f}s を超えます。文を短くするか duration を延ばしてください")
    return new


def make_ambient(total: float, stingers: list[float], path: Path) -> None:
    """低いうなり＋かすかなノイズ＋「ドン」という低音。著作権フリーの自作環境音。"""
    n = int(total * SAMPLE_RATE)
    t = np.arange(n) / SAMPLE_RATE
    rng = np.random.default_rng(7)
    # うなり（わずかにずらした2つの低音でゆっくり揺れる）
    drone = 0.050 * np.sin(2 * np.pi * 49.0 * t) + 0.045 * np.sin(2 * np.pi * 49.6 * t)
    drone += 0.020 * np.sin(2 * np.pi * 98.3 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t))
    # 茶色ノイズ（電車の遠い走行音のような空気感）
    noise = np.cumsum(rng.normal(0, 1, n))
    noise -= np.convolve(noise, np.ones(4410) / 4410, mode="same")
    noise = noise / (np.abs(noise).max() + 1e-9) * 0.035
    sig = drone + noise
    # 低音の一撃
    for s in stingers:
        i0 = int(s * SAMPLE_RATE)
        length = int(1.6 * SAMPLE_RATE)
        tt = np.arange(min(length, n - i0)) / SAMPLE_RATE
        hit = 0.32 * np.sin(2 * np.pi * (42 - 8 * tt) * tt) * np.exp(-tt * 2.6)
        sig[i0:i0 + len(tt)] += hit
    # フェード
    env = np.ones(n)
    fi, fo = int(1.5 * SAMPLE_RATE), int(1.2 * SAMPLE_RATE)
    env[:fi] = np.linspace(0, 1, fi)
    env[-fo:] = np.linspace(1, 0, fo)
    sig *= env
    left = sig
    right = np.roll(sig, 220)  # わずかな左右差で広がりを出す
    write_wav(path, np.stack([left, right], axis=1))


# ---------------------------------------------------------------------------
# テロップ・オーバーレイ
# ---------------------------------------------------------------------------
_font_cache: dict[int, ImageFont.FreeTypeFont] = {}


def load_font(size: int):
    if size in _font_cache:
        return _font_cache[size]
    paths = [os.getenv("FONT_PATH")] + FONT_CANDIDATES
    for p in paths:
        if p and Path(p).exists():
            _font_cache[size] = ImageFont.truetype(p, size)
            return _font_cache[size]
    _font_cache[size] = ImageFont.load_default(size=size)
    return _font_cache[size]


def wrap_text(text: str, font, max_w: int, draw: ImageDraw.ImageDraw) -> str:
    lines, cur = [], ""
    for word in text.split(" "):  # 通常スペースのみで改行（字間用の en space では切らない）
        if not word:
            continue
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def draw_outlined(layer: Image.Image, text: str, center: tuple[int, int], size: int,
                  max_w: int = 900, fill=(255, 255, 255), uppercase: bool = False) -> None:
    """白文字＋黒縁（＋柔らかい影）を layer に描く。"""
    if uppercase:
        text = text.upper()
    d = ImageDraw.Draw(layer)
    font = load_font(size)
    wrapped = wrap_text(text, font, max_w, d)
    while size > 40 and max(d.textlength(l, font=font) for l in wrapped.split("\n")) > max_w:
        size -= 6
        font = load_font(size)
        wrapped = wrap_text(text, font, max_w, d)
    stroke = max(4, round(size * 0.10))
    spacing = round(size * 0.18)

    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).multiline_text(
        (center[0] + 4, center[1] + 6), wrapped, font=font, anchor="mm", align="center",
        spacing=spacing, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
    d.multiline_text(center, wrapped, font=font, anchor="mm", align="center", spacing=spacing,
                     fill=fill + (255,), stroke_width=stroke, stroke_fill=(0, 0, 0, 255))


TELOP_Y = {"top": 420, "center": 860, "bottom": 1300}


def telop_layer(scene: dict) -> Image.Image | None:
    text = scene.get("telop")
    if not text:
        return None
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pos = scene.get("telop_position", "bottom")
    size = 112 if scene["id"] == 1 else 96
    if text.isupper() and word_count(text) == 1:   # 駅名など1語の大文字は大きく字間を空ける
        text, size = "\u2002".join(text), 120
    max_w = 960 if scene["id"] == 1 else 900
    draw_outlined(layer, text, (W // 2, TELOP_Y.get(pos, 1300)), size, max_w=max_w)
    return layer


def choice_layer(scene: dict) -> Image.Image:
    """画面を左右に分けて A / B を表示する。"""
    ch = scene["choices"]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    half = W // 2
    # 左（A）は電車の暖色、右（B）は霧の寒色でうっすら塗り分ける
    d.rectangle((0, 0, half, H), fill=(255, 170, 80, 46))
    d.rectangle((half, 0, W, H), fill=(70, 130, 255, 46))
    # 中央の境界線（光の筋）
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rectangle((half - 6, 0, half + 6, H), fill=(255, 255, 255, 150))
    layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(9)))
    d.rectangle((half - 2, 0, half + 2, H), fill=(255, 255, 255, 230))
    # 文字
    for key, cx in (("A", half // 2), ("B", half + half // 2)):
        draw_outlined(layer, key, (cx, 900), 260)
        draw_outlined(layer, ch[key], (cx, 1120), 78, max_w=half - 90, uppercase=True)
    return layer


def to_premultiplied(layer: Image.Image | None):
    if layer is None:
        return None
    arr = np.asarray(layer).astype(np.float32) / 255.0
    alpha = arr[..., 3:4]
    return arr[..., :3] * 255.0 * alpha, alpha


def vignette() -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return np.clip(1.0 - 0.55 * np.clip(r - 0.45, 0, None) ** 1.6, 0.35, 1.0)[..., None]


# ---------------------------------------------------------------------------
# 映像の組み立て
# ---------------------------------------------------------------------------
def ease(x: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * min(max(x, 0.0), 1.0))


class SceneRenderer:
    def __init__(self, scene: dict, image: Image.Image, start: float, fade_in: float, fade_out: float):
        self.s = scene
        self.start = start
        self.dur = float(scene["duration"])
        self.img = image
        self.zs = float(scene.get("zoom_strength", 0.08))
        self.zoom = scene.get("zoom", "in")
        self.fade_in, self.fade_out = fade_in, fade_out
        self.telop = to_premultiplied(telop_layer(scene))
        self.choice = to_premultiplied(choice_layer(scene)) if scene.get("layout") == "choice" else None
        # 選択肢は「前のシーンから続く」場合は最初から、そうでなければ少し遅れて出す
        self.choice_delay = 0.0 if scene.get("image_from") else float(scene.get("choice_delay", 2.5))
        self.flicker = bool(scene.get("flicker", scene["id"] == 1))

    def zoom_at(self, lt: float) -> float:
        p = ease(lt / self.dur)
        return 1 + self.zs * (p if self.zoom == "in" else 1 - p)

    def frame(self, lt: float, gi: int) -> np.ndarray:
        z = self.zoom_at(lt)
        cw, ch = W / z, H / z
        x0, y0 = (W - cw) / 2, (H - ch) / 2
        f = np.asarray(self.img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))).astype(np.float32)

        if self.flicker:  # 蛍光灯のちらつき
            rng = np.random.default_rng(gi // 2)
            if rng.random() < 0.06:
                f *= rng.uniform(0.55, 0.8)

        for layer, t0 in ((self.choice, self.choice_delay), (self.telop, 0.15)):
            if layer is None or lt < t0:
                continue
            k = min(1.0, (lt - t0) / 0.5)
            rgb, a = layer
            f = f * (1 - a * k) + rgb * k

        k = 1.0
        if self.fade_in and lt < self.fade_in:
            k = lt / self.fade_in
        if self.fade_out and lt > self.dur - self.fade_out:
            k = min(k, (self.dur - lt) / self.fade_out)
        return f * k


def render_video(script: dict, images: dict[int, Image.Image], narr: dict[int, Path],
                 ambient: Path | None, out_path: Path, fps: int) -> None:
    from moviepy import AudioFileClip, CompositeAudioClip, VideoClip
    from moviepy.audio.fx import AudioLoop, MultiplyVolume

    scenes = script["scenes"]
    renderers: list[SceneRenderer] = []
    t = 0.0
    for i, s in enumerate(scenes):
        nxt = scenes[i + 1] if i + 1 < len(scenes) else None
        prev = scenes[i - 1] if i > 0 else None
        continues_from_prev = prev is not None and s.get("image_from") == prev["id"]
        continues_to_next = nxt is not None and nxt.get("image_from") == s["id"]
        fade_in = float(s.get("fade_in", 0.0 if continues_from_prev else (0.6 if i == 0 else 0.35)))
        fade_out = float(s.get("fade_out", 0.0 if continues_to_next else (0.6 if nxt is None else 0.3)))
        renderers.append(SceneRenderer(s, images[s["id"]], t, fade_in, fade_out))
        t += float(s["duration"])
    total = t

    vig = vignette()
    grain = [np.random.default_rng(i).normal(0, 7, (H, W, 1)).astype(np.float32) for i in range(6)]

    def frame_function(gt: float) -> np.ndarray:
        gi = int(round(gt * fps))
        r = next((r for r in reversed(renderers) if gt >= r.start), renderers[0])
        f = r.frame(min(gt - r.start, r.dur - 1e-3), gi)
        f = f * vig + grain[gi % len(grain)]
        return np.clip(f, 0, 255).astype(np.uint8)

    video = VideoClip(frame_function=frame_function, duration=total)

    tracks = []
    for r in renderers:
        if r.s["id"] in narr:
            tracks.append(AudioFileClip(str(narr[r.s["id"]])).with_start(r.start + NARRATION_LEAD))
    if ambient is not None:
        tracks.append(AudioFileClip(str(ambient)).with_start(0))
    bgm = script.get("bgm")
    if bgm:
        bgm_path = Path(bgm)
        if bgm_path.exists():
            clip = AudioFileClip(str(bgm_path)).with_effects(
                [AudioLoop(duration=total), MultiplyVolume(float(script.get("bgm_volume", 0.15)))])
            tracks.append(clip.with_start(0))
        else:
            log(f"⚠ BGM {bgm} が見つからないので省略します")
    if tracks:
        video = video.with_audio(CompositeAudioClip(tracks).with_duration(total))

    log(f"動画を書き出し中… ({total:.1f}s, {fps}fps) → {out_path}")
    video.write_videofile(
        str(out_path), fps=fps, codec="libx264", audio_codec="aac", audio_bitrate="192k",
        preset="medium", threads=os.cpu_count() or 4, logger="bar",
        ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )


# ---------------------------------------------------------------------------
# メイン
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="Japan Wrong Stop ショート動画ジェネレーター")
    ap.add_argument("script", help="script.json のパス")
    ap.add_argument("--out", default="output", help="出力フォルダ（既定: output）")
    ap.add_argument("--force", action="store_true", help="生成済みの画像・音声を使わず作り直す")
    ap.add_argument("--offline", action="store_true", help="APIを使わず仮画像・無音で試し書き出し")
    ap.add_argument("--skip-checks", action="store_true", help="動画ルール違反があっても続行する")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    load_dotenv(here / ".env")
    load_dotenv()  # カレントディレクトリの .env も読む

    script_path = Path(args.script)
    script = json.loads(script_path.read_text(encoding="utf-8"))
    problems = validate(script)
    for p in problems:
        log(f"✗ {p}")
    if problems and not args.skip_checks:
        log("ルール違反があるため中止しました（無視するなら --skip-checks）")
        return 1
    if not problems:
        log("✓ 動画ルールの検査 OK")

    slug = script.get("slug") or script_path.stem
    workdir = Path(args.out) / slug
    img_dir, aud_dir = workdir / "images", workdir / "audio"
    img_dir.mkdir(parents=True, exist_ok=True)
    aud_dir.mkdir(parents=True, exist_ok=True)
    fps = int(script.get("fps", 30))

    client = None
    if not args.offline:
        if not os.getenv("OPENAI_API_KEY"):
            log("✗ OPENAI_API_KEY がありません。.env.example を .env にコピーしてキーを書いてください")
            return 1
        from openai import OpenAI
        client = OpenAI()

    # 1) 画像 -----------------------------------------------------------------
    images: dict[int, Image.Image] = {}
    prompts = {}
    for s in script["scenes"]:
        if s.get("image_from"):
            continue
        sid = s["id"]
        raw = img_dir / f"scene_{sid:02d}_raw.png"
        fit = img_dir / f"scene_{sid:02d}.png"
        prompt = build_prompt(s)
        prompts[sid] = prompt
        if args.force or not raw.exists():
            if args.offline:
                placeholder_image(s, raw)
            else:
                log(f"画像生成 シーン{sid} …")
                try:
                    generate_image(client, prompt, raw)
                except Exception as e:  # 安全フィルター等
                    log(f"✗ シーン{sid}の画像生成に失敗: {e}")
                    log("  image_prompt を穏やかな表現に変えて再実行してください")
                    return 1
        else:
            log(f"画像 シーン{sid}: 既存を再利用")
        img = cover_fit(Image.open(raw))
        img.save(fit)
        images[sid] = img
    for s in script["scenes"]:
        if s.get("image_from"):
            images[s["id"]] = images[s["image_from"]]
    (workdir / "prompts.json").write_text(json.dumps(prompts, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2) ナレーション ---------------------------------------------------------
    narr: dict[int, Path] = {}
    for s in script["scenes"]:
        text = (s.get("narration") or "").strip()
        if not text:
            continue
        sid = s["id"]
        ext = "wav" if args.offline else "mp3"
        src = aud_dir / f"scene_{sid:02d}_tts.{ext}"
        dst = aud_dir / f"scene_{sid:02d}.{ext}"
        if args.force or not src.exists():
            if args.offline:
                placeholder_tts(text, src)
            else:
                log(f"ナレーション生成 シーン{sid} …")
                generate_tts(client, text, src)
        limit = float(s["duration"]) - NARRATION_LEAD - NARRATION_TAIL
        d = fit_audio(src, dst, limit)
        log(f"  シーン{sid}: ナレーション {d:.2f}s / 枠 {limit:.2f}s")
        narr[sid] = dst

    # 3) 環境音 ---------------------------------------------------------------
    ambient = None
    if script.get("ambient", True):
        ambient = aud_dir / "ambient.wav"
        starts, t = {}, 0.0
        for s in script["scenes"]:
            starts[s["id"]] = t
            t += float(s["duration"])
        stingers = [starts[s["id"]] + float(s.get("stinger_at", 0.0))
                    for s in script["scenes"] if s.get("stinger", s["id"] in (3, 4))]
        make_ambient(t, stingers, ambient)

    # 4) 動画 -----------------------------------------------------------------
    out = workdir / f"{slug}{'_offline' if args.offline else ''}.mp4"
    render_video(script, images, narr, ambient, out, fps)

    # 5) 投稿用テキスト --------------------------------------------------------
    post = [script.get("caption", "").strip(), "", " ".join(script.get("hashtags", []))]
    hooks = script.get("next_episode_hooks") or {}
    if hooks:
        post += ["", "--- next episode hooks (not for posting) ---"]
        post += [f"{k}: {v}" for k, v in hooks.items()]
    (workdir / "caption.txt").write_text("\n".join(post).strip() + "\n", encoding="utf-8")

    log(f"✓ 完成: {out}")
    log(f"✓ キャプション: {workdir / 'caption.txt'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
