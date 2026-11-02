# iPhoneでのGitHub Pages公開

## 推奨：ブランチから公開（ビルド設定不要）

ファイルが `isozin-ddd/-` のmainブランチへ保存されてから行います。

1. Safariで https://github.com/isozin-ddd/-/settings/pages を開き、GitHubへログインします。メニューが省略される場合だけ「デスクトップ用Webサイトを表示」を使用してください。Safariの実験的機能を変更する必要はありません。
2. **Build and deployment → Source → Deploy from a branch** を選択。
3. **Branch: main**、**Folder: /docs** を選択して **Save**。
4. 発行処理を待ち、この設定画面の **Visit site** から開きます。この画面に出るHTTPS URLが実際の公開URLです。
5. 設定を **Enforce HTTPS** にできる場合はONにしてください。

静的ファイルはすべて `docs/` にまとまっています。GitHub Pagesが使う標準の公開処理だけで動作し、独自のバックエンドは不要です。

## Privateリポジトリの場合

現在のリポジトリ `isozin-ddd/-` はPrivateです。GitHub FreeではPublicリポジトリのPages、Pro等ではPrivateリポジトリのPagesが利用できます。アカウントの契約は未確認です。

Pages設定画面がアップグレードを要求する場合、無料で進めるには **Settings → General → Danger Zone → Change repository visibility → Public** の所有者操作が必要です。公開されるのはソースコードです。生成動画は端末内保存なので、この操作でアップロードされることはありません。この連携ツールは公開範囲変更に対応していないため、勝手にPrivateをPublicへ変更しません。

既にPro等の対象プランであれば、リポジトリをPrivateのままPagesを有効化できます。ただし通常のPagesサイト自体はインターネット上に公開されます。

## GitHub Actions方式を選ぶ場合（任意）

`.github/workflows/pages.yml` を保存できた場合、Actions方式も選べます。

1. 同じPages設定のSourceを **GitHub Actions** に変更します。
2. https://github.com/isozin-ddd/-/actions で **Publish Canvas app to GitHub Pages** を開き、**Run workflow → main → Run workflow**。
3. 緑の成功表示になった公開実行のEnvironment URL、またはPages設定のVisit siteから開きます。

ブランチ方式を選ぶ場合、この独自ワークフローの失敗はPagesの標準公開とは別です。Source未設定の状態では `configure-pages` がPages未設定エラーになります。

## iPhone実機での最終チェック（未実施）

- 360×640・3秒・1本：各ボタン、MP4録画、動画再生、共有から「ファイルに保存」。
- 同じ設定で10本：進捗、各動画の違い、発熱、停止、再試行、10本それぞれのファイル保存。
- Safariを一度閉じ、再度開いてライブラリが残ること。別端末には自動同期しません。
- Safariを非表示にすると録画が停止すること。
- 540 → 720 → 1080×1920：各段階で先に1本。1080pで失敗する場合は低い解像度へ戻すこと。
- 共有できない場合は「MP4をダウンロード」→Safariのダウンロード一覧→ファイルアプリ。

## こちらから初回設定できない理由

現在のGitHub連携はファイル・コミット・Actions実行状況の取得に対応していますが、Pages作成/設定APIと公開範囲変更APIを提供していません。CLIの別認証も利用できません。公開処理の成功・URL取得を確認できるまでは、以下のURLは**想定される形式**にすぎません。

`https://isozin-ddd.github.io/-/`

**このURLを公開済みとは扱いません。** 所有者が上記のPages初回設定を完了した後に、Visit siteのURLで確認が必要です。

## 公式資料

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://webkit.org/blog/11353/mediarecorder-api/

WebKitの資料はAPIの説明であり、現在使っているiPhone実機の互換性保証ではありません。アプリは実行時のMP4判定と実録画で確認します。
