import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';
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

const PLAYBACK_STATUS_INTERVAL_MS = 250;
const SENTENCE_BOUNDARY_TOLERANCE_MS = 80;

type Route =
  | { name: 'library' }
  | { name: 'detail'; articleId: string };

const apiBaseUrl = getApiBaseUrl();
const apiBaseUrls = getApiBaseUrls().join(' / ');

function getArticleDurationMs(article: ArticleDetail): number {
  const lastSentenceEndMs = article.sentences.reduce((maxEndMs, sentence) => {
    if (sentence.endMs == null) return maxEndMs;
    return Math.max(maxEndMs, sentence.endMs);
  }, 0);

  return article.durationMs && article.durationMs > 0
    ? article.durationMs
    : lastSentenceEndMs;
}

function getSentenceStartMs(article: ArticleDetail, index: number): number {
  const sentence = article.sentences[index];
  if (!sentence) return 0;
  if (sentence.startMs != null) return sentence.startMs;
  if (index === 0) return 0;
  return article.sentences[index - 1]?.endMs ?? 0;
}

function getSentenceEndMs(article: ArticleDetail, index: number, articleDurationMs: number): number {
  const sentence = article.sentences[index];
  if (!sentence) return articleDurationMs;
  const startMs = getSentenceStartMs(article, index);
  const endMs = sentence.endMs ?? article.sentences[index + 1]?.startMs ?? articleDurationMs;
  return Math.max(startMs, endMs);
}

function findSentenceIndexAtProgress(article: ArticleDetail, progressMs: number): number {
  if (article.sentences.length === 0) return 0;

  let closestPastIndex = 0;
  const articleDurationMs = getArticleDurationMs(article);

  for (let index = 0; index < article.sentences.length; index += 1) {
    const startMs = getSentenceStartMs(article, index);
    const endMs = getSentenceEndMs(article, index, articleDurationMs);

    if (progressMs < startMs) {
      return Math.max(0, index - 1);
    }

    if (progressMs >= startMs && progressMs < endMs) {
      return index;
    }

    closestPastIndex = index;
  }

  return closestPastIndex;
}

