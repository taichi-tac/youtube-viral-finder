import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データベースファイルのパス
const dbPath = join(__dirname, '../../data/youtube-viral.db');

// データベース接続を作成
export const db: Database.Database = new Database(dbPath);

// WALモードを有効化（パフォーマンス向上）
db.pragma('journal_mode = WAL');

/**
 * データベースの初期化
 */
export function initDatabase() {
  // ナレッジテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 分析視点テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_perspectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      prompt_template TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 分析結果テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      video_title TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      analysis TEXT NOT NULL,
      success_factors TEXT,
      recommendations TEXT,
      analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // LLM設定テーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ollama_url TEXT DEFAULT 'http://localhost:11434',
      model_name TEXT DEFAULT 'llava',
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 1000,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // デフォルト設定を挿入
  const config = db.prepare('SELECT COUNT(*) as count FROM llm_config').get() as { count: number };
  if (config.count === 0) {
    db.prepare(`
      INSERT INTO llm_config (ollama_url, model_name, temperature, max_tokens)
      VALUES (?, ?, ?, ?)
    `).run('http://localhost:11434', 'llava', 0.7, 1000);
  }

  // デフォルトの分析視点を挿入
  const perspectives = db.prepare('SELECT COUNT(*) as count FROM analysis_perspectives').get() as { count: number };
  if (perspectives.count === 0) {
    const defaultPerspectives = [
      {
        name: 'サムネイルの視覚的要素',
        description: '色使い、文字の大きさ、レイアウトなどの視覚的要素を分析',
        prompt_template: `このYouTube動画のサムネイルを分析してください。

動画情報:
- タイトル: {title}
- チャンネル: {channel}
- 再生数: {views}
- 登録者数: {subscribers}
- 登録者倍率: {ratio}倍（バイラル動画）

以下の視点で分析してください:
1. 色使い（どんな色が使われているか、色の組み合わせ）
2. 文字（大きさ、フォント、配置、読みやすさ）
3. 人物・表情（人が写っているか、表情はどうか）
4. レイアウト（構図、視線誘導）
5. 視覚的インパクト（目を引く要素）

バイラルになった要因を具体的に説明してください。`
      },
      {
        name: '感情的訴求',
        description: 'サムネイルが視聴者にどのような感情を喚起するかを分析',
        prompt_template: `このYouTube動画のサムネイルの感情的訴求力を分析してください。

動画情報:
- タイトル: {title}
- チャンネル: {channel}
- 再生数: {views}
- 登録者数: {subscribers}
- 登録者倍率: {ratio}倍（バイラル動画）

以下の視点で分析してください:
1. どのような感情を喚起するか（好奇心、驚き、共感、不安など）
2. クリックしたくなる心理的トリガー
3. ターゲット層への訴求力
4. タイトルとサムネイルの相乗効果

視聴者の感情を動かす要素を特定してください。`
      },
      {
        name: 'トレンド・コンテキスト',
        description: '時代背景、トレンド、ジャンルの文脈での分析',
        prompt_template: `このYouTube動画のサムネイルをトレンドの文脈で分析してください。

動画情報:
- タイトル: {title}
- チャンネル: {channel}
- 再生数: {views}
- 登録者数: {subscribers}
- 登録者倍率: {ratio}倍（バイラル動画）

以下の視点で分析してください:
1. 現在のYouTubeトレンドとの関連性
2. ジャンル特有の成功パターン
3. 競合との差別化ポイント
4. タイムリーな要素

トレンドを捉えた要素と独自性のバランスを分析してください。`
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO analysis_perspectives (name, description, prompt_template)
      VALUES (?, ?, ?)
    `);

    for (const perspective of defaultPerspectives) {
      stmt.run(perspective.name, perspective.description, perspective.prompt_template);
    }
  }

  console.log('✅ データベースを初期化しました');
}

/**
 * データベースを閉じる
 */
export function closeDatabase() {
  db.close();
}
