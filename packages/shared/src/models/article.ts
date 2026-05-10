export interface GrammarPoint {
  point?: string;
  pattern?: string;
  explanation?: string;
  example?: string;
}

export interface Sentence {
  id: string;
  sentenceSeq: number;
  paragraph?: number | null;
  text: string;
  startMs?: number | null;
  endMs?: number | null;
  translation?: string | null;
  grammarPoints?: GrammarPoint[] | null;
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
}

export interface ArticleDetail extends ArticleMeta {
  bodyText?: string;
  summaryText?: string | null;
  sentences: Sentence[];
}
