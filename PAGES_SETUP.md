# GitHub Pages運用とiPhoneでの確認

既存公開先は **https://isozin-ddd.github.io/-/** です。リポジトリ `isozin-ddd/-` がPublicであることは確認済みです。Publicへ変更する操作や有料Renderへの移行は不要です。

既存のPages設定を維持し、mainブランチへのコード反映後に公開処理の完了を確認します。既に動いている公開方式を変更する必要はありません。生成動画は利用者のブラウザ内に保存され、Pagesの更新でGitHubへアップロードされることはありません。

## 既存公開処理の確認

1. [Actions](https://github.com/isozin-ddd/-/actions)で今回のコミットに対応するPages公開が成功しているか確認します。
2. [Pages設定](https://github.com/isozin-ddd/-/settings/pages)の **Visit site**、または既存のHTTPS URLを開きます。
3. 新しい「Global Viral Shorts Factory」、60テンプレート、1／3／5／10本の選択が表示されることを確認します。古い画面の場合は公開処理を待ち、ページを再読み込みします。

作業環境から公開URLへのアクセスは外向きプロキシのCONNECT 403に阻まれています。これはサイト自身が403を返したという意味ではなく、ここから公開反映を確認できないという制約です。ソース保存と公開URL上での動作確認は分けて記録します。

## Pagesがまだ有効でない場合だけ行う設定

**既に公開できている場合は、この設定変更は不要です。**

ビルド不要のブランチ方式：Pages設定で **Source: Deploy from a branch → main → /docs → Save**。静的ファイルはすべて`docs/`にあります。

GitHub Actions方式を使う場合：Sourceを **GitHub Actions** にし、Actionsの **Publish Canvas app to GitHub Pages** を実行します。`.github/workflows/pages.yml`が`docs/`を公開します。既存のブランチ方式と両方へ切り替え続ける必要はありません。

このアプリにサーバー、Docker、Render、APIキー、ログインは必要ありません。Safariの実験的機能を変更する必要もありません。

## iPhone実機での確認項目（未実施）

1. **360×640・3秒・1本**から、テンプレート選択、Canvas、録画、音声、再生を確認。
2. 完成動画の「再生・保存」→「共有からファイルに保存」→iPhoneの共有シートで「ファイルに保存」。共有できない場合は「MP4をダウンロード」→Safariのダウンロード一覧→ファイルアプリ。
3. 同じ設定で3本→5本→10本。進捗、各動画の違い、停止、未完了分の再試行、保存を確認。
4. Safariを非表示にすると録画が停止し、前面に戻すと再試行できることを確認。生成中は画面をロックせず、Safariを前面に維持します。
5. 540→720→1080幅と段階的に、まず各1本。現在のデスクトップChromiumでは各ジャンル代表1種類×3解像度の計12本に成功していますが、iPhoneでの結果ではありません。
6. 参考資料・投稿実績・品質メモの保存、JSON書き出し、再読み込み後の復旧を確認。

iPhone実機の録画・共有シート・ファイル保存・1080p、長時間の発熱やメモリ、高解像度10本連続は未検証です。50／100本は有効化していません。

## 公式資料

- [GitHub Pagesの公開ソース](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pagesについて](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [WebKit MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/)

WebKitの資料はAPIの説明であり、現在使っているiPhone実機の互換性保証ではありません。アプリは実行時のMP4判定と、実際の録画・読み込みで確認します。
