import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { YouTubeClient } from './youtube-client.js';
import type { SearchOptions } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// トップページ - 検索フォーム
app.get('/', (req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Viral Finder - バイラル動画検索</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      width: 100%;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      font-size: 32px;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 600;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 10px;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .hint {
      font-size: 12px;
      color: #999;
      margin-top: 5px;
    }
    .loading {
      display: none;
      text-align: center;
      margin-top: 20px;
    }
    .loading.active {
      display: block;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error {
      background: #fee;
      color: #c00;
      padding: 15px;
      border-radius: 10px;
      margin-top: 20px;
      display: none;
    }
    .error.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🔥 YouTube Viral Finder</h1>
      <p class="subtitle">チャンネル登録者数の3倍以上の再生数を持つバイラル動画を検索</p>
      <form id="searchForm">
        <div class="form-group">
          <label for="keyword">検索キーワード *</label>
          <input type="text" id="keyword" name="keyword" required placeholder="例: 料理、旅行、プログラミング">
        </div>

        <div class="row">
          <div class="form-group">
            <label for="after">公開日（開始）</label>
            <input type="date" id="after" name="after">
            <div class="hint">省略可</div>
          </div>

          <div class="form-group">
            <label for="before">公開日（終了）</label>
            <input type="date" id="before" name="before">
            <div class="hint">省略可</div>
          </div>
        </div>

        <div class="form-group">
          <label for="videoDuration">動画の長さ</label>
          <select id="videoDuration" name="videoDuration">
            <option value="any">すべて</option>
            <option value="medium" selected>中程度（4分〜20分）※ショート除外</option>
            <option value="long">長い動画（20分以上）</option>
            <option value="short">ショート動画（4分未満）</option>
          </select>
          <div class="hint">推奨: 中程度（ショート動画を除外）</div>
        </div>

        <div class="row">
          <div class="form-group">
            <label for="threshold">登録者倍率</label>
            <input type="number" id="threshold" name="threshold" value="3" min="1" step="0.1">
            <div class="hint">デフォルト: 3倍</div>
          </div>

          <div class="form-group">
            <label for="maxResults">最大検索数</label>
            <input type="number" id="maxResults" name="maxResults" value="50" min="1" max="200">
            <div class="hint">最大: 200</div>
          </div>
        </div>

        <button type="submit" id="searchBtn">🔍 バイラル動画を検索</button>
      </form>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p>検索中... しばらくお待ちください</p>
      </div>

      <div class="error" id="error"></div>
    </div>
  </div>

  <script>
    const form = document.getElementById('searchForm');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const searchBtn = document.getElementById('searchBtn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const params = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (value) params.append(key, value.toString());
      }

      loading.classList.add('active');
      errorDiv.classList.remove('active');
      searchBtn.disabled = true;

      window.location.href = '/api/search?' + params.toString();
    });
  </script>
</body>
</html>`);
});

// 検索API
app.get('/api/search', async (req: Request, res: Response) => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY が設定されていません' });
  }

  try {
    const {
      keyword,
      after,
      before,
      threshold = '3',
      maxResults = '50',
      videoDuration = 'any'
    } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'キーワードを指定してください' });
    }

    const searchOptions: SearchOptions = {
      keyword,
      publishedAfter: after && typeof after === 'string' ? new Date(after).toISOString() : undefined,
      publishedBefore: before && typeof before === 'string' ? new Date(before).toISOString() : undefined,
      maxResults: parseInt(maxResults as string),
      viralThreshold: parseFloat(threshold as string),
      videoDuration: videoDuration as 'any' | 'short' | 'medium' | 'long',
    };

    const client = new YouTubeClient(apiKey);
    const videos = await client.findViralVideos(searchOptions);

    // HTML生成
    const now = new Date().toLocaleString('ja-JP');
    const avgRatio = videos.length > 0
      ? videos.reduce((sum, v) => sum + v.viewsToSubscribersRatio, 0) / videos.length
      : 0;
    const maxRatio = videos.length > 0
      ? Math.max(...videos.map(v => v.viewsToSubscribersRatio))
      : 0;

    const html = generateResultHTML(videos, keyword, avgRatio, maxRatio, now);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('検索エラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '検索中にエラーが発生しました'
    });
  }
});

// 結果HTMLを生成
function generateResultHTML(
  videos: any[],
  keyword: string,
  avgRatio: number,
  maxRatio: number,
  timestamp: string
): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>検索結果: ${escapeHTML(keyword)} - YouTube Viral Finder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .header h1 { color: #667eea; font-size: 32px; margin-bottom: 10px; }
    .header .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
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
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 15px;
      text-align: center;
    }
    .stat-card .label { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
    .stat-card .value { font-size: 24px; font-weight: bold; }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 25px;
    }
    .video-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .video-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .thumbnail-container {
      position: relative;
      width: 100%;
      padding-top: 56.25%;
      overflow: hidden;
      background: #000;
    }
    .thumbnail-container img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .viral-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #ff4444;
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(255,68,68,0.5);
    }
    .video-content { padding: 20px; }
    .video-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
      min-height: 44px;
    }
    .channel-name {
      color: #666;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .metric {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 8px;
    }
    .metric .label { font-size: 11px; color: #666; margin-bottom: 3px; }
    .metric .value { font-size: 16px; font-weight: bold; color: #333; }
    .buttons {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.8; }
    .btn-video { background: #ff0000; color: white; }
    .btn-channel { background: #667eea; color: white; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .info-item { font-size: 11px; color: #666; }
    .info-item .value {
      color: #333;
      font-weight: bold;
      display: block;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="/" class="back-btn">← 新しい検索</a>
      <h1>🔥 バイラル動画検索結果</h1>
      <div class="subtitle">
        検索キーワード: "${escapeHTML(keyword)}" | ${timestamp} に生成
      </div>
      ${videos.length > 0 ? `
      <div class="stats">
        <div class="stat-card">
          <div class="label">発見した動画数</div>
          <div class="value">${videos.length}件</div>
        </div>
        <div class="stat-card">
          <div class="label">平均倍率</div>
          <div class="value">${avgRatio.toFixed(1)}x</div>
        </div>
        <div class="stat-card">
          <div class="label">最大倍率</div>
          <div class="value">${maxRatio.toFixed(1)}x</div>
        </div>
      </div>
      ` : '<p style="margin-top: 20px; color: #999;">条件に一致する動画が見つかりませんでした。</p>'}
    </div>

    <div class="video-grid">
      ${videos.map(video => `
        <div class="video-card">
          <div class="thumbnail-container">
            <img src="${video.thumbnailUrl}" alt="${escapeHTML(video.title)}">
            <div class="viral-badge">${video.viewsToSubscribersRatio.toFixed(1)}x バイラル</div>
          </div>
          <div class="video-content">
            <div class="video-title">${escapeHTML(video.title)}</div>
            <div class="channel-name">📺 ${escapeHTML(video.channelName)}</div>

            <div class="metrics">
              <div class="metric">
                <div class="label">再生数</div>
                <div class="value">${formatNumber(video.viewCount)}</div>
              </div>
              <div class="metric">
                <div class="label">登録者数</div>
                <div class="value">${formatNumber(video.subscriberCount)}</div>
              </div>
              <div class="metric">
                <div class="label">高評価率</div>
                <div class="value">${formatPercentage(video.likeRate)}</div>
              </div>
              <div class="metric">
                <div class="label">コメント率</div>
                <div class="value">${formatPercentage(video.commentRate)}</div>
              </div>
            </div>

            <div class="buttons">
              <a href="${video.videoUrl}" target="_blank" class="btn btn-video">動画を見る</a>
              <a href="${video.channelUrl}" target="_blank" class="btn btn-channel">チャンネル</a>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="value">${video.duration}</span>
                長さ
              </div>
              <div class="info-item">
                <span class="value">${formatNumber(video.totalVideoCount)}</span>
                総動画数
              </div>
              <div class="info-item">
                <span class="value">${formatDate(video.publishedAt)}</span>
                公開日
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP');
}

// サーバー起動
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🔥 YouTube Viral Finder - Web Server 起動中!      ║
║                                                       ║
║   📍 URL: http://localhost:${PORT}                      ║
║                                                       ║
║   ブラウザで上記URLを開いてください                  ║
║                                                       ║
║   終了するには Ctrl+C を押してください               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
});
