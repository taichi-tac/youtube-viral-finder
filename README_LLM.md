# YouTube Viral Finder - LLM分析機能 🤖

## 概要

ローカルLLM（Ollama）を使用して、バイラル動画のサムネイルを自動分析する機能です。

管理者が設定したナレッジベースと分析視点に基づいて、**なぜその動画が伸びたのか**を分析します。

## 🎯 主な機能

### 1. サムネイル分析
- LLaVA（Vision LLM）を使用した画像認識
- 複数の視点からの多角的分析
- 成功要因の自動抽出
- 改善提案の生成

### 2. 管理者ダッシュボード
- LLM設定管理
- 分析視点のカスタマイズ
- ナレッジベース管理
- 分析履歴の閲覧

### 3. ナレッジベース
- 分析の視点・基準を登録
- カテゴリ別に整理
- プロンプトテンプレート管理

## 📦 セットアップ

### 1. Ollamaのインストール

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# https://ollama.com/download からダウンロード
```

### 2. LLaVAモデルのダウンロード

```bash
ollama pull llava
```

### 3. Ollamaサーバーの起動

```bash
ollama serve
```

デフォルトで`http://localhost:11434`で起動します。

### 4. 管理画面の起動

```bash
npm run admin
```

管理画面: http://localhost:8081

## 🚀 使い方

### 基本的な流れ

1. **Ollamaを起動**
   ```bash
   ollama serve
   ```

2. **管理画面で接続テスト**
   - http://localhost:8081 を開く
   - 「LLM設定」タブで「接続テスト」をクリック

3. **分析視点の確認・編集**
   - 「分析視点」タブでデフォルトの視点を確認
   - 必要に応じて編集・追加

4. **動画を分析**
   - 検索画面で動画を検索
   - 「分析」ボタンをクリック（実装予定）
   - または、APIを直接呼び出し

### API経由で分析

```bash
# 動画を分析
curl -X POST http://localhost:8081/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "動画ID",
    "title": "動画タイトル",
    "channelName": "チャンネル名",
    "thumbnailUrl": "サムネイルURL",
    "viewCount": 1000000,
    "subscriberCount": 100000,
    "viewsToSubscribersRatio": 10
  }'

# 分析結果を取得
curl http://localhost:8081/api/analysis/1
```

## 📊 デフォルトの分析視点

### 1. サムネイルの視覚的要素
- 色使い
- 文字の大きさ・配置
- 人物・表情
- レイアウト
- 視覚的インパクト

### 2. 感情的訴求
- 喚起する感情
- クリックしたくなる心理的トリガー
- ターゲット層への訴求力
- タイトルとの相乗効果

### 3. トレンド・コンテキスト
- YouTubeトレンドとの関連性
- ジャンル特有の成功パターン
- 競合との差別化
- タイムリーな要素

## 🎛️ 管理画面の使い方

### LLM設定
- **Ollama URL**: Ollamaサーバーのアドレス（デフォルト: http://localhost:11434）
- **モデル名**: 使用するモデル（推奨: llava）
- **Temperature**: 生成の多様性（0.0-1.0、デフォルト: 0.7）
- **Max Tokens**: 最大トークン数（デフォルト: 1000）

### 分析視点の追加

1. 「分析視点」タブを開く
2. 「+ 新規作成」をクリック
3. 以下を入力：
   - **名前**: 分析視点の名称
   - **説明**: 何を分析するか
   - **プロンプトテンプレート**: LLMに渡すプロンプト

プロンプトテンプレートで使える変数：
- `{title}` - 動画タイトル
- `{channel}` - チャンネル名
- `{views}` - 再生数
- `{subscribers}` - 登録者数
- `{ratio}` - 登録者倍率

### ナレッジベースの活用

ナレッジベースには、分析に役立つ情報を登録します：

- バイラルの成功パターン
- ジャンル別の特徴
- 避けるべきパターン
- ベストプラクティス

## 💾 データベース構造

```
data/youtube-viral.db (SQLite)
├── knowledge               # ナレッジベース
├── analysis_perspectives   # 分析視点
├── analysis_results        # 分析結果
└── llm_config             # LLM設定
```

## 🔧 トラブルシューティング

### Ollamaに接続できない

```
❌ Ollamaサーバーに接続できません
```

**解決方法:**
1. Ollamaが起動しているか確認
   ```bash
   ollama list
   ```

2. URLが正しいか確認（管理画面のLLM設定）

3. ファイアウォールの確認

### LLaVAモデルがない

```
Error: model 'llava' not found
```

**解決方法:**
```bash
ollama pull llava
```

### 分析が遅い

**原因:** LLaVAは画像認識モデルのため、処理に時間がかかります。

**対策:**
1. GPUを使用する（NVIDIA CUDA対応）
2. 軽量モデルに変更
3. Max Tokensを減らす

## 📈 パフォーマンス

### 推奨スペック
- **CPU**: 4コア以上
- **RAM**: 8GB以上
- **GPU**: NVIDIA GPU (CUDA対応) 推奨
- **ストレージ**: SSD推奨

### 処理時間の目安
- 1動画の分析: 30-60秒（CPU）
- 1動画の分析: 10-20秒（GPU）

## 🌐 デプロイ時の注意

### オンライン環境での推奨構成

```
VPS/クラウドサーバー
├── Ollama Server (8GB RAM以上)
├── YouTube Viral Finder Web (検索画面)
└── YouTube Viral Finder Admin (管理画面)
```

### セキュリティ

1. **管理画面の保護**
   - Basic認証の追加
   - IP制限
   - HTTPS化

2. **API制限**
   - レート制限
   - 認証トークン

## 📚 次のステップ

1. [ ] 検索結果に「分析」ボタンを追加
2. [ ] 分析結果の詳細表示ページ
3. [ ] バッチ分析機能
4. [ ] A/Bテストサポート
5. [ ] レポート自動生成

## 🤝 貢献

機能改善やバグ報告は歓迎します！

## 📄 ライセンス

MIT
