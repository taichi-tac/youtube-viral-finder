/**
 * バイラル動画の情報
 */
export interface ViralVideo {
  // 動画情報
  videoUrl: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // チャンネル情報
  channelName: string;
  channelUrl: string;
  channelId: string;
  subscriberCount: number;
  channelCreatedAt: string;
  totalVideoCount: number;

  // 追加フィールド
  description: string; // 概要欄
  hashtags: string[]; // ハッシュタグ

  // 分析指標
  viewsToSubscribersRatio: number; // 拡散率: 登録者数の何倍の再生数か
  viewsPerDay: number; // 急上昇率: 1日あたり再生数 (再生数 / 公開日からの日数)
  likeRate: number; // 高評価率 (高評価数 / 再生数)
  commentRate: number; // コメント率 (コメント数 / 再生数)
  engagementRate: number; // エンゲージメント率 ((高評価+コメント) / 再生数)
  channelTotalViewCount: number; // チャンネル総視聴回数
  subscriberRate: number; // 登録率: 登録者数 / チャンネル総視聴回数
}

/**
 * 検索条件
 */
export interface SearchOptions {
  keyword: string;
  publishedAfter?: string; // ISO 8601 形式
  publishedBefore?: string; // ISO 8601 形式
  maxResults?: number;
  viralThreshold?: number; // デフォルト3倍
  videoDuration?: 'any' | 'short' | 'medium' | 'long'; // any:全て, short:4分未満, medium:4-20分, long:20分以上
}

/**
 * YouTube API レスポンス型
 */
export interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
    };
  }>;
  nextPageToken?: string;
}

export interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    statistics: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

export interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      publishedAt: string;
    };
    statistics: {
      subscriberCount: string;
      videoCount: string;
    };
  }>;
}
