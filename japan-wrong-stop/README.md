# Japan Wrong Stop — ショート動画自動生成ツール

> Japanese horror. You choose. You survive… or not.

`script.json` 1つから、縦型ホラーショート（1080x1920・55〜60秒・mp4）を1コマンドで作ります。

```
python make.py script.json
```

## 必要なもの

- Python 3.10 以上
- OpenAI の API キー（画像生成と TTS の利用料がかかります）
- ffmpeg：`imageio-ffmpeg` が自動で用意するので、別途インストールは不要です。すでに入っていればそれも使えます。

## インストール

```bash
cd japan-wrong-stop
python -m venv .venv
source .venv/bin/activate          # Windows は .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows は copy .env.example .env
```

`.env` を開いて `OPENAI_API_KEY=` に自分のキーを書きます。`.env` は `.gitignore` に入っているので、コミットされません。

## 使い方

```bash
# 本番：画像6枚（実際に生成するのは5枚）＋ナレーション＋動画を作る
python make.py script.json

# APIを使わない試し書き出し。仮画像と無音で、テロップや構図、尺を確認する
python make.py script.json --offline

# 画像・音声をすべて作り直す（通常は生成済みのファイルを再利用して課金を節約する）
python make.py script.json --force
```

出力は `output/<slug>/` に保存されます。

| ファイル | 内容 |
| --- | --- |
| `ep01_kisaragi.mp4` | 完成した動画 |
| `images/scene_XX_raw.png` | API から返ってきた元画像 |
| `images/scene_XX.png` | 9:16 に切り抜いた画像 |
| `audio/scene_XX.mp3` | ナレーション（尺に収まらないときは早回しした版） |
| `audio/ambient.wav` | 自作の環境音（低いうなり＋低音の一撃） |
| `prompts.json` | 実際に送った画像プロンプト |
| `caption.txt` | 投稿用のキャプション、ハッシュタグ、次回の冒頭案 |

1枚だけ作り直したいときは、`output/<slug>/images/scene_03_raw.png` を削除して再実行します。

## 自動で行うこと

1. **ルール検査**：次のどれかに違反すると中止します（無視して続けるなら `--skip-checks`）。
   - 合計尺が55〜60秒、1シーンが5〜14秒
   - テロップが7語以内
   - 1シーン目のテロップが「Never …」で始まる
   - 最終シーンがA/Bの2択で、「Comment A or B」で締める
   - 第2話以降のナレーションが「XX% chose …」で始まる
2. **画像**：各シーンのプロンプトの先頭に【共通スタイル】と【主人公】を付けます。末尾には「既存作品・実在人物に似せない／文字なし／グロなし」の指定を付けます。既定のモデルは `gpt-image-1` で、1024x1536 で生成してから中央を 1080x1920 に切り抜きます。
3. **ナレーション**：`gpt-4o-mini-tts` の `onyx`（低めの男性声）で、「静かに、ゆっくり」と指示して読ませます。シーンに収まらないときは最大1.25倍まで早回しし、それでも長い場合は警告します。
4. **映像**：画像にゆっくりズームをかけ、白文字＋黒縁のテロップ、周辺減光、フィルムグレイン、シーン間の暗転を付けます。シーン1には蛍光灯のちらつきを入れます。
5. **最終シーン**：画面を左右に分け、左のAは暖色、右のBは寒色にして、中央に光の境界線を引きます。

## script.json の書き方

```jsonc
{
  "episode": 1,
  "slug": "ep01_kisaragi",          // 出力フォルダ名・ファイル名
  "ambient": true,                  // 自作環境音を入れるか
  "bgm": null,                      // 自分で用意した BGM（mp3）のパス。権利を確認済みのものだけ
  "scenes": [
    {
      "id": 1,
      "duration": 5,                // 秒（5〜14）
      "protagonist": false,         // 主人公の描写を付けるか（既定は true）
      "image_prompt": "...",
      "narration": "...",
      "telop": "Never ...",         // テロップがなければ null
      "telop_position": "center",   // top / center / bottom
      "zoom": "in",                 // in / out
      "zoom_strength": 0.08         // ズーム量（任意）
    },
    { "id": 6, "image_from": 5, "layout": "choice",
      "choices": { "A": "Get off", "B": "Stay on" }, "...": "..." }
  ],
  "caption": "...", "hashtags": [], "next_episode_hooks": { "A": "...", "B": "..." }
}
```

その他の任意キーは次のとおりです。

| キー | 内容 |
| --- | --- |
| `image_from` | 他のシーンの画像を使い回す |
| `layout: "choice"` | A/B の分割画面にする |
| `choice_delay` | 選択肢を表示するまでの秒数 |
| `stinger` | シーン頭に低音の「ドン」を入れる（既定ではシーン3と4） |
| `flicker` | 画面のちらつき |
| `fade_in` / `fade_out` | 暗転の秒数 |

### 主人公について

仕様どおり、主人公の描写は既定で全シーンに付けます。ただし第1話では、次の3シーンだけ `"protagonist": false` にしています。主人公が描かれると「無人」という演出が崩れるためです。

- シーン1：誰もいない車内
- シーン3：無人駅
- シーン4：ホームの人影

## .env の任意設定

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | `dall-e-3` も使えます（1024x1792 で生成） |
| `OPENAI_IMAGE_QUALITY` | `high` | `medium` や `low` にすると安くなります |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | `tts-1` / `tts-1-hd` も使えます（声色の指示は無効になります） |
| `OPENAI_TTS_VOICE` | `onyx` | 声の種類 |
| `FONT_PATH` | 自動 | テロップ用の太字フォント。Mac は Arial Black、Windows は Arial Bold を自動で探します |

## 困ったとき

- **画像生成で失敗する**：安全フィルターに引っかかっている可能性があります。`image_prompt` の表現を穏やかにしてください。
- **ナレーションが長いという警告が出る**：文を短くするか、そのシーンの `duration` を延ばしてください（合計55〜60秒は守ります）。
- **書き出しが遅い**：1080x1920・30fps を1フレームずつ合成するため、数分かかります（検証環境では約4分）。
- **公開前の確認**：生成画像が既存のアニメや映画のキャラクター・絵柄に似ていないか、文字が写り込んでいないかを、必ず目で確認してください。
