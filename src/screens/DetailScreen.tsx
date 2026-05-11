import React, { useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import type { ArticleDetail, PlaybackMode, Sentence, SubtitleMode } from '../models/article';
import { SegmentedTabs } from '../components/SegmentedTabs';

interface DetailScreenProps {
  article: ArticleDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  subtitleMode: SubtitleMode;
  setSubtitleMode: (mode: SubtitleMode) => void;
  playbackMode: PlaybackMode;
  setPlaybackMode: (mode: PlaybackMode) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  isSentenceLooping: boolean;
  onToggleSentenceLoop: () => void;
  progressMs: number;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onJumpSentence: (direction: 'prev' | 'next') => void;
  currentSentenceIndex: number;
  onBack: () => void;
  onPlaySentence: (index: number) => void;
}

function formatTime(ms?: number | null): string {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getArticleDurationMs(article: ArticleDetail): number {
  return article.durationMs ?? article.sentences[article.sentences.length - 1]?.endMs ?? 0;
}

function getSentenceDurationMs(sentence?: Sentence | null): number {
  if (sentence?.endMs == null || sentence.startMs == null) return 0;
  return Math.max(0, sentence.endMs - sentence.startMs);
}

function ProgressLine({ progress }: { progress: DimensionValue }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: progress }]} />
    </View>
  );
}

