export interface GrammarPoint {
  point?: string;
  pattern?: string;
  explanation?: string;
  example?: string;
}

export type SubtitleMode = 'en' | 'zh' | 'both';
export type PlaybackMode = 'full' | 'sentence';

export interface Sentence {
  id: string;
  sentenceSeq: number;
  paragraph?: number | null;
  text: string;
  translation?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  grammarPoints?: GrammarPoint[] | null;
}

export interface ArticleSummaryBlock {
  label: string;
  value: string;
}

export interface ArticleMeta {
  id: string;
  title: string;
  topic: string;
  level: string;
  cefrLevel?: string | null;
  wordCount: number;
  sentenceCount: number;
  paragraphCount?: number;
  durationMs?: number;
  imageUrl?: string | null;
  audioUrl?: string | null;
  processingStatus?: string | null;
  series?: string | null;
  summaryText?: string | null;
  tags?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ArticleDetail extends ArticleMeta {
  bodyText?: string;
  summaryBlocks: ArticleSummaryBlock[];
  keyWords?: unknown[];
  keyPhrases?: unknown[];
  sentences: Sentence[];
}

export interface ResourceCollection {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  coverImage?: string | null;
  latestArticleId?: string | null;
  lastUpdatedLabel?: string | null;
}

export interface TopicSummary {
  name: string;
  count: number;
}
