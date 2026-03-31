import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, db } from './database/db.js';
import { AnalysisService } from './services/analysis-service.js';
import type { ViralVideo } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.ADMIN_PORT || 8081;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// データベース初期化
initDatabase();

const analysisService = new AnalysisService();

// 管理画面トップページ
app.get('/', (req: Request, res: Response) => {
  res.send(generateAdminDashboard());
});

// ナレッジ一覧取得
app.get('/api/knowledge', (req: Request, res: Response) => {
  try {
    const knowledge = db.prepare('SELECT * FROM knowledge ORDER BY created_at DESC').all();
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// ナレッジ作成
app.post('/api/knowledge', (req: Request, res: Response) => {
  try {
    const { title, category, content } = req.body;
    const stmt = db.prepare('INSERT INTO knowledge (title, category, content) VALUES (?, ?, ?)');
    const info = stmt.run(title, category, content);
    res.json({ id: info.lastInsertRowid, message: 'ナレッジを作成しました' });
  } catch (error) {
    res.status(500).json({ error: '作成に失敗しました' });
  }
});

// ナレッジ更新
app.put('/api/knowledge/:id', (req: Request, res: Response) => {
  try {
    const { title, category, content } = req.body;
    const stmt = db.prepare(
      'UPDATE knowledge SET title = ?, category = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(title, category, content, req.params.id);
    res.json({ message: 'ナレッジを更新しました' });
  } catch (error) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// ナレッジ削除
app.delete('/api/knowledge/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM knowledge WHERE id = ?').run(req.params.id);
    res.json({ message: 'ナレッジを削除しました' });
  } catch (error) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// 分析視点一覧取得
app.get('/api/perspectives', (req: Request, res: Response) => {
  try {
    const perspectives = db.prepare('SELECT * FROM analysis_perspectives ORDER BY id').all();
    res.json(perspectives);
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// 分析視点作成
app.post('/api/perspectives', (req: Request, res: Response) => {
  try {
    const { name, description, prompt_template } = req.body;
    const stmt = db.prepare(
      'INSERT INTO analysis_perspectives (name, description, prompt_template) VALUES (?, ?, ?)'
    );
    const info = stmt.run(name, description, prompt_template);
    res.json({ id: info.lastInsertRowid, message: '分析視点を作成しました' });
  } catch (error) {
    res.status(500).json({ error: '作成に失敗しました' });
  }
});

// 分析視点更新
app.put('/api/perspectives/:id', (req: Request, res: Response) => {
  try {
    const { name, description, prompt_template, is_active } = req.body;
    const stmt = db.prepare(
      'UPDATE analysis_perspectives SET name = ?, description = ?, prompt_template = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(name, description, prompt_template, is_active ? 1 : 0, req.params.id);
    res.json({ message: '分析視点を更新しました' });
  } catch (error) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// 分析視点削除
app.delete('/api/perspectives/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM analysis_perspectives WHERE id = ?').run(req.params.id);
    res.json({ message: '分析視点を削除しました' });
  } catch (error) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// LLM設定取得
app.get('/api/llm-config', (req: Request, res: Response) => {
  try {
    const config = db.prepare('SELECT * FROM llm_config ORDER BY id DESC LIMIT 1').get();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// LLM設定更新
app.put('/api/llm-config', (req: Request, res: Response) => {
  try {
    const { ollama_url, model_name, temperature, max_tokens } = req.body;
    const stmt = db.prepare(
      'UPDATE llm_config SET ollama_url = ?, model_name = ?, temperature = ?, max_tokens = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
    );
    stmt.run(ollama_url, model_name, temperature, max_tokens);
    res.json({ message: 'LLM設定を更新しました' });
  } catch (error) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// Ollama接続テスト
app.get('/api/test-ollama', async (req: Request, res: Response) => {
  try {
    const isConnected = await analysisService.testOllamaConnection();
    if (isConnected) {
      const models = await analysisService.getAvailableModels();
      res.json({ success: true, message: 'Ollamaに接続できました', models });
    } else {
      res.json({ success: false, message: 'Ollamaに接続できません' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'エラーが発生しました' });
  }
});

// 動画分析実行
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const video: ViralVideo = req.body;
    console.log(`🎬 動画を分析中: ${video.title}`);

    const result = await analysisService.analyzeVideo(video);

    res.json({
      success: true,
      message: '分析が完了しました',
      analysisId: result.id,
    });
  } catch (error) {
    console.error('分析エラー:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '分析に失敗しました',
    });
  }
});

// 分析結果取得
app.get('/api/analysis/:id', (req: Request, res: Response) => {
  try {
    const result = analysisService.getAnalysisResult(parseInt(req.params.id));
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: '分析結果が見つかりません' });
    }
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// 動画IDで分析結果取得
app.get('/api/analysis/video/:videoId', (req: Request, res: Response) => {
  try {
    const result = analysisService.getAnalysisByVideoId(req.params.videoId);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: '分析結果が見つかりません' });
    }
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// 全分析結果取得
app.get('/api/analyses', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const results = analysisService.getAllAnalyses(limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: '取得に失敗しました' });
  }
});

// 分析結果表示ページ
app.get('/result/:id', (req: Request, res: Response) => {
  try {
    const result = analysisService.getAnalysisResult(parseInt(req.params.id));
    if (!result) {
      return res.status(404).send('分析結果が見つかりません');
    }
    res.send(generateAnalysisResultPage(result));
  } catch (error) {
    res.status(500).send('エラーが発生しました');
  }
});

// 管理画面HTML生成
function generateAdminDashboard(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理画面 - YouTube Viral Finder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 10px; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      border-bottom: 2px solid #eee;
    }
    .tab {
      padding: 10px 20px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }
    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      font-weight: bold;
    }
    .tab-content {
      display: none;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .tab-content.active { display: block; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #333; margin-bottom: 15px; font-size: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; color: #333; font-weight: 600; }
    input, textarea, select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
    }
    textarea { min-height: 150px; font-family: monospace; }
    button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    }
    button:hover { opacity: 0.8; }
    button.danger { background: #ff4444; }
    .card {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 15px;
      border-left: 3px solid #667eea;
    }
    .card h3 { color: #333; margin-bottom: 10px; font-size: 16px; }
    .card p { color: #666; font-size: 14px; margin-bottom: 5px; }
    .card-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .card-actions button { padding: 5px 15px; font-size: 12px; }
    .toggle {
      display: inline-block;
      width: 50px;
      height: 24px;
      background: #ccc;
      border-radius: 12px;
      position: relative;
      cursor: pointer;
    }
    .toggle.active { background: #667eea; }
    .toggle::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      top: 3px;
      left: 3px;
      transition: 0.3s;
    }
    .toggle.active::after { left: 29px; }
    .status { padding: 10px; border-radius: 5px; margin-bottom: 20px; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎛️ YouTube Viral Finder - 管理画面</h1>
      <p style="color: #666;">ナレッジ管理、分析視点設定、LLM設定</p>

      <div class="tabs">
        <button class="tab active" onclick="switchTab('llm')">LLM設定</button>
        <button class="tab" onclick="switchTab('perspectives')">分析視点</button>
        <button class="tab" onclick="switchTab('knowledge')">ナレッジ</button>
        <button class="tab" onclick="switchTab('analyses')">分析履歴</button>
      </div>
    </div>

    <!-- LLM設定タブ -->
    <div id="llm-tab" class="tab-content active">
      <div class="section">
        <h2>Ollama設定</h2>
        <div id="status-message" class="hidden"></div>

        <form id="llm-config-form">
          <div class="form-group">
            <label>Ollama URL</label>
            <input type="text" id="ollama-url" value="http://localhost:11434" required>
          </div>

          <div class="form-group">
            <label>モデル名</label>
            <input type="text" id="model-name" value="llava" required>
            <p style="font-size: 12px; color: #666; margin-top: 5px;">
              推奨: llava (画像認識対応)
            </p>
          </div>

          <div class="form-group">
            <label>Temperature (0.0 - 1.0)</label>
            <input type="number" id="temperature" value="0.7" min="0" max="1" step="0.1" required>
          </div>

          <div class="form-group">
            <label>Max Tokens</label>
            <input type="number" id="max-tokens" value="1000" min="100" max="4000" required>
          </div>

          <button type="button" onclick="testOllama()">接続テスト</button>
          <button type="submit">設定を保存</button>
        </form>
      </div>
    </div>

    <!-- 分析視点タブ -->
    <div id="perspectives-tab" class="tab-content">
      <div class="section">
        <h2>分析視点</h2>
        <button onclick="showAddPerspective()">+ 新規作成</button>
        <div id="perspectives-list" style="margin-top: 20px;"></div>
      </div>
    </div>

    <!-- ナレッジタブ -->
    <div id="knowledge-tab" class="tab-content">
      <div class="section">
        <h2>ナレッジベース</h2>
        <button onclick="showAddKnowledge()">+ 新規作成</button>
        <div id="knowledge-list" style="margin-top: 20px;"></div>
      </div>
    </div>

    <!-- 分析履歴タブ -->
    <div id="analyses-tab" class="tab-content">
      <div class="section">
        <h2>分析履歴</h2>
        <div id="analyses-list"></div>
      </div>
    </div>
  </div>

  <script>
    // タブ切り替え
    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');

      if (tabName === 'perspectives') loadPerspectives();
      if (tabName === 'knowledge') loadKnowledge();
      if (tabName === 'analyses') loadAnalyses();
    }

    // 初期化
    window.onload = function() {
      loadLLMConfig();
    };

    // LLM設定読み込み
    async function loadLLMConfig() {
      const res = await fetch('/api/llm-config');
      const config = await res.json();

      document.getElementById('ollama-url').value = config.ollama_url;
      document.getElementById('model-name').value = config.model_name;
      document.getElementById('temperature').value = config.temperature;
      document.getElementById('max-tokens').value = config.max_tokens;
    }

    // LLM設定保存
    document.getElementById('llm-config-form').onsubmit = async function(e) {
      e.preventDefault();

      const data = {
        ollama_url: document.getElementById('ollama-url').value,
        model_name: document.getElementById('model-name').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('max-tokens').value),
      };

      const res = await fetch('/api/llm-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      showStatus(result.message, 'success');
    };

    // Ollama接続テスト
    async function testOllama() {
      showStatus('接続テスト中...', 'success');

      const res = await fetch('/api/test-ollama');
      const result = await res.json();

      if (result.success) {
        showStatus(\`✅ 接続成功！利用可能なモデル: \${result.models.join(', ')}\`, 'success');
      } else {
        showStatus('❌ 接続失敗: ' + result.message, 'error');
      }
    }

    // 分析視点読み込み
    async function loadPerspectives() {
      const res = await fetch('/api/perspectives');
      const perspectives = await res.json();

      const list = document.getElementById('perspectives-list');
      list.innerHTML = perspectives.map(p => \`
        <div class="card">
          <h3>\${p.name}</h3>
          <p>\${p.description || ''}</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">
            更新: \${new Date(p.updated_at).toLocaleString('ja-JP')}
          </p>
          <div class="card-actions">
            <span class="toggle \${p.is_active ? 'active' : ''}" onclick="togglePerspective(\${p.id}, \${p.is_active})"></span>
            <button onclick="editPerspective(\${p.id})">編集</button>
            <button class="danger" onclick="deletePerspective(\${p.id})">削除</button>
          </div>
        </div>
      \`).join('');
    }

    // ナレッジ読み込み
    async function loadKnowledge() {
      const res = await fetch('/api/knowledge');
      const knowledge = await res.json();

      const list = document.getElementById('knowledge-list');
      list.innerHTML = knowledge.map(k => \`
        <div class="card">
          <h3>\${k.title}</h3>
          <p>カテゴリ: \${k.category}</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">
            更新: \${new Date(k.updated_at).toLocaleString('ja-JP')}
          </p>
          <div class="card-actions">
            <button onclick="editKnowledge(\${k.id})">編集</button>
            <button class="danger" onclick="deleteKnowledge(\${k.id})">削除</button>
          </div>
        </div>
      \`).join('');
    }

    // 分析履歴読み込み
    async function loadAnalyses() {
      const res = await fetch('/api/analyses?limit=20');
      const analyses = await res.json();

      const list = document.getElementById('analyses-list');
      list.innerHTML = analyses.map(a => \`
        <div class="card">
          <h3>\${a.videoTitle}</h3>
          <p>チャンネル: \${a.channelName}</p>
          <p style="font-size: 12px; color: #999;">
            分析日時: \${new Date(a.analyzedAt).toLocaleString('ja-JP')}
          </p>
          <div class="card-actions">
            <button onclick="window.open('/analysis/\${a.id}', '_blank')">結果を見る</button>
          </div>
        </div>
      \`).join('');
    }

    // ステータス表示
    function showStatus(message, type) {
      const status = document.getElementById('status-message');
      status.className = 'status ' + type;
      status.textContent = message;
      status.classList.remove('hidden');

      setTimeout(() => status.classList.add('hidden'), 5000);
    }

    // TODO: 編集・削除機能は後で実装
    function showAddPerspective() { alert('実装予定'); }
    function editPerspective(id) { alert('実装予定'); }
    function deletePerspective(id) { alert('実装予定'); }
    function togglePerspective(id, current) { alert('実装予定'); }
    function showAddKnowledge() { alert('実装予定'); }
    function editKnowledge(id) { alert('実装予定'); }
    function deleteKnowledge(id) { alert('実装予定'); }
  </script>
</body>
</html>`;
}

// 分析結果表示ページ生成
function generateAnalysisResultPage(result: any): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>分析結果: ${result.videoTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 20px;
      margin-bottom: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header h1 { color: #667eea; font-size: 28px; margin-bottom: 10px; }
    .video-info {
      display: flex;
      gap: 20px;
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    .thumbnail {
      width: 280px;
      height: 157px;
      border-radius: 10px;
      object-fit: cover;
    }
    .info-text h3 { color: #333; margin-bottom: 5px; }
    .info-text p { color: #666; font-size: 14px; margin: 5px 0; }
    .content {
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .section-title {
      color: #667eea;
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #eee;
    }
    .analysis-content {
      color: #333;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .analysis-content h3 {
      color: #667eea;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    .factors, .recommendations {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-top: 15px;
    }
    .back-btn {
      display: inline-block;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .back-btn:hover { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="javascript:history.back()" class="back-btn">← 戻る</a>
      <h1>🤖 サムネイル分析結果</h1>

      <div class="video-info">
        <img src="${result.thumbnailUrl}" alt="Thumbnail" class="thumbnail">
        <div class="info-text">
          <h3>${result.videoTitle}</h3>
          <p>📺 チャンネル: ${result.channelName}</p>
          <p>📅 分析日時: ${new Date(result.analyzedAt).toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="section-title">📊 詳細分析</div>
      <div class="analysis-content">${result.analysis.replace(/###/g, '<h3>').replace(/\n\n/g, '</p><p>').replace(/^(.)/g, '<p>$1').replace(/$/g, '</p>')}</div>
    </div>

    <div class="content">
      <div class="section-title">✨ 成功要因</div>
      <div class="factors">${result.successFactors.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="content">
      <div class="section-title">💡 推奨事項</div>
      <div class="recommendations">${result.recommendations.replace(/\n/g, '<br>')}</div>
    </div>
  </div>
</body>
</html>`;
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎛️  YouTube Viral Finder - 管理画面起動!         ║
║                                                       ║
║   📍 URL: http://localhost:${PORT}                      ║
║                                                       ║
║   管理機能:                                          ║
║   - LLM設定                                          ║
║   - 分析視点管理                                     ║
║   - ナレッジベース                                   ║
║   - 分析履歴                                         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
});
