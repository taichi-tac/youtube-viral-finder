import Table from 'cli-table3';
import chalk from 'chalk';
import type { ViralVideo } from './types.js';

/**
 * 結果をコンソールに表示
 */
export class ResultFormatter {
  /**
   * テーブル形式で表示
   */
  static displayTable(videos: ViralVideo[]): void {
    if (videos.length === 0) {
      console.log(chalk.yellow('\n⚠️  条件に一致する動画が見つかりませんでした。\n'));
      return;
    }

    console.log(chalk.green(`\n✨ ${videos.length}件のバイラル動画を発見！\n`));

    const table = new Table({
      head: [
        chalk.cyan('タイトル'),
        chalk.cyan('チャンネル'),
        chalk.cyan('再生数'),
        chalk.cyan('登録者数'),
        chalk.cyan('倍率'),
        chalk.cyan('高評価率'),
        chalk.cyan('コメント率'),
        chalk.cyan('公開日'),
      ],
      colWidths: [40, 20, 12, 12, 8, 10, 10, 12],
      wordWrap: true,
    });

    for (const video of videos) {
      table.push([
        this.truncate(video.title, 38),
        this.truncate(video.channelName, 18),
        this.formatNumber(video.viewCount),
        this.formatNumber(video.subscriberCount),
        chalk.yellow(`${video.viewsToSubscribersRatio.toFixed(1)}x`),
        this.formatPercentage(video.likeRate),
        this.formatPercentage(video.commentRate),
        this.formatDate(video.publishedAt),
      ]);
    }

    console.log(table.toString());
    console.log('');
  }

  /**
   * 詳細情報を表示
   */
  static displayDetailed(videos: ViralVideo[]): void {
    if (videos.length === 0) {
      console.log(chalk.yellow('\n⚠️  条件に一致する動画が見つかりませんでした。\n'));
      return;
    }

    console.log(chalk.green(`\n✨ ${videos.length}件のバイラル動画を発見！\n`));

    for (const [index, video] of videos.entries()) {
      console.log(chalk.bold.cyan(`\n━━━ ${index + 1}. ${video.title} ━━━\n`));

      console.log(chalk.bold('📺 動画情報:'));
      console.log(`  URL:          ${chalk.blue(video.videoUrl)}`);
      console.log(`  サムネイル:    ${video.thumbnailUrl}`);
      console.log(`  再生数:        ${chalk.yellow(this.formatNumber(video.viewCount))}`);
      console.log(`  高評価数:      ${this.formatNumber(video.likeCount)}`);
      console.log(`  高評価率:      ${this.formatPercentage(video.likeRate)}`);
      console.log(`  コメント数:    ${this.formatNumber(video.commentCount)}`);
      console.log(`  コメント率:    ${this.formatPercentage(video.commentRate)}`);
      console.log(`  公開日:        ${this.formatDate(video.publishedAt)}`);
      console.log(`  長さ:          ${video.duration}`);

      console.log(chalk.bold('\n👤 チャンネル情報:'));
      console.log(`  名前:          ${video.channelName}`);
      console.log(`  URL:           ${chalk.blue(video.channelUrl)}`);
      console.log(`  登録者数:      ${chalk.green(this.formatNumber(video.subscriberCount))}`);
      console.log(`  総動画数:      ${this.formatNumber(video.totalVideoCount)}`);
      console.log(`  開設日:        ${this.formatDate(video.channelCreatedAt)}`);

      console.log(chalk.bold('\n📊 分析指標:'));
      console.log(`  登録者倍率:    ${chalk.red.bold(video.viewsToSubscribersRatio.toFixed(2) + 'x')} (登録者数の${video.viewsToSubscribersRatio.toFixed(1)}倍の再生数)`);
      console.log(`  エンゲージ率:  ${this.formatPercentage(video.engagementRate)}`);
    }

    console.log('\n');
  }

