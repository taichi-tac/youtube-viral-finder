# クイックスタートガイド 🚀

## 1. YouTube API キーの取得（5分）

### ステップ 1: Google Cloud Console にアクセス
1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. Googleアカウントでログイン

### ステップ 2: プロジェクトを作成
1. 画面上部の「プロジェクトを選択」をクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: "YouTube Viral Finder"）
4. 「作成」をクリック

### ステップ 3: YouTube Data API v3 を有効化
1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 検索ボックスに「YouTube Data API v3」と入力
3. 「YouTube Data API v3」をクリック
4. 「有効にする」をクリック

### ステップ 4: APIキーを作成
1. 左メニューから「APIとサービス」→「認証情報」を選択
2. 上部の「認証情報を作成」→「APIキー」をクリック
3. APIキーが表示されるのでコピー
4. （オプション）「キーを制限」でセキュリティ設定

## 2. ツールのセットアップ（2分）

```bash
# youtube_toolディレクトリに移動
cd /Users/user/Miyabi/youtube_tool

# .envファイルを作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
# YOUTUBE_API_KEY=your_api_key_here
```

`.env`ファイルを以下のように編集：

```
YOUTUBE_API_KEY=AIzaSyAaBbCc...（コピーしたAPIキー）
```

## 3. 初めての実行

### 例1: 基本的な検索

```bash
npm run dev -- search -k "料理"
```

これで、「料理」というキーワードで登録者数の3倍以上の再生数を持つ動画が検索されます。

### 例2: 期間を指定

```bash
npm run dev -- search -k "プログラミング" -a 2024-01-01 -b 2024-12-31
```

2024年の動画だけを検索します。

### 例3: 詳細情報を表示

```bash
npm run dev -- search -k "筋トレ" -o detailed
```

各動画の詳細情報が表示されます。

### 例4: CSVで保存

```bash
npm run dev -- search -k "ビジネス" -o csv -f results.csv
```

結果がCSVファイルに保存され、Excelで開けます。

## 4. よくある使い方

### バイラル動画を探して分析

```bash
# 最近1ヶ月のバイラル動画を検索
npm run dev -- search -k "AI" -a 2024-12-01 -o detailed

# 倍率10倍以上の超バイラル動画のみ
npm run dev -- search -k "ゲーム" -t 10

# 結果を保存して後で分析
npm run dev -- search -k "投資" -o json -f analysis.json
```

### 競合チャンネル分析

```bash
# 自分のジャンルでバイラル動画を探す
npm run dev -- search -k "Vlog" -m 100 -o csv -f viral_vlogs.csv

# Excelで開いて、どんな動画がバイラルになっているか分析
```

## 5. トラブルシューティング

### APIキーエラーが出る

```
❌ エラー: YOUTUBE_API_KEY が設定されていません。
```

→ `.env`ファイルを確認してください。`YOUTUBE_API_KEY=`の後にスペースなしでキーを入力。

### 検索結果が0件

- キーワードを変えてみる
- 期間指定を外してみる（`-a`と`-b`オプションを削除）
- 倍率を下げてみる（例: `-t 2`）

### クォータ超過エラー

```
Error: quotaExceeded
```

→ 1日のAPI使用量を超えました。翌日まで待つか、別のAPIキーを使用してください。

## 6. 使用例コマンドを表示

```bash
npm run dev -- examples
```

より多くの使用例が表示されます。

## 次のステップ

- [README.md](README.md) で全機能を確認
- 出力されたCSVをExcelで開いて分析
- 定期的に実行してバイラルトレンドを追跡

楽しいバイラル動画発見を！🔥