export function DetailScreen({
  article,
  isLoading,
  errorMessage,
  onRetry,
  subtitleMode,
  setSubtitleMode,
  playbackMode,
  setPlaybackMode,
  playbackRate,
  setPlaybackRate,
  isSentenceLooping,
  onToggleSentenceLoop,
  progressMs,
  isPlaying,
  onTogglePlayback,
  onJumpSentence,
  currentSentenceIndex,
  onBack,
  onPlaySentence
}: DetailScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!article) return;
    const targetY = 560 + currentSentenceIndex * 112;
    scrollRef.current?.scrollTo({ y: Math.max(0, targetY - 240), animated: true });
  }, [article, currentSentenceIndex]);

  if (!article) {
    return (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>返回资源列表</Text>
        </Pressable>

        <View style={styles.stateCard}>
          <Text style={styles.summaryHeading}>
            {isLoading ? '正在加载文章内容' : '文章详情暂时不可用'}
          </Text>
          <Text style={styles.loadingBody}>
            {isLoading
              ? '正在从后端获取这篇文章的摘要、正文与句子时间轴。'
              : (errorMessage ?? '这篇文章的详情数据暂时还没有加载成功。')}
          </Text>
          {!isLoading ? (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryLabel}>重新加载文章</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  const currentSentence = article.sentences[currentSentenceIndex];
  const articleDurationMs = getArticleDurationMs(article);
  const articleProgress: DimensionValue = articleDurationMs > 0
    ? `${Math.min(100, Math.max(0, (progressMs / articleDurationMs) * 100))}%`
    : '0%';
  const sentenceStartMs = currentSentence?.startMs ?? 0;
  const sentenceDurationMs = getSentenceDurationMs(currentSentence);
  const sentenceProgress: DimensionValue = sentenceDurationMs > 0
    ? `${Math.min(100, Math.max(0, ((progressMs - sentenceStartMs) / sentenceDurationMs) * 100))}%`
    : '0%';
  const speedOptions = [0.75, 1, 1.25, 1.5];
  const showEnglish = subtitleMode === 'en' || subtitleMode === 'both';
  const showChinese = subtitleMode === 'zh' || subtitleMode === 'both';

  const renderSentenceText = (sentence: Sentence, active: boolean, large = false, inverse = false) => (
    <View style={styles.sentenceBody}>
      {showEnglish ? (
        <Text style={[
          large ? styles.stageEnglish : styles.english,
          large && inverse ? styles.stageEnglishInverse : null,
          active ? (large ? (inverse ? styles.stageEnglishActiveInverse : styles.stageEnglishActive) : styles.englishActive) : null
        ]}>
          {sentence.text}
        </Text>
      ) : null}
      {showChinese ? (
        <Text style={[
          large ? styles.stageChinese : styles.chinese,
          large && inverse ? styles.stageChineseInverse : null,
          active ? (large ? (inverse ? styles.stageChineseActiveInverse : styles.stageChineseActive) : styles.chineseActive) : null
        ]}>
          {sentence.translation ?? '暂无翻译'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>返回</Text>
        </Pressable>
        <Text style={styles.modePill}>
          {playbackMode === 'full' ? '播客泛听' : '逐句精听'}
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.cover}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
          ) : (
            <Text style={styles.coverFallback}>听</Text>
          )}
        </View>
        <View style={styles.heroText}>
          <Text style={styles.series}>{article.series ?? '公开资源'}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.summary}>{article.summaryText ?? article.topic}</Text>
        </View>
      </View>

      <View style={styles.tabsBlock}>
        <SegmentedTabs
          value={playbackMode}
          onChange={setPlaybackMode}
          options={[
            { value: 'full', label: '播客泛听' },
            { value: 'sentence', label: '逐句精听' }
          ]}
        />
        <SegmentedTabs
          value={subtitleMode}
          onChange={setSubtitleMode}
          options={[
            { value: 'en', label: '英文' },
            { value: 'zh', label: '中文' },
            { value: 'both', label: '中英' }
          ]}
        />
      </View>

      {playbackMode === 'full' ? (
        <View style={styles.podcastStage}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageEyebrow}>Apple Podcasts Style</Text>
            <Text style={styles.stageMeta}>
              {formatTime(progressMs)} / {formatTime(articleDurationMs)}
            </Text>
          </View>
          <ProgressLine progress={articleProgress} />
          <View style={styles.stageSentence}>
            {currentSentence ? renderSentenceText(currentSentence, true, true, true) : (
              <Text style={styles.stageEmpty}>准备开始播放</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.intensivePanel}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageEyebrow}>
              第 {currentSentenceIndex + 1} / {article.sentences.length} 句
            </Text>
            <Text style={styles.stageMeta}>
              {formatTime(Math.max(0, progressMs - sentenceStartMs))} / {formatTime(sentenceDurationMs)}
            </Text>
          </View>
          <ProgressLine progress={sentenceProgress} />
          <View style={styles.focusSentence}>
            {currentSentence ? renderSentenceText(currentSentence, true, true) : (
              <Text style={styles.stageEmpty}>当前句内容加载中</Text>
            )}
          </View>
          <View style={styles.focusControls}>
            <Pressable onPress={() => onJumpSentence('prev')} style={styles.controlButton}>
              <Text style={styles.controlText}>上一句</Text>
            </Pressable>
            <Pressable onPress={onTogglePlayback} style={styles.primaryControl}>
              <Text style={styles.primaryControlText}>{isPlaying ? '暂停' : '播放'}</Text>
            </Pressable>
            <Pressable onPress={() => onJumpSentence('next')} style={styles.controlButton}>
              <Text style={styles.controlText}>下一句</Text>
            </Pressable>
            <Pressable
              onPress={onToggleSentenceLoop}
              style={[styles.controlButton, isSentenceLooping ? styles.loopButtonActive : null]}
            >
              <Text style={[styles.controlText, isSentenceLooping ? styles.loopTextActive : null]}>
                循环
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>播放速度</Text>
        <View style={styles.speedChips}>
          {speedOptions.map((rate) => (
            <Pressable
              key={rate}
              onPress={() => setPlaybackRate(rate)}
              style={[styles.speedChip, playbackRate === rate ? styles.speedChipActive : null]}
            >
              <Text style={[styles.speedChipText, playbackRate === rate ? styles.speedChipTextActive : null]}>
                {rate}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryHeading}>摘要信息</Text>
        <View style={styles.summaryGrid}>
          {article.summaryBlocks.map((item) => (
            <View key={item.label} style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.transcriptWrap}>
        <Text style={styles.transcriptHeading}>
          {playbackMode === 'full' ? '中英双语字幕' : '逐句精听列表'}
        </Text>
        <View style={styles.transcriptList}>
          {article.sentences.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>句子拆分暂未返回</Text>
              <Text style={styles.emptyBody}>后端已经返回文章数据，但这篇文章还没有句子时间轴。</Text>
            </View>
          ) : null}
          {article.sentences.map((sentence, index) => {
            const active = index === currentSentenceIndex;
            return (
              <Pressable
                key={sentence.id}
                onPress={() => onPlaySentence(index)}
                style={[
                  styles.sentenceCard,
                  playbackMode === 'full' ? styles.podcastSentenceCard : null,
                  active ? styles.sentenceCardActive : null
                ]}
              >
                <Text style={[styles.sentenceIndex, active ? styles.sentenceIndexActive : null]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                {renderSentenceText(sentence, active)}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 250,
    gap: 18,
    backgroundColor: '#f7f8fb'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: 'center'
  },
  backLabel: {
    color: '#0f172a',
    fontWeight: '800'
  },
  modePill: {
    backgroundColor: '#fff7ed',
    color: '#ea580c',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '900'
  },
  heroCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    borderColor: 'rgba(226,232,240,0.9)',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2
  },
  cover: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  coverFallback: {
    color: '#f97316',
    fontSize: 34,
    fontWeight: '900'
  },
  heroText: {
    flex: 1,
    gap: 7
  },
  series: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '900'
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900'
  },
  summary: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20
  },
  tabsBlock: {
    gap: 10
  },
  podcastStage: {
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 20,
    gap: 18,
    minHeight: 260
  },
  intensivePanel: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    gap: 16
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  stageEyebrow: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  stageMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800'
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(148,163,184,0.28)',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 999
  },
  stageSentence: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 170
  },
  focusSentence: {
    minHeight: 160,
    justifyContent: 'center'
  },
  stageEmpty: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center'
  },
  stageEnglish: {
    color: '#0f172a',
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center'
  },
  stageEnglishInverse: {
    color: '#e2e8f0'
  },
  stageEnglishActive: {
    color: '#0f172a'
  },
  stageEnglishActiveInverse: {
    color: '#ffffff'
  },
  stageChinese: {
    color: '#64748b',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10
  },
  stageChineseInverse: {
    color: '#94a3b8'
  },
  stageChineseActive: {
    color: '#475569'
  },
  stageChineseActiveInverse: {
    color: '#cbd5e1'
  },
  focusControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  controlButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center'
  },
  controlText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800'
  },
  primaryControl: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: '#f97316',
    justifyContent: 'center'
  },
  primaryControlText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900'
  },
  loopButtonActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0'
  },
  loopTextActive: {
    color: '#15803d'
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  speedLabel: {
    color: '#475569',
    fontWeight: '800'
  },
  speedChips: {
    flexDirection: 'row',
    gap: 8
  },
  speedChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  speedChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa'
  },
  speedChipText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 12
  },
  speedChipTextActive: {
    color: '#ea580c'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 16
  },
  summaryHeading: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900'
  },
  summaryGrid: {
    gap: 12
  },
  summaryItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 6
  },
  summaryLabel: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '900'
  },
  summaryValue: {
    color: '#1e293b',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800'
  },
  loadingBody: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f97316',
    borderRadius: 14,
    minHeight: 42,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  retryLabel: {
    color: '#ffffff',
    fontWeight: '800'
  },
  stateCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12
  },
  transcriptWrap: {
    gap: 12
  },
  transcriptHeading: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900'
  },
  transcriptList: {
    gap: 10
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    gap: 8
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900'
  },
  emptyBody: {
    color: '#60707e',
    fontSize: 14,
    lineHeight: 20
  },
  sentenceCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    opacity: 0.76
  },
  podcastSentenceCard: {
    opacity: 0.48
  },
  sentenceCardActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    opacity: 1
  },
  sentenceIndex: {
    width: 30,
    color: '#94a3b8',
    fontWeight: '900'
  },
  sentenceIndexActive: {
    color: '#f97316'
  },
  sentenceBody: {
    flex: 1,
    gap: 7
  },
  english: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800'
  },
  englishActive: {
    color: '#0f172a'
  },
  chinese: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21
  },
  chineseActive: {
    color: '#475569'
  }
});
