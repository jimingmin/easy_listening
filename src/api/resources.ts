import { NativeModules, Platform } from 'react-native';
import type { ArticleDetail, ArticleMeta, ArticleSummaryBlock, ResourceCollection, Sentence, TopicSummary } from '../models/article';

interface ApiArticleListItem {
  id: string;
  user_id?: string | null;
  title: string;
  topic: string;
  level: string;
  word_count: number;
  sentence_count: number;
  paragraph_count?: number | null;
  duration_ms?: number | null;
  audio_url?: string | null;
  image_url?: string | null;
  summary_text?: string | null;
  tags?: string[];
  processing_status?: string | null;
  visibility?: string | null;
  series?: string | null;
  static_version?: number;
  static_updated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiSentenceItem {
  article_id: string;
  sentence_seq: number;
  paragraph?: number | null;
  text: string;
  start_ms?: number | null;
  end_ms?: number | null;
  translation?: string | null;
}

interface ApiArticleListResponse {
  total: number;
  limit: number;
  offset: number;
  sort: 'newest' | 'difficulty' | 'duration';
  items: ApiArticleListItem[];
}

interface ApiArticleDetailResponse extends ApiArticleListItem {
  body_text?: string | null;
  key_words?: unknown[];
  key_phrases?: unknown[];
  sentences: ApiSentenceItem[];
}

interface ApiCollectionSummary {
  name: string;
  article_count: number;
  cover_image_url?: string | null;
  latest_article_id?: string | null;
  latest_title?: string | null;
  last_updated?: string | null;
}

interface ApiCollectionListResponse {
  total: number;
  limit: number;
  offset: number;
  items: ApiCollectionSummary[];
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getConfiguredBaseUrl(): string | undefined {
  const processLike = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return processLike.process?.env?.EXPO_PUBLIC_API_BASE_URL;
}

function isHostLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function replaceUrlHostname(value: string, hostname: string): string | null {
  try {
    const parsed = new URL(value);
    parsed.hostname = hostname;
    return normalizeBaseUrl(parsed.toString());
  } catch {
    return null;
  }
}

function getConfiguredBaseUrls(): string[] {
  const configured = getConfiguredBaseUrl()?.trim();
  if (!configured) return [];

  const normalized = normalizeBaseUrl(configured);

  try {
    const parsed = new URL(normalized);
    if (!isHostLoopback(parsed.hostname)) {
      return [normalized];
    }

    if (Platform.OS === 'android') {
      return uniqueUrls([replaceUrlHostname(normalized, '10.0.2.2'), normalized]);
    }

    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      return uniqueUrls([replaceUrlHostname(normalized, '127.0.0.1'), normalized]);
    }
  } catch {
    return [normalized];
  }

  return [normalized];
}

function getMetroHost(): string | null {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptUrl) return null;