  /**
   * CSV形式で出力
   */
  static toCSV(videos: ViralVideo[]): string {
    const headers = [
      'タイトル',
      '動画URL',
      'サムネイルURL',
      'チャンネル名',
      'チャンネルURL',
      '再生数',
      '登録者数',
      '登録者倍率',
      '総動画数',
      '公開日',
      'チャンネル開設日',
      '動画の長さ',
      '高評価数',
      '高評価率',
      'コメント数',
      'コメント率',
      'エンゲージメント率',
    ];

    const rows = videos.map(v => [
      this.escapeCSV(v.title),
      v.videoUrl,
      v.thumbnailUrl,
      this.escapeCSV(v.channelName),
      v.channelUrl,
      v.viewCount,
      v.subscriberCount,
      v.viewsToSubscribersRatio.toFixed(2),
      v.totalVideoCount,
      v.publishedAt,
      v.channelCreatedAt,
      v.duration,
      v.likeCount,
      (v.likeRate * 100).toFixed(2),
      v.commentCount,
      (v.commentRate * 100).toFixed(4),
      (v.engagementRate * 100).toFixed(4),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * JSON形式で出力
   */
  static toJSON(videos: ViralVideo[]): string {
    return JSON.stringify(videos, null, 2);
  }

  /**
   * HTML形式で出力
   */
  static toHTML(videos: ViralVideo[], searchKeyword: string = ''): string {
    const now = new Date().toLocaleString('ja-JP');
    const avgRatio = videos.length > 0
      ? videos.reduce((sum, v) => sum + v.viewsToSubscribersRatio, 0) / videos.length
      : 0;
    const maxRatio = videos.length > 0
      ? Math.max(...videos.map(v => v.viewsToSubscribersRatio))
      : 0;

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>バイラル動画検索結果 - YouTube Viral Finder</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .header h1 {
      color: #667eea;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
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
    .stat-card .label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: bold;
    }
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
      padding-top: 56.25%; /* 16:9 */
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
    .video-content {
      padding: 20px;
    }
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
    .metric .label {
      font-size: 11px;
      color: #666;
      margin-bottom: 3px;
    }
    .metric .value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    .ratio-highlight {
      color: #ff4444;
    }
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
    .btn:hover {
      opacity: 0.8;
    }
    .btn-video {
      background: #ff0000;
      color: white;
    }
    .btn-channel {
      background: #667eea;
      color: white;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .info-item {
      font-size: 11px;
      color: #666;
    }
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
      <h1>🔥 バイラル動画検索結果</h1>
      <div class="subtitle">
        ${searchKeyword ? `検索キーワード: "${searchKeyword}" | ` : ''}${now} に生成
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
            <img src="${video.thumbnailUrl}" alt="${this.escapeHTML(video.title)}">
            <div class="viral-badge">${video.viewsToSubscribersRatio.toFixed(1)}x バイラル</div>
          </div>
          <div class="video-content">
            <div class="video-title">${this.escapeHTML(video.title)}</div>
            <div class="channel-name">📺 ${this.escapeHTML(video.channelName)}</div>

            <div class="metrics">
              <div class="metric">
                <div class="label">再生数</div>
                <div class="value">${this.formatNumber(video.viewCount)}</div>
              </div>
              <div class="metric">
                <div class="label">登録者数</div>
                <div class="value">${this.formatNumber(video.subscriberCount)}</div>
              </div>
              <div class="metric">
                <div class="label">高評価率</div>
                <div class="value">${this.formatPercentage(video.likeRate)}</div>
              </div>
              <div class="metric">
                <div class="label">コメント率</div>
                <div class="value">${this.formatPercentage(video.commentRate)}</div>
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
                <span class="value">${this.formatNumber(video.totalVideoCount)}</span>
                総動画数
              </div>
              <div class="info-item">
                <span class="value">${this.formatDate(video.publishedAt)}</span>
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

  // ユーティリティメソッド

  private static formatNumber(num: number): string {
    return num.toLocaleString('ja-JP');
  }

  private static formatPercentage(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
  }

  private static formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP');
  }

  private static truncate(str: string, maxLength: number): string {
    return str.length > maxLength ? str.substring(0, maxLength - 2) + '..' : str;
  }

  private static escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