function clampProgressMs(article: ArticleDetail, progressMs: number): number {
  const durationMs = getArticleDurationMs(article);
  if (durationMs <= 0) return Math.max(0, progressMs);
  return Math.max(0, Math.min(durationMs, progressMs));
}

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
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const soundArticleIdRef = useRef('');
  const audioLoadTokenRef = useRef(0);
  const sentenceBoundaryActionRef = useRef(false);
  const playbackModeRef = useRef<PlaybackMode>(playbackMode);
  const playbackRateRef = useRef(playbackRate);
  const isSentenceLoopingRef = useRef(isSentenceLooping);
  const progressMsRef = useRef(progressMs);

  const currentArticle = useMemo<ArticleDetail | null>(() => {
    if (!currentArticleId) return null;
    return articleDetails[currentArticleId] ?? null;
  }, [articleDetails, currentArticleId]);

  const currentSentenceIndex = useMemo(() => {
    if (!currentArticle || currentArticle.sentences.length === 0) return 0;
    return findSentenceIndexAtProgress(currentArticle, progressMs);
  }, [currentArticle, progressMs]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    const sound = soundRef.current;
    if (sound) {
      void sound.setRateAsync(playbackRate, true).catch((error) => {
        setPlaybackError(getErrorMessage(error));
      });
    }
  }, [playbackRate]);

  useEffect(() => {
    isSentenceLoopingRef.current = isSentenceLooping;
  }, [isSentenceLooping]);

  useEffect(() => {
    progressMsRef.current = progressMs;
  }, [progressMs]);

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

  const updateProgressFromAudio = (article: ArticleDetail | null, nextProgressMs: number) => {
    const resolvedProgressMs = article ? clampProgressMs(article, nextProgressMs) : Math.max(0, nextProgressMs);
    progressMsRef.current = resolvedProgressMs;
    setProgressMs(resolvedProgressMs);
  };

  const handleSentenceBoundary = async (article: ArticleDetail, status: Extract<AVPlaybackStatus, { isLoaded: true }>) => {
    if (sentenceBoundaryActionRef.current || playbackModeRef.current !== 'sentence' || !status.isPlaying) return;

    const articleDurationMs = status.durationMillis ?? getArticleDurationMs(article);
    const sentenceIndex = findSentenceIndexAtProgress(article, status.positionMillis);
    const sentenceEndMs = getSentenceEndMs(article, sentenceIndex, articleDurationMs);

    if (status.positionMillis + SENTENCE_BOUNDARY_TOLERANCE_MS < sentenceEndMs) return;

    sentenceBoundaryActionRef.current = true;

    try {
      const sound = soundRef.current;
      if (!sound || soundArticleIdRef.current !== article.id) return;

      if (isSentenceLoopingRef.current) {
        const sentenceStartMs = getSentenceStartMs(article, sentenceIndex);
        updateProgressFromAudio(article, sentenceStartMs);
        await sound.setPositionAsync(sentenceStartMs);
        return;
      }

      const nextSentence = article.sentences[sentenceIndex + 1];
      if (!nextSentence) {
        updateProgressFromAudio(article, sentenceEndMs);
        await sound.pauseAsync();
        await sound.setPositionAsync(sentenceEndMs);
        setIsPlaying(false);
        return;
      }

      const nextSentenceStartMs = getSentenceStartMs(article, sentenceIndex + 1);
      updateProgressFromAudio(article, nextSentenceStartMs);
      await sound.setPositionAsync(nextSentenceStartMs);
    } catch (error) {
      setPlaybackError(getErrorMessage(error));
    } finally {
      sentenceBoundaryActionRef.current = false;
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setPlaybackError(status.error);
        setIsPlaying(false);
      }
      return;
    }

    const article = articleDetailsRef.current[soundArticleIdRef.current] ?? null;
    setPlaybackError(null);
    updateProgressFromAudio(article, status.positionMillis);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      return;
    }

    if (article) {
      void handleSentenceBoundary(article, status);
    }
  };

  const unloadCurrentSound = async () => {
    audioLoadTokenRef.current += 1;
    sentenceBoundaryActionRef.current = false;
    const sound = soundRef.current;
    soundRef.current = null;
    soundArticleIdRef.current = '';

    if (sound) {
      sound.setOnPlaybackStatusUpdate(null);
      try {
        await sound.unloadAsync();
      } catch {
        // The sound may already be unloaded by the native layer after an error.
      }
    }

    setIsPlaying(false);
  };

  const ensureSoundForArticle = async (article: ArticleDetail): Promise<Audio.Sound | null> => {
    if (!article.audioUrl) {
      setPlaybackError('当前资源还没有可播放音频。');
      await unloadCurrentSound();
      return null;
    }

    if (soundRef.current && soundArticleIdRef.current === article.id) {
      return soundRef.current;
    }

    const loadToken = audioLoadTokenRef.current + 1;
    audioLoadTokenRef.current = loadToken;
    await unloadCurrentSound();
    audioLoadTokenRef.current = loadToken;
    setPlaybackError(null);

    try {
      const initialPositionMs = currentArticleIdRef.current === article.id
        ? clampProgressMs(article, progressMsRef.current)
        : getSentenceStartMs(article, 0);
      const { sound } = await Audio.Sound.createAsync(
        { uri: article.audioUrl },
        {
          shouldPlay: false,
          positionMillis: initialPositionMs,
          progressUpdateIntervalMillis: PLAYBACK_STATUS_INTERVAL_MS,
          rate: playbackRateRef.current,
          shouldCorrectPitch: true,
        },
        handlePlaybackStatusUpdate,
        false
      );

      if (audioLoadTokenRef.current !== loadToken) {
        sound.setOnPlaybackStatusUpdate(null);
        await sound.unloadAsync();
        return null;
      }

      soundRef.current = sound;
      soundArticleIdRef.current = article.id;
      updateProgressFromAudio(article, initialPositionMs);
      return sound;
    } catch (error) {
      if (audioLoadTokenRef.current === loadToken) {
        setPlaybackError(getErrorMessage(error));
        setIsPlaying(false);
      }
      return null;
    }
  };

  const seekLoadedSound = async (article: ArticleDetail, targetProgressMs: number, shouldPlayAfterSeek?: boolean) => {
    const nextProgressMs = clampProgressMs(article, targetProgressMs);
    updateProgressFromAudio(article, nextProgressMs);

    const sound = soundRef.current && soundArticleIdRef.current === article.id
      ? soundRef.current
      : null;

    if (!sound) return;

    try {
      await sound.setPositionAsync(nextProgressMs);
      if (shouldPlayAfterSeek) {
        await sound.playAsync();
      }
    } catch (error) {
      setPlaybackError(getErrorMessage(error));
    }
  };

  const playArticleAtProgress = async (article: ArticleDetail, targetProgressMs: number) => {
    const sound = await ensureSoundForArticle(article);
    if (!sound) return;

    const nextProgressMs = clampProgressMs(article, targetProgressMs);
    updateProgressFromAudio(article, nextProgressMs);

    try {
      await sound.setStatusAsync({
        positionMillis: nextProgressMs,
        shouldPlay: true,
        rate: playbackRateRef.current,
        shouldCorrectPitch: true,
        progressUpdateIntervalMillis: PLAYBACK_STATUS_INTERVAL_MS,
      });
    } catch (error) {
      setPlaybackError(getErrorMessage(error));
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, []);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((error) => {
      setPlaybackError(getErrorMessage(error));
    });

    return () => {
      void unloadCurrentSound();
    };
  }, []);

  useEffect(() => {
    const sound = soundRef.current;
    if (currentArticleId && soundArticleIdRef.current && soundArticleIdRef.current !== currentArticleId) {
      void unloadCurrentSound();
    } else if (!currentArticleId && sound) {
      void unloadCurrentSound();
    }
  }, [currentArticleId]);

  const openArticle = async (articleId: string) => {
    setActiveArticleId(articleId);
    setRoute({ name: 'detail', articleId });
    setIsPlaying(false);
    await soundRef.current?.pauseAsync().catch((error) => {
      setPlaybackError(getErrorMessage(error));
    });

    const detail = await loadArticle(articleId);
    if (!detail || currentArticleIdRef.current !== articleId) return;
    updateProgressFromAudio(detail, getSentenceStartMs(detail, 0));
  };

  const playArticle = async (articleId: string, mode: PlaybackMode = 'full') => {
    setActiveArticleId(articleId);
    setRoute({ name: 'detail', articleId });
    playbackModeRef.current = mode;
    setPlaybackMode(mode);
    isSentenceLoopingRef.current = mode === 'sentence';
    setIsSentenceLooping(mode === 'sentence');
    setIsPlaying(false);

    const detail = await loadArticle(articleId);
    if (!detail || currentArticleIdRef.current !== articleId) return;

    const startMs = getSentenceStartMs(detail, 0);
    updateProgressFromAudio(detail, startMs);
    if (detail.sentences.length > 0) {
      await playArticleAtProgress(detail, startMs);
    }
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
    void seekLoadedSound(currentArticle, getSentenceStartMs(currentArticle, targetIndex));
  };

  const seekBy = (deltaMs: number) => {
    if (!currentArticle) return;

    const durationMs = getArticleDurationMs(currentArticle);

    if (durationMs <= 0) return;

    void seekLoadedSound(currentArticle, progressMsRef.current + deltaMs);
  };

  const changePlaybackMode = (mode: PlaybackMode) => {
    playbackModeRef.current = mode;
    setPlaybackMode(mode);
    if (mode === 'sentence') {
      const currentSentence = currentArticle?.sentences[currentSentenceIndex];
      if (currentSentence) {
        void seekLoadedSound(currentArticle, getSentenceStartMs(currentArticle, currentSentenceIndex));
      }
      isSentenceLoopingRef.current = true;
      setIsSentenceLooping(true);
    }
  };

  const toggleSentenceLoop = () => {
    setIsSentenceLooping((previous) => {
      const next = !previous;
      isSentenceLoopingRef.current = next;
      return next;
    });
  };

  const togglePlayback = async () => {
    if (!currentArticle || currentArticle.sentences.length === 0) return;

    const sound = soundRef.current && soundArticleIdRef.current === currentArticle.id
      ? soundRef.current
      : null;

    if (sound && isPlaying) {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        setPlaybackError(getErrorMessage(error));
      }
      return;
    }

    await playArticleAtProgress(currentArticle, progressMsRef.current);
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
      onToggleSentenceLoop={toggleSentenceLoop}
      progressMs={progressMs}
      isPlaying={isPlaying}
      onTogglePlayback={() => { void togglePlayback(); }}
      onJumpSentence={jumpSentence}
      currentSentenceIndex={currentSentenceIndex}
      onBack={() => setRoute({ name: 'library' })}
      playbackErrorMessage={playbackError}
      onPlaySentence={(index) => {
        if (!currentArticle || currentArticle.sentences.length === 0) return;
        playbackModeRef.current = 'sentence';
        setPlaybackMode('sentence');
        const startMs = getSentenceStartMs(currentArticle, index);
        updateProgressFromAudio(currentArticle, startMs);
        void playArticleAtProgress(currentArticle, startMs);
      }}
      onSeekSentence={(index) => {
        if (!currentArticle || currentArticle.sentences.length === 0) return;
        playbackModeRef.current = 'full';
        setPlaybackMode('full');
        const startMs = getSentenceStartMs(currentArticle, index);
        updateProgressFromAudio(currentArticle, startMs);
        void playArticleAtProgress(currentArticle, startMs);
      }}
      onSeekBy={seekBy}
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
      {route.name !== 'detail' && currentArticle && currentArticle.sentences.length > 0 ? (
        <PlayerBar
          onPress={() => setRoute({ name: 'detail', articleId: currentArticle.id })}
          article={currentArticle}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          subtitleMode={subtitleMode}
          playbackRate={playbackRate}
          progressMs={progressMs}
          isSentenceLooping={isSentenceLooping}
          currentSentenceIndex={currentSentenceIndex}
          onTogglePlayback={() => { void togglePlayback(); }}
          onChangePlaybackMode={changePlaybackMode}
          onChangeSubtitleMode={setSubtitleMode}
          onChangePlaybackRate={setPlaybackRate}
          onToggleSentenceLoop={toggleSentenceLoop}
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
