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

    console.log(`\n🔍 検索中: "${keyword}"`);
    if (publishedAfter || publishedBefore) {
      console.log(`📅 期間: ${publishedAfter || '開始'} 〜 ${publishedBefore || '現在'}`);
    }
    console.log(`🎯 条件: 登録者数の${viralThreshold}倍以上の再生数`);
    console.log(`📊 最大: ${maxResults}件\n`);

    const searchParams: any = {
      part: ['snippet'],
      q: keyword,
      type: ['video'],
      maxResults: Math.min(maxResults, 50),
      order: 'relevance',
      regionCode: 'JP',
      relevanceLanguage: 'ja',
      publishedAfter,
      publishedBefore,
    };

    if (videoDuration !== 'any') {
      searchParams.videoDuration = videoDuration;
    }

    let searchResponse;
    try {
      searchResponse = await this.youtube.search.list(searchParams);
    } catch (error: any) {
      console.error(`⚠️ API呼び出しエラー:`, error?.message);
      throw error;
    }

    const videos = searchResponse.data.items || [];
    const videoIds = videos
      .map((v: any) => v.id?.videoId)
      .filter((id: any): id is string => !!id);

    if (videoIds.length > 0) {
      try {
        const batchResults = await this.getVideoDetailsBatch(videoIds, viralThreshold);
        for (const viralVideo of batchResults) {
          viralVideos.push(viralVideo);
          console.log(`✅ [${viralVideos.length}] ${viralVideo.title.substring(0, 50)}... (拡散率: ${viralVideo.viewsToSubscribersRatio.toFixed(1)}倍)`);
        }
      } catch (error: any) {
        console.error(`⚠️ 詳細取得エラー:`, error?.message);
        throw error;
      }
    }

    console.log(`\n✨ 合計 ${viralVideos.length}件のバイラル動画を発見 (${videoIds.length}件調査)`);

    // 急上昇率（1日あたり再生数）の高い順にソート
    viralVideos.sort((a, b) => b.viewsPerDay - a.viewsPerDay);

    return viralVideos;
  }

  /**
   * 動画の詳細情報をバッチ取得し、バイラル条件をチェック
   */
  private async getVideoDetailsBatch(
    videoIds: string[],
    viralThreshold: number
  ): Promise<ViralVideo[]> {
    // 動画情報を一括取得（最大50件）
    const videoResponse = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails', 'localizations'],
      id: videoIds,
    });

    const videoItems = videoResponse.data.items || [];
    if (videoItems.length === 0) return [];

    // チャンネルIDを一括収集（重複排除）
    const channelIds = [...new Set(
      videoItems
        .map(v => v.snippet?.channelId)
        .filter((id): id is string => !!id)
    )];

    // チャンネル情報を一括取得（最大50件）
    const channelResponse = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: channelIds,
    });

    const channelMap = new Map(
      (channelResponse.data.items || []).map(ch => [ch.id, ch])
    );

    // バイラル判定
    const results: ViralVideo[] = [];
    for (const video of videoItems) {
      if (!video.snippet || !video.statistics || !video.id) continue;

      // ゲームカテゴリ（20）を除外
      if (video.snippet.categoryId === '20') continue;

      const channel = channelMap.get(video.snippet.channelId!);
      if (!channel || !channel.statistics) continue;

      // 日本語動画のみ（defaultAudioLanguage または defaultLanguage が ja のもの）
      const audioLang = video.snippet.defaultAudioLanguage || '';
      const defLang = video.snippet.defaultLanguage || '';
      const isJapanese = audioLang.startsWith('ja') || defLang.startsWith('ja');
      // 言語情報がない場合はチャンネル名・タイトルで簡易判定（日本語文字が含まれるか）
      const hasJapaneseChars = /[\u3000-\u9fff\uff00-\uffef]/.test(
        (video.snippet.title || '') + (channel.snippet?.title || '')
      );
      if (!isJapanese && !hasJapaneseChars) continue;

      const viewCount = parseInt(video.statistics.viewCount || '0');
      const likeCount = parseInt(video.statistics.likeCount || '0');
      const commentCount = parseInt(video.statistics.commentCount || '0');
      const subscriberCount = parseInt(channel.statistics.subscriberCount || '0');
      const totalVideoCount = parseInt(channel.statistics.videoCount || '0');
      const channelTotalViewCount = parseInt(channel.statistics.viewCount || '0');

      const viewsToSubscribersRatio = subscriberCount > 0
        ? viewCount / subscriberCount
        : 0;


      const likeRate = viewCount > 0 ? likeCount / viewCount : 0;
      const commentRate = viewCount > 0 ? commentCount / viewCount : 0;
      const engagementRate = viewCount > 0
        ? (likeCount + commentCount) / viewCount
        : 0;

      // 急上昇率: 1日あたり再生数
      const publishedAt = video.snippet.publishedAt || '';
      const daysSincePublished = publishedAt
        ? Math.max(1, Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
      const viewsPerDay = viewCount / daysSincePublished;

      // 登録率: 登録者数 / チャンネル総視聴回数
      const subscriberRate = channelTotalViewCount > 0
        ? subscriberCount / channelTotalViewCount
        : 0;

      // 概要欄とハッシュタグ
      const description = video.snippet.description || '';
      const hashtagMatches = description.match(/#[\w\u3000-\u9fff\uff00-\uffef]+/g) || [];
      const tagsFromSnippet = (video.snippet.tags || []).filter((t: string) => t.startsWith('#'));
      const hashtags = [...new Set([...hashtagMatches, ...tagsFromSnippet])];

      results.push({
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        videoId: video.id as string,
        title: video.snippet.title || '',
        thumbnailUrl: video.snippet.thumbnails?.high?.url || '',
        publishedAt,
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
        description,
        hashtags,
        viewsToSubscribersRatio,
        viewsPerDay,
        likeRate,
        commentRate,
        engagementRate,
        channelTotalViewCount,
        subscriberRate,
      });
    }

    return results;
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
