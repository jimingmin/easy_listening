import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import {
  fetchArticleDetail,
  fetchPublicArticles,
  fetchResourceCollections,
  fetchTopicSummaries,
  getApiBaseUrl,
  getApiBaseUrls,
  getErrorMessage
} from './api/resources';
import type { ArticleDetail, ArticleMeta, PlaybackMode, ResourceCollection, SubtitleMode, TopicSummary } from './models/article';
import { DetailScreen } from './screens/DetailScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { PlayerBar } from './components/PlayerBar';

type Route =
  | { name: 'library' }
  | { name: 'detail'; articleId: string };

const apiBaseUrl = getApiBaseUrl();
const apiBaseUrls = getApiBaseUrls().join(' / ');

export function AppShell() {
  const [route, setRoute] = useState<Route>({ name: 'library' });
  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [currentArticleId, setCurrentArticleId] = useState('');
  const currentArticleIdRef = useRef('');
  const [articleDetails, setArticleDetails] = useState<Record<string, ArticleDetail>>({});
  const articleDetailsRef = useRef<Record<string, ArticleDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('full');
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('both');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSentenceLooping, setIsSentenceLooping] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentArticle = useMemo<ArticleDetail | null>(() => {
    if (!currentArticleId) return null;
    return articleDetails[currentArticleId] ?? null;
  }, [articleDetails, currentArticleId]);

  const currentSentenceIndex = useMemo(() => {
    if (!currentArticle || currentArticle.sentences.length === 0) return 0;

    const idx = currentArticle.sentences.findIndex((sentence) => {
      const start = sentence.startMs ?? 0;
      const end = sentence.endMs ?? start;
      return progressMs >= start && progressMs < end;
    });

    if (idx >= 0) return idx;
    if (progressMs < (currentArticle.sentences[0]?.startMs ?? 0)) return 0;
    return Math.max(0, currentArticle.sentences.length - 1);
  }, [currentArticle, progressMs]);

  const setActiveArticleId = (articleId: string) => {
    currentArticleIdRef.current = articleId;
    setCurrentArticleId(articleId);
  };

  const loadLibrary = async () => {
    setIsLibraryLoading(true);
    setLibraryError(null);

    try {
      const [nextArticles, nextCollections, nextTopics] = await Promise.all([
        fetchPublicArticles(),
        fetchResourceCollections(),
        fetchTopicSummaries()
      ]);

      setArticles(nextArticles);
      setCollections(nextCollections);
      setTopics(nextTopics);

      if (!currentArticleIdRef.current && nextArticles[0]) {
        setActiveArticleId(nextArticles[0].id);
      }
    } catch (error) {
      setLibraryError(getErrorMessage(error));
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const loadArticle = async (articleId: string, force = false): Promise<ArticleDetail | null> => {
    const cached = articleDetailsRef.current[articleId];
    if (!force && cached) {
      setDetailError(null);
      return cached;
    }

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await fetchArticleDetail(articleId);
      setArticleDetails((previous) => {
        const next = { ...previous, [articleId]: detail };
        articleDetailsRef.current = next;
        return next;
      });
      return detail;
    } catch (error) {
      setDetailError(getErrorMessage(error));
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, []);

  useEffect(() => {
    if (!isPlaying || !currentArticle || currentArticle.sentences.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setProgressMs((previous) => {
        const articleDuration =
          currentArticle.durationMs ??
          currentArticle.sentences[currentArticle.sentences.length - 1]?.endMs ??
          0;

        if (articleDuration <= 0) {
          setIsPlaying(false);
          return previous;
        }

        const tickMs = Math.max(250, Math.round(1000 * playbackRate));

        if (playbackMode === 'full') {
          const next = previous + tickMs;
          if (next >= articleDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        }

        const currentSentence = currentArticle.sentences[currentSentenceIndex];
        const sentenceEnd = currentSentence?.endMs ?? articleDuration;
        const next = previous + tickMs;

        if (next >= sentenceEnd) {
          if (isSentenceLooping && currentSentence) {
            return currentSentence.startMs ?? previous;
          }

          const nextSentence = currentArticle.sentences[currentSentenceIndex + 1];
          if (!nextSentence) {
            setIsPlaying(false);
            return currentArticle.sentences[0]?.startMs ?? 0;
          }
          return nextSentence.startMs ?? previous;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentArticle, currentSentenceIndex, isPlaying, isSentenceLooping, playbackMode, playbackRate]);

  const openArticle = async (articleId: string) => {
    setActiveArticleId(articleId);
    setRoute({ name: 'detail', articleId });
    setIsPlaying(false);

    const detail = await loadArticle(articleId);
    if (!detail || currentArticleIdRef.current !== articleId) return;
    setProgressMs(detail.sentences[0]?.startMs ?? 0);
  };

  const playArticle = async (articleId: string, mode: PlaybackMode = 'full') => {
    setActiveArticleId(articleId);
    setRoute({ name: 'detail', articleId });
    setPlaybackMode(mode);
    setIsSentenceLooping(mode === 'sentence');
    setIsPlaying(false);

    const detail = await loadArticle(articleId);
    if (!detail || currentArticleIdRef.current !== articleId) return;

    setProgressMs(detail.sentences[0]?.startMs ?? 0);
    setIsPlaying(detail.sentences.length > 0);
  };

  const retryCurrentArticle = async () => {
    if (!currentArticleId) return;
    await loadArticle(currentArticleId, true);
  };

  const jumpSentence = (direction: 'prev' | 'next') => {
    if (!currentArticle || currentArticle.sentences.length === 0) return;
    const targetIndex =
      direction === 'prev'
        ? Math.max(0, currentSentenceIndex - 1)
        : Math.min(currentArticle.sentences.length - 1, currentSentenceIndex + 1);
    setProgressMs(currentArticle.sentences[targetIndex]?.startMs ?? 0);
  };

  const changePlaybackMode = (mode: PlaybackMode) => {
    setPlaybackMode(mode);
    if (mode === 'sentence') {
      const currentSentence = currentArticle?.sentences[currentSentenceIndex];
      if (currentSentence) {
        setProgressMs(currentSentence.startMs ?? progressMs);
      }
      setIsSentenceLooping(true);
    }
  };

  const togglePlayback = () => {
    if (!currentArticle || currentArticle.sentences.length === 0) return;
    setIsPlaying((previous) => !previous);
  };

  const body = route.name === 'detail' ? (
    <DetailScreen
      article={currentArticle}
      isLoading={isDetailLoading}
      errorMessage={detailError}
      onRetry={retryCurrentArticle}
      subtitleMode={subtitleMode}
      setSubtitleMode={setSubtitleMode}
      playbackMode={playbackMode}
      setPlaybackMode={changePlaybackMode}
      playbackRate={playbackRate}
      setPlaybackRate={setPlaybackRate}
      isSentenceLooping={isSentenceLooping}
      onToggleSentenceLoop={() => setIsSentenceLooping((previous) => !previous)}
      progressMs={progressMs}
      isPlaying={isPlaying}
      onTogglePlayback={togglePlayback}
      onJumpSentence={jumpSentence}
      currentSentenceIndex={currentSentenceIndex}
      onBack={() => setRoute({ name: 'library' })}
      onPlaySentence={(index) => {
        if (!currentArticle || currentArticle.sentences.length === 0) return;
        setPlaybackMode('sentence');
        setProgressMs(currentArticle.sentences[index]?.startMs ?? 0);
        setIsPlaying(true);
      }}
    />
  ) : (
    <LibraryScreen
      articles={articles}
      collections={collections}
      topics={topics}
      isLoading={isLibraryLoading}
        errorMessage={libraryError}
        apiBaseUrl={apiBaseUrls || apiBaseUrl}
      onRetry={loadLibrary}
      onOpenArticle={openArticle}
      onPlayArticle={playArticle}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>{body}</View>
      {currentArticle && currentArticle.sentences.length > 0 ? (
        <PlayerBar
          article={currentArticle}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          subtitleMode={subtitleMode}
          playbackRate={playbackRate}
          progressMs={progressMs}
          isSentenceLooping={isSentenceLooping}
          currentSentenceIndex={currentSentenceIndex}
          onTogglePlayback={togglePlayback}
          onChangePlaybackMode={changePlaybackMode}
          onChangeSubtitleMode={setSubtitleMode}
          onChangePlaybackRate={setPlaybackRate}
          onToggleSentenceLoop={() => setIsSentenceLooping((previous) => !previous)}
          onJumpSentence={jumpSentence}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f8fb'
  },
  container: {
    flex: 1
  }
});
