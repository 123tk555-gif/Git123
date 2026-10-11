# タスクボードの画面(フロントエンド)

React 19 + Vite 8 で作った、トレロ風タスク管理アプリの画面です。
機能や API の説明は、`taskboard/要件定義書.md` にまとめています。

## よく使うコマンド(このフォルダで実行する)

| コマンド | 内容 |
|---|---|
| `npm install` | 初回だけ。必要な部品を入れる |
| `npm run dev` | 開発用の画面サーバーを起動する(`http://localhost:5173/tasksboard.html`)。`/api` は Spring Boot(`127.0.0.1:8080`)に中継する |
| `npm run build` | 画面を変換して `../src/main/resources/static/` に出力する(Spring Boot が配信する) |
| `npm run lint` | コードの書き方をチェックする(oxlint) |

## 主なファイル

| ファイル | 役割 |
|---|---|
| `tasksboard.html` | 画面の入口 |
| `src/App.jsx` | 画面全体(読み込み・お知らせ・入力画面の開閉・ドラッグ中のカードの管理) |
| `src/components/` | ボード・列・カード・入力画面・削除の確認画面などの部品 |
| `src/api.js` | バックエンドの API を呼ぶ |
| `src/dueDate.js`、`src/useToday.js` | 「期限切れ」「今日まで」などの表示と、今日の日付の管理 |
| `src/index.css` | 見た目(大きめの文字・高コントラスト・色だけに頼らない表示) |
