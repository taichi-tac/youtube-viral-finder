import axios from 'axios';
import { readFileSync } from 'fs';
import sharp from 'sharp';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AnalysisRequest {
  imageUrl: string;
  prompt: string;
  videoInfo: {
    title: string;
    channel: string;
    views: number;
    subscribers: number;
    ratio: number;
  };
}

/**
 * Ollama LLMクライアント
 */
export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  /**
   * サムネイル画像を分析
   */
  async analyzeThumbnail(request: AnalysisRequest): Promise<string> {
    try {
      // 画像をダウンロードしてBase64に変換
      const imageBase64 = await this.downloadAndEncodeImage(request.imageUrl);

      // プロンプトに動画情報を埋め込む
      const finalPrompt = this.fillPromptTemplate(request.prompt, request.videoInfo);

      // Ollama APIにリクエスト
      const response = await axios.post(
        `${this.config.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: finalPrompt,
          images: [imageBase64],
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000,
          },
        },
        {
          timeout: 180000, // 180秒タイムアウト（3分）
        }
      );

      return response.data.response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(
            'Ollamaサーバーに接続できません。Ollamaが起動しているか確認してください。\n' +
            `接続先: ${this.config.baseUrl}`
          );
        }
        throw new Error(`Ollama APIエラー: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 画像をダウンロードしてBase64にエンコード
   */
  private async downloadAndEncodeImage(url: string): Promise<string> {
    try {
      // 画像をダウンロード
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      // SharpでJPEGに変換してリサイズ（LLMの処理を軽くするため）
      const buffer = await sharp(Buffer.from(response.data))
        .resize(800, 450, { fit: 'inside' }) // 最大800x450にリサイズ
        .jpeg({ quality: 85 })
        .toBuffer();

      // Base64エンコード
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(`画像のダウンロードに失敗しました: ${url}`);
    }
  }

  /**
   * プロンプトテンプレートに動画情報を埋め込む
   */
  private fillPromptTemplate(
    template: string,
    videoInfo: {
      title: string;
      channel: string;
      views: number;
      subscribers: number;
      ratio: number;
    }
  ): string {
    return template
      .replace(/{title}/g, videoInfo.title)
      .replace(/{channel}/g, videoInfo.channel)
      .replace(/{views}/g, videoInfo.views.toLocaleString('ja-JP'))
      .replace(/{subscribers}/g, videoInfo.subscribers.toLocaleString('ja-JP'))
      .replace(/{ratio}/g, videoInfo.ratio.toFixed(1));
  }

  /**
   * Ollamaサーバーの接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * 利用可能なモデルリストを取得
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`);
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      throw new Error('モデルリストの取得に失敗しました');
    }
  }
}