  try {
    const parsed = new URL(scriptUrl);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function getWebHost(): string | null {
  const webGlobal = globalThis as {
    location?: {
      hostname?: string;
    };
  };

  return webGlobal.location?.hostname ?? null;
}

export function getApiBaseUrls(): string[] {
  const configured = getConfiguredBaseUrls();
  if (configured.length > 0) {
    return configured;
  }

  const metroHost = getMetroHost();

  if (Platform.OS === 'ios') {
    return uniqueUrls([
      'http://127.0.0.1:8000',
      'http://localhost:8000',
      metroHost ? `http://${metroHost}:8000` : null
    ]);
  }

  if (Platform.OS === 'android') {
    return uniqueUrls([
      'http://10.0.2.2:8000',
      metroHost ? `http://${metroHost}:8000` : null
    ]);
  }

  if (Platform.OS === 'web') {
    const webHost = getWebHost();
    return uniqueUrls([
      webHost ? `http://${webHost}:8000` : null,
      metroHost ? `http://${metroHost}:8000` : null,
      'http://127.0.0.1:8000'
    ]);
  }

  return uniqueUrls([metroHost ? `http://${metroHost}:8000` : null, 'http://127.0.0.1:8000']);
}

export function getApiBaseUrl(): string {
  return getApiBaseUrls()[0] ?? 'http://127.0.0.1:8000';
}

async function requestJson<T>(path: string): Promise<T> {
  const baseUrls = getApiBaseUrls();
  const networkErrors: string[] = [];

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`);

      if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;
        try {
          const payload = (await response.json()) as { detail?: string };
          if (payload?.detail) {
            detail = payload.detail;
          }
        } catch {
          // Ignore JSON parse errors and keep the generic message.
        }
        throw new ApiError(detail, response.status);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      networkErrors.push(`${baseUrl}: ${error instanceof Error ? error.message : 'network request failed'}`);
    }
  }

  throw new Error(`无法连接后端服务。已尝试：${networkErrors.join('；')}`);
}

function formatDateLabel(isoText?: string | null): string | null {
  if (!isoText) return null;

  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日更新`;
}

function formatDurationLabel(durationMs?: number | null): string {
  if (!durationMs || durationMs <= 0) return '时长待补充';
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  return `${minutes} 分钟`;
}

function buildSummaryBlocks(article: ArticleMeta): ArticleSummaryBlock[] {
  const durationLabel = formatDurationLabel(article.durationMs);
  const paragraphLabel = article.paragraphCount ? `${article.paragraphCount} 段` : '段落待整理';
  const tagsLabel = article.tags && article.tags.length > 0 ? article.tags.join(' / ') : article.topic;

  return [
    { label: '难度', value: `${article.level} · ${article.topic}` },
    { label: '结构', value: `${article.sentenceCount} 句 · ${paragraphLabel}` },
    { label: '播放建议', value: `${durationLabel} · ${article.series ?? '公开资源'}` },
    { label: '分类', value: tagsLabel }
  ];
}

function mapSentence(item: ApiSentenceItem): Sentence {
  return {
    id: `${item.article_id}-${item.sentence_seq}`,
    sentenceSeq: item.sentence_seq,
    paragraph: item.paragraph,
    text: item.text,
    startMs: item.start_ms,
    endMs: item.end_ms,
    translation: item.translation
  };
}

function mapArticleMeta(item: ApiArticleListItem): ArticleMeta {
  return {
    id: item.id,
    title: item.title,
    topic: item.topic,
    level: item.level,
    cefrLevel: item.level,
    wordCount: item.word_count,
    sentenceCount: item.sentence_count,
    paragraphCount: item.paragraph_count ?? undefined,
    durationMs: item.duration_ms ?? undefined,
    imageUrl: item.image_url ?? undefined,
    audioUrl: item.audio_url ?? undefined,
    processingStatus: item.processing_status ?? undefined,
    series: item.series ?? undefined,
    summaryText: item.summary_text ?? undefined,
    tags: item.tags ?? [],
    createdAt: item.created_at ?? undefined,
    updatedAt: item.updated_at ?? undefined
  };
}

function mapArticleDetail(item: ApiArticleDetailResponse): ArticleDetail {
  const meta = mapArticleMeta(item);
  return {
    ...meta,
    bodyText: item.body_text ?? undefined,
    keyWords: item.key_words ?? [],
    keyPhrases: item.key_phrases ?? [],
    summaryBlocks: buildSummaryBlocks(meta),
    sentences: item.sentences.map(mapSentence)
  };
}

function mapCollection(item: ApiCollectionSummary): ResourceCollection {
  const latestTitle = item.latest_title?.trim();
  const description = latestTitle
    ? `最近更新文章：${latestTitle}`
    : '用于连续精听与系列化复习的文章合集。';

  return {
    id: item.name,
    title: item.name,
    description,
    articleCount: item.article_count,
    coverImage: item.cover_image_url ?? undefined,
    latestArticleId: item.latest_article_id ?? undefined,
    lastUpdatedLabel: formatDateLabel(item.last_updated)
  };
}

export async function fetchPublicArticles(): Promise<ArticleMeta[]> {
  const payload = await requestJson<ApiArticleListResponse>('/api/resources/articles?limit=50&offset=0');
  return payload.items.map(mapArticleMeta);
}

export async function fetchResourceCollections(): Promise<ResourceCollection[]> {
  const payload = await requestJson<ApiCollectionListResponse>('/api/resources/collections?limit=20&offset=0');
  return payload.items.map(mapCollection);
}

export async function fetchTopicSummaries(): Promise<TopicSummary[]> {
  return requestJson<TopicSummary[]>('/api/resources/topics');
}

export async function fetchArticleDetail(articleId: string): Promise<ArticleDetail> {
  const payload = await requestJson<ApiArticleDetailResponse>(`/api/resources/articles/${articleId}`);
  return mapArticleDetail(payload);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return '资源服务已启动，但数据库暂时不可用。请检查后端 dev 数据库连接。';
    }
    if (error.status === 404) {
      return '这篇文章暂时不可访问，可能已经下线。';
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求资源数据失败。';
}
