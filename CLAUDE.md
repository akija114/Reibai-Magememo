# CLAUDE.md（このリポジトリで開発する時のルール）

冷媒配管の曲げ共有アプリ（空調工事の職人向け・iPhone優先）。ビルドなしの静的サイトで、GitHub Pages（main）が本番。

## 作業の進め方
- **必要なファイル・関数だけ調べる。** `grep -n` で場所を探して、その周りだけ読む。無関係なコードを読み直したり、ついでに直したりしない
- **変更は最小限。** 頼まれていない整理・書き換え・名前変更をしない。周りのコードの書き方（1行が長い・短い名前・日本語のコメント）に合わせる
- **main に直接入れない。** 作業ブランチで行い、実機確認の後にユーザーが判断する
- **報告は簡潔に。** 何を変えたか／テスト結果／確認してほしい所だけ。失敗したテストは隠さずに書く
- ユーザーへの説明・コメント・コミットメッセージは日本語（職人に分かる言葉で）

## ファイル
| ファイル | 中身 |
|---|---|
| `index.html` | 曲げ共有の画面とCSS。`html[data-app="bend"]`、初心者モードは `html[data-mode="easy"]` |
| `core.js` | 曲げ共有・図面・現調で**共用**（`APP` 変数で分ける）。計算・3D・保存・初心者モード |
| `models.js` | 機器の模型データ（触るのは機種を足す時だけ） |
| `drain.js` | ドレン配管 |
| `zumen.html`/`zumen.js`・`genchou.html`/`genchou.js`・`kiki.html` | 図面・現調・機器（`core.js` を読む） |
| `sw.js` | オフライン用のキャッシュ |
| `docs/beginner-mode-plan.md` | 初心者モードの経緯・仕様・テスト結果 |

## 守るもの（壊さない）
- **曲げ計算**：`bR()`（曲げR、標準は外径×4）、`calc()`（引き＝R×角度/90、シュー、累計、定尺）。計算式・向きの定義（`t`：0=上・90=右・180=下・270=左、進む方向を向いて見た向き）を変えない
- **データ形式**：`st`（`localStorage["pbm1"]`）、`rows:[{l,a,t,o}]`、端末保存 `pbm_sites`、共有テキスト・リンク（`exportTextZ`・`shareSummary`）。既存の保存データが開けること
- **3D表示**：`build3D()`（中身は `build3D0`）、`loop()`、`fitT()`、曲げ入力 `openDirView`／`placeDirCam`／`drawDial`／`closeDirView`、曲げ手順 `openGuide`
- **保存・共有・元に戻す**：`save()`、`histGo()`、`openCloud`、`initLocal`
- **詳細モード**：今までの画面・操作そのもの。初心者モード用の変更は必ず `EZ` が真の時だけ動くようにする
- **初心者モード**（`EZ`）：`ezUpd`・`ezStep`（STEP 1〜4）・`ezFitMain`（斜めから全体）・`ezOvLayout`／`ezOvRender`（STEP 3 の全体図）・`ezDvFilter`。表示の切替だけで、データ・計算は詳細モードと同じ物を使う
- **他の画面**：`core.js` を変えたら図面・現調・機器が今までどおり開くこと（`APP==="bend"` で囲む）
- **オフライン**：`core.js` などを変えたら、読み込む側の `?v=` と `sw.js` の `VER`・事前キャッシュのURLをそろえる

## テスト（変更に必要な物だけ）
- 構文：`node --check core.js`
- 画面：Playwright（`/opt/node22/lib/node_modules/playwright`、Chromium）で iPhone の画面サイズ（390×664 など）。`http-server` でリポジトリを配信する
  - three.js（cdnjs）はこの環境からは取れないので、`npm pack three@0.128.0` の `build/three.min.js` を route で返す
  - サービスワーカー経由の読み込みも route するには `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1`
- 計算を変えていないことの確認：同じ曲げデータで `calc()` の結果・共有テキストが変更前と一致すること（共有テキスト先頭のコピー時刻は除く）
- 確認する事の例：初心者モードと詳細モードの切替でデータが変わらない／保存→再読込／圏外で再読込／図面・現調・機器でJSエラーなし
- iPhone 実機（Safari・ホーム画面追加版）は確認できないので、その旨を報告に書く

## プレビュー（本番に影響させずに iPhone で見る）
`https://raw.githack.com/akija114/Reibai-Magememo/<コミットのSHA>/index.html`（本番とは別のアドレスなので、データ・オフライン用キャッシュも別）
