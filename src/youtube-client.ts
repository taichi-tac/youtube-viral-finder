import { google, youtube_v3 } from 'googleapis';
import type {
  SearchOptions,
  ViralVideo,
  YouTubeSearchResponse,
  YouTubeVideoResponse,
  YouTubeChannelResponse,
} from './types.js';

/**
 * YouTube Data API v3 クライアント
 */
export class YouTubeClient {
  private youtube: youtube_v3.Youtube;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * バイラル動画を検索
   */
  async findViralVideos(options: SearchOptions): Promise<ViralVideo[]> {
    const {
      keyword,
      publishedAfter,
      publishedBefore,
      maxResults = 50,
      viralThreshold = 3,
      videoDuration = 'any',
    } = options;

    const viralVideos: ViralVideo[] = [];
    let pageToken: string | undefined;
    let processedCount = 0;

    console.log(`\n🔍 検索中: "${keyword}"`);
    if (publishedAfter || publishedBefore) {
      console.log(`📅 期間: ${publishedAfter || '開始'} 〜 ${publishedBefore || '現在'}`);
    }
    console.log(`🎯 条件: 登録者数の${viralThreshold}倍以上の再生数\n`);

    // 複数ページを取得
    while (processedCount < maxResults) {
      const searchParams: any = {
        part: ['snippet'],
        q: keyword,
        type: ['video'],
        maxResults: 50,
        order: 'viewCount',
        publishedAfter,
        publishedBefore,
        pageToken,
      };

      // videoDuration が 'any' でない場合のみ追加
      if (videoDuration !== 'any') {
        searchParams.videoDuration = videoDuration;
      }

      const searchResponse = await this.youtube.search.list(searchParams);

      const videos = searchResponse.data.items || [];
      if (videos.length === 0) break;

      // 各動画の詳細情報を取得
      for (const video of videos) {
        if (!video.id?.videoId) continue;

        try {
          const viralVideo = await this.getVideoDetails(
            video.id.videoId,
            viralThreshold
          );

          if (viralVideo) {
            viralVideos.push(viralVideo);
            console.log(`✅ 発見: ${viralVideo.title.substring(0, 50)}... (${viralVideo.viewsToSubscribersRatio.toFixed(1)}倍)`);
          }

          processedCount++;
          if (processedCount >= maxResults) break;
        } catch (error) {
          console.error(`❌ エラー: 動画ID ${video.id.videoId}`, error);
        }
      }

      pageToken = searchResponse.data.nextPageToken || undefined;
      if (!pageToken) break;

      // レート制限対策
      await this.sleep(100);
    }

    return viralVideos;
  }

  /**
   * 動画の詳細情報を取得し、バイラル条件をチェック
   */
  private async getVideoDetails(
    videoId: string,
    viralThreshold: number
  ): Promise<ViralVideo | null> {
    // 動画情報を取得
    const videoResponse = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId],
    });

    const video = videoResponse.data.items?.[0];
    if (!video || !video.snippet || !video.statistics) {
      return null;
    }

    const viewCount = parseInt(video.statistics.viewCount || '0');
    const likeCount = parseInt(video.statistics.likeCount || '0');
    const commentCount = parseInt(video.statistics.commentCount || '0');

    // チャンネル情報を取得
    const channelResponse = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [video.snippet.channelId!],
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel || !channel.statistics) {
      return null;
    }

    const subscriberCount = parseInt(channel.statistics.subscriberCount || '0');
    const totalVideoCount = parseInt(channel.statistics.videoCount || '0');

    // バイラル判定
    const viewsToSubscribersRatio = subscriberCount > 0
      ? viewCount / subscriberCount
      : 0;

    if (viewsToSubscribersRatio < viralThreshold) {
      return null;
    }

    // 各種レート計算
    const likeRate = viewCount > 0 ? likeCount / viewCount : 0;
    const commentRate = viewCount > 0 ? commentCount / viewCount : 0;
    const engagementRate = viewCount > 0
      ? (likeCount + commentCount) / viewCount
      : 0;

    return {
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      title: video.snippet.title || '',
      thumbnailUrl: video.snippet.thumbnails?.high?.url || '',
      publishedAt: video.snippet.publishedAt || '',
      duration: this.parseDuration(video.contentDetails?.duration || ''),
      viewCount,
      likeCount,
      commentCount,

      channelName: channel.snippet?.title || '',
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      channelId: channel.id || '',
      subscriberCount,
      channelCreatedAt: channel.snippet?.publishedAt || '',
      totalVideoCount,

      viewsToSubscribersRatio,
      likeRate,
      commentRate,
      engagementRate,
    };
  }

  /**
   * ISO 8601 duration を人間が読める形式に変換
   * 例: PT1H30M45S -> 1:30:45
   */
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * スリープ（レート制限対策）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
