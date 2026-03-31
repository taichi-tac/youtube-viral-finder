import { db } from '../database/db.js';
import { OllamaClient, type AnalysisRequest } from '../llm/ollama-client.js';
import type { ViralVideo } from '../types.js';

export interface AnalysisResult {
  id: number;
  videoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  analysis: string;
  successFactors: string;
  recommendations: string;
  analyzedAt: string;
}

/**
 * サムネイル分析サービス
 */
export class AnalysisService {
  private ollamaClient: OllamaClient;

  constructor() {
    // LLM設定を取得
    const config = db.prepare('SELECT * FROM llm_config ORDER BY id DESC LIMIT 1').get() as any;

    this.ollamaClient = new OllamaClient({
      baseUrl: config.ollama_url,
      model: config.model_name,
      temperature: config.temperature,
      maxTokens: config.max_tokens,
    });
  }

  /**
   * 動画のサムネイルを分析
   */
  async analyzeVideo(video: ViralVideo): Promise<AnalysisResult> {
    // アクティブな分析視点を取得
    const perspectives = db.prepare(
      'SELECT * FROM analysis_perspectives WHERE is_active = 1 ORDER BY id'
    ).all() as any[];

    if (perspectives.length === 0) {
      throw new Error('分析視点が設定されていません');
    }

    // 各視点で分析を実行
    const analyses: string[] = [];

    for (const perspective of perspectives) {
      console.log(`📊 ${perspective.name}で分析中...`);

      const request: AnalysisRequest = {
        imageUrl: video.thumbnailUrl,
        prompt: perspective.prompt_template,
        videoInfo: {
          title: video.title,
          channel: video.channelName,
          views: video.viewCount,
          subscribers: video.subscriberCount,
          ratio: video.viewsToSubscribersRatio,
        },
      };

      try {
        const result = await this.ollamaClient.analyzeThumbnail(request);
        analyses.push(`### ${perspective.name}\n\n${result}`);
      } catch (error) {
        console.error(`❌ ${perspective.name}の分析に失敗:`, error);
        analyses.push(`### ${perspective.name}\n\n分析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    }

    // 全ての分析結果を統合
    const fullAnalysis = analyses.join('\n\n---\n\n');

    // 成功要因と推奨事項を抽出（簡易版）
    const successFactors = this.extractSuccessFactors(fullAnalysis);
    const recommendations = this.generateRecommendations(fullAnalysis);

    // データベースに保存
    const stmt = db.prepare(`
      INSERT INTO analysis_results
      (video_id, video_title, channel_name, thumbnail_url, analysis, success_factors, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      video.videoId,
      video.title,
      video.channelName,
      video.thumbnailUrl,
      fullAnalysis,
      successFactors,
      recommendations
    );

    return {
      id: info.lastInsertRowid as number,
      videoId: video.videoId,
      videoTitle: video.title,
      channelName: video.channelName,
      thumbnailUrl: video.thumbnailUrl,
      analysis: fullAnalysis,
      successFactors,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * 分析結果を取得
   */
  getAnalysisResult(id: number): AnalysisResult | null {
    const result = db.prepare('SELECT * FROM analysis_results WHERE id = ?').get(id) as any;

    if (!result) return null;

    return {
      id: result.id,
      videoId: result.video_id,
      videoTitle: result.video_title,
      channelName: result.channel_name,
      thumbnailUrl: result.thumbnail_url,
      analysis: result.analysis,
      successFactors: result.success_factors,
      recommendations: result.recommendations,
      analyzedAt: result.analyzed_at,
    };
  }

  /**
   * 動画IDで分析結果を取得
   */
  getAnalysisByVideoId(videoId: string): AnalysisResult | null {
    const result = db.prepare(
      'SELECT * FROM analysis_results WHERE video_id = ? ORDER BY analyzed_at DESC LIMIT 1'
    ).get(videoId) as any;

    if (!result) return null;

    return {
      id: result.id,
      videoId: result.video_id,
      videoTitle: result.video_title,
      channelName: result.channel_name,
      thumbnailUrl: result.thumbnail_url,
      analysis: result.analysis,
      successFactors: result.success_factors,
      recommendations: result.recommendations,
      analyzedAt: result.analyzed_at,
    };
  }

  /**
   * 全分析結果を取得
   */
  getAllAnalyses(limit: number = 50): AnalysisResult[] {
    const results = db.prepare(
      'SELECT * FROM analysis_results ORDER BY analyzed_at DESC LIMIT ?'
    ).all(limit) as any[];

    return results.map(r => ({
      id: r.id,
      videoId: r.video_id,
      videoTitle: r.video_title,
      channelName: r.channel_name,
      thumbnailUrl: r.thumbnail_url,
      analysis: r.analysis,
      successFactors: r.success_factors,
      recommendations: r.recommendations,
      analyzedAt: r.analyzed_at,
    }));
  }

  /**
   * 成功要因を抽出（簡易版）
   */
  private extractSuccessFactors(analysis: string): string {
    // キーワードベースで成功要因を抽出
    const factors: string[] = [];

    if (analysis.includes('色') || analysis.includes('カラー')) {
      factors.push('• 効果的な色使い');
    }
    if (analysis.includes('文字') || analysis.includes('テキスト')) {
      factors.push('• 読みやすい文字配置');
    }
    if (analysis.includes('表情') || analysis.includes('人物')) {
      factors.push('• 感情を引き出す表情');
    }
    if (analysis.includes('好奇心') || analysis.includes('興味')) {
      factors.push('• 好奇心を刺激する要素');
    }
    if (analysis.includes('インパクト') || analysis.includes('目を引く')) {
      factors.push('• 視覚的インパクト');
    }
    if (analysis.includes('トレンド') || analysis.includes('流行')) {
      factors.push('• トレンドを捉えた内容');
    }

    return factors.length > 0 ? factors.join('\n') : '• 総合的なバランスの良さ';
  }

  /**
   * 推奨事項を生成（簡易版）
   */
  private generateRecommendations(analysis: string): string {
    return `• 成功パターンを他の動画にも応用\n• 視聴者の反応を継続的に分析\n• A/Bテストでさらに最適化`;
  }

  /**
   * Ollama接続テスト
   */
  async testOllamaConnection(): Promise<boolean> {
    return await this.ollamaClient.testConnection();
  }

  /**
   * 利用可能なモデルを取得
   */
  async getAvailableModels(): Promise<string[]> {
    return await this.ollamaClient.listModels();
  }
}
