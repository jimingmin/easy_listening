import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, SafeAreaView, Dimensions, Platform, type DimensionValue, ActionSheetIOS } from 'react-native';
import type { ArticleDetail, PlaybackMode, Sentence, SubtitleMode } from '../models/article';

const { width } = Dimensions.get('window');
const CONTENT_PADDING = 32;
const coverSize = width - CONTENT_PADDING * 2;
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

interface DetailScreenProps {
  article: ArticleDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  playbackErrorMessage?: string | null;
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
  onSeekSentence: (index: number) => void;
  onSeekBy: (deltaMs: number) => void;
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

function formatEpisodeDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const monthLabels = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
}

function ProgressBar({
  progress,
  isIntensive,
  trackColor = '#e5e5ea',
  fillColor,
  knobColor = '#000000',
}: {
  progress: DimensionValue;
  isIntensive: boolean;
  trackColor?: string;
  fillColor?: string;
  knobColor?: string;
}) {
  const resolvedFillColor = fillColor ?? (isIntensive ? '#007aff' : '#8e8e93');

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width: progress, backgroundColor: resolvedFillColor }]} />
      <View style={[styles.progressKnob, { left: progress, backgroundColor: knobColor }]} />
    </View>
  );
}

function SubtitleModeSwitch({
  subtitleMode,
  setSubtitleMode,
  tone = 'light',
}: {
  subtitleMode: SubtitleMode;
  setSubtitleMode: (mode: SubtitleMode) => void;
  tone?: 'light' | 'dark';
}) {
  const isDark = tone === 'dark';

  return (
    <View style={[styles.subtitleModeSwitch, isDark ? styles.subtitleModeSwitchDark : null]}>
      {([
        { mode: 'en' as const, label: '英' },
        { mode: 'both' as const, label: '中英' },
        { mode: 'zh' as const, label: '中' },
      ]).map((option) => {
        const active = option.mode === subtitleMode;
        return (
          <Pressable
            key={option.mode}
            onPress={() => setSubtitleMode(option.mode)}
            style={[
              styles.subtitleModeChip,
              active ? styles.subtitleModeChipActive : null,
              isDark && active ? styles.subtitleModeChipActiveDark : null,
            ]}
          >
            <Text
              style={[
                styles.subtitleModeChipText,
                isDark ? styles.subtitleModeChipTextDark : null,
                active ? styles.subtitleModeChipTextActive : null,
                isDark && active ? styles.subtitleModeChipTextActiveDark : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CaptionsIcon({ active, tone = 'light' }: { active: boolean, tone?: 'light' | 'dark' }) {
  const tintColor = tone === 'dark'
    ? (active ? '#ffffff' : 'rgba(255,255,255,0.82)')
    : (active ? '#007aff' : '#a1a1a6');

  return (
    <View style={[styles.captionsIcon, { borderColor: tintColor }]}>
      <View style={styles.captionsIconRow}>
        <View style={[styles.captionsIconLine, { backgroundColor: tintColor, width: 7 }]} />
        <View style={[styles.captionsIconLine, { backgroundColor: tintColor, width: 5 }]} />
      </View>
      <View style={styles.captionsIconRow}>
        <View style={[styles.captionsIconLine, { backgroundColor: tintColor, width: 5 }]} />
        <View style={[styles.captionsIconLine, { backgroundColor: tintColor, width: 7 }]} />
      </View>
    </View>
  );
}

function QueueIcon() {
  return (
    <View style={styles.queueIcon}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.queueIconRow}>
          <View style={styles.queueIconDot} />
          <View style={styles.queueIconLine} />
        </View>
      ))}
    </View>
  );
}

function BroadcastIcon() {
  return (
    <View style={styles.broadcastIcon}>
      <View style={styles.broadcastRingOuter} />
      <View style={styles.broadcastRingInner} />
      <View style={styles.broadcastBase} />
    </View>
  );
}

function PodcastSkipButton({
  seconds,
  direction,
  onPress,
}: {
  seconds: number;
  direction: 'back' | 'forward';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.podcastSkipButton}>
      <View style={styles.podcastSkipCircle}>
        <Text style={styles.podcastSkipNumber}>{seconds}</Text>
        <Text style={styles.podcastSkipArrow}>{direction === 'back' ? '<<' : '>>'}</Text>
      </View>
    </Pressable>
  );
}

export function DetailScreen({
  article,
  isLoading,
  errorMessage,
  playbackErrorMessage,
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
  onPlaySentence,
  onSeekSentence,
  onSeekBy
}: DetailScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const intensiveTranscriptListOffsetRef = useRef(0);
  const intensiveTranscriptRowOffsetsRef = useRef<Record<number, number>>({});
  const podcastTranscriptRowOffsetsRef = useRef<Record<number, number>>({});
  const [isPodcastTranscriptVisible, setIsPodcastTranscriptVisible] = useState(false);

  useEffect(() => {
    setIsPodcastTranscriptVisible(false);
  }, [article?.id]);

  useEffect(() => {
    intensiveTranscriptListOffsetRef.current = 0;
    intensiveTranscriptRowOffsetsRef.current = {};
    podcastTranscriptRowOffsetsRef.current = {};
  }, [article?.id, subtitleMode]);

  const isIntensive = playbackMode === 'sentence';
  const shouldAutoScrollTranscript = isIntensive || isPodcastTranscriptVisible;

  useEffect(() => {
    if (!article || !shouldAutoScrollTranscript) return;

    const scrollHandle = setTimeout(() => {
      const isPodcastTranscript = !isIntensive && isPodcastTranscriptVisible;
      const measuredY = isPodcastTranscript
        ? podcastTranscriptRowOffsetsRef.current[currentSentenceIndex]
        : intensiveTranscriptListOffsetRef.current + (intensiveTranscriptRowOffsetsRef.current[currentSentenceIndex] ?? currentSentenceIndex * 96);
      const fallbackY = isPodcastTranscript
        ? currentSentenceIndex * 96
        : 600 + currentSentenceIndex * 110;
      const targetY = measuredY ?? fallbackY;
      const viewportOffset = isPodcastTranscript ? 128 : 280;

      scrollRef.current?.scrollTo({
        y: Math.max(0, targetY - viewportOffset),
        animated: false,
      });
    }, 0);

    return () => clearTimeout(scrollHandle);
  }, [article, currentSentenceIndex, isIntensive, isPodcastTranscriptVisible, shouldAutoScrollTranscript]);

  if (!article) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} style={styles.topChevronDrag} hitSlop={15}>
            <View style={styles.dragHandle} />
          </Pressable>
        </View>
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>{isLoading ? 'Loading...' : 'Error'}</Text>
          <Text style={styles.stateBody}>{isLoading ? '加载内容中...' : (errorMessage ?? '加载失败')}</Text>
        </View>
      </SafeAreaView>
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

  const showEnglish = subtitleMode === 'en' || subtitleMode === 'both';
  const showChinese = subtitleMode === 'zh' || subtitleMode === 'both';
  const podcastSubtitle = article.series?.trim() || article.topic || '公开资源';
  const podcastEyebrow = formatEpisodeDate(article.createdAt ?? article.updatedAt) ?? String(article.topic ?? 'EPISODE').toUpperCase();

  const showSpeedOptions = () => {
    if (Platform.OS !== 'ios') {
      const currentIndex = SPEED_OPTIONS.findIndex((option) => option === playbackRate);
      const nextRate = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length] ?? 1;
      setPlaybackRate(nextRate);
      return;
    }

    const displayOptions = ['取消', '0.75x', '1.0x', '1.25x', '1.5x'];
    const exactOptions = [1, 0.75, 1, 1.25, 1.5];
    ActionSheetIOS.showActionSheetWithOptions(
      { options: displayOptions, cancelButtonIndex: 0 },
      (btnIdx) => { if (btnIdx > 0) setPlaybackRate(exactOptions[btnIdx]); }
    );
  };

  const showMoreOptions = () => {
    if (Platform.OS !== 'ios') {
      setPlaybackMode(isIntensive ? 'full' : 'sentence');
      return;
    }

    const options = [
      '取消',
      isIntensive ? '退出精听模式' : '进入精听模式',
      isSentenceLooping ? '关闭单句循环' : '开启单句循环'
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 0 },
      (btnIdx) => {
        if (btnIdx === 1) setPlaybackMode(isIntensive ? 'full' : 'sentence');
        if (btnIdx === 2) onToggleSentenceLoop();
      }
    );
  };

  const renderTranscriptList = (onPressSentence: (index: number) => void) => {
    if (article.sentences.length === 0) {
      return (
        <View style={styles.transcriptList}>
          <Text style={styles.transcriptEmpty}>当前资源还没有可用字幕。</Text>
        </View>
      );
    }

    return (
      <View
        style={styles.transcriptList}
        onLayout={(event) => {
          intensiveTranscriptListOffsetRef.current = event.nativeEvent.layout.y;
        }}
      >
        {article.sentences.map((sentence, index) => {
          const active = index === currentSentenceIndex;
          return (
            <Pressable
              key={sentence.id}
              onPress={() => onPressSentence(index)}
              onLayout={(event) => {
                intensiveTranscriptRowOffsetsRef.current[index] = event.nativeEvent.layout.y;
              }}
              style={styles.sentenceRow}
            >
              {showEnglish && (
                <Text style={[styles.transcriptPrimary, active ? styles.transcriptPrimaryActive : null]}>
                  {sentence.text}
                </Text>
              )}
              {showChinese && (
                <Text style={[styles.transcriptSecondary, active ? styles.transcriptSecondaryActive : null, showEnglish ? { marginTop: 6 } : null]}>
                  {sentence.translation ?? '暂无翻译'}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderPodcastTranscriptStage = () => {
    if (article.sentences.length === 0) {
      return (
        <View style={styles.podcastTranscriptEmptyWrap}>
          <Text style={styles.podcastTranscriptEmpty}>当前资源还没有可用字幕。</Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={scrollRef}
        style={styles.podcastTranscriptViewport}
        contentContainerStyle={styles.podcastTranscriptContent}
        showsVerticalScrollIndicator={false}
      >
        {article.sentences.map((sentence, index) => {
          const active = index === currentSentenceIndex;
          return (
            <Pressable
              key={sentence.id}
              onPress={() => onSeekSentence(index)}
              onLayout={(event) => {
                podcastTranscriptRowOffsetsRef.current[index] = event.nativeEvent.layout.y;
              }}
              style={styles.podcastSentenceRow}
            >
              {showEnglish ? (
                <Text style={[styles.podcastSentencePrimary, active ? styles.podcastSentencePrimaryActive : styles.podcastSentenceInactive]}>
                  {sentence.text}
                </Text>
              ) : null}
              {showChinese ? (
                <Text
                  style={[
                    showEnglish ? styles.podcastSentenceSecondary : styles.podcastSentencePrimary,
                    showEnglish
                      ? (active ? styles.podcastSentenceSecondaryActive : styles.podcastSentenceInactive)
                      : (active ? styles.podcastSentencePrimaryActive : styles.podcastSentenceInactive),
                    showEnglish ? styles.podcastSentenceSecondarySpacing : null,
                  ]}
                >
                  {sentence.translation ?? '暂无翻译'}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  if (!isIntensive) {
    return (
      <SafeAreaView style={styles.podcastSafeArea}>
        <View style={styles.podcastBackdrop}>
          <View style={styles.podcastBackdropGlowTop} />
          <View style={styles.podcastBackdropGlowBottom} />

          <View style={styles.topBar}>
            <Pressable onPress={onBack} hitSlop={20} style={styles.topChevronDrag}>
              <View style={[styles.dragHandle, styles.podcastDragHandle]} />
            </Pressable>
          </View>

          <View style={styles.podcastBody}>
            {isPodcastTranscriptVisible ? (
              <>
                <View style={styles.podcastCompactHeader}>
                  <View style={styles.podcastCompactMeta}>
                    <View style={styles.podcastCompactCover}>
                      {article.imageUrl ? (
                        <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
                      ) : (
                        <Text style={styles.podcastCompactFallback}>听</Text>
                      )}
                    </View>
                    <View style={styles.podcastCompactCopy}>
                      <Text style={styles.podcastCompactTitle} numberOfLines={1}>{article.title}</Text>
                      <Text style={styles.podcastCompactSubtitle} numberOfLines={1}>{podcastSubtitle}</Text>
                    </View>
                  </View>

                  <Pressable onPress={showMoreOptions} style={styles.podcastMoreButton} accessibilityLabel="更多选项">
                    <Text style={styles.podcastMoreButtonText}>•••</Text>
                  </Pressable>
                </View>

                {renderPodcastTranscriptStage()}
              </>
            ) : (
              <View style={styles.podcastHeroBlock}>
                <View style={styles.heroSection}>
                  <View style={[styles.cover, styles.podcastHeroCover]}>
                    {article.imageUrl ? (
                      <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
                    ) : (
                      <Text style={styles.coverFallback}>听</Text>
                    )}
                  </View>
                </View>

                <View style={styles.podcastMetaRow}>
                  <View style={styles.podcastMetaCopy}>
                    <Text style={styles.podcastDateLabel}>{podcastEyebrow}</Text>
                    <Text style={styles.podcastHeroTitle}>{article.title}</Text>
                    <Text style={styles.podcastHeroSubtitle}>{podcastSubtitle}</Text>
                  </View>

                  <Pressable onPress={showMoreOptions} style={styles.podcastMoreButton} accessibilityLabel="更多选项">
                    <Text style={styles.podcastMoreButtonText}>•••</Text>
                  </Pressable>
                </View>

                <View style={styles.podcastHeroSpacer} />
              </View>
            )}
          </View>

          <View style={styles.podcastBottomDeck}>
            <View style={styles.podcastProgressBlock}>
              <ProgressBar
                progress={articleProgress}
                isIntensive={false}
                trackColor="rgba(255,255,255,0.16)"
                fillColor="#f3e8ee"
                knobColor="#ffffff"
              />
              <View style={styles.podcastTimeRow}>
                <Text style={styles.podcastTimeLabel}>{formatTime(progressMs)}</Text>
                <Text style={styles.podcastTimeLabel}>-{formatTime(Math.max(0, articleDurationMs - progressMs))}</Text>
              </View>
              {playbackErrorMessage ? (
                <Text style={styles.podcastPlaybackError}>{playbackErrorMessage}</Text>
              ) : null}
            </View>

            <View style={styles.podcastControlsRow}>
              <Pressable onPress={showSpeedOptions} style={styles.podcastSpeedButton}>
                <Text style={styles.podcastSpeedText}>{playbackRate}x</Text>
              </Pressable>

              <PodcastSkipButton seconds={15} direction="back" onPress={() => onSeekBy(-15000)} />

              <Pressable onPress={onTogglePlayback} style={styles.podcastPlayButton}>
                {isPlaying ? <Text style={styles.podcastPauseGlyph}>||</Text> : <Text style={styles.podcastPlayGlyph}>▶</Text>}
              </Pressable>

              <PodcastSkipButton seconds={30} direction="forward" onPress={() => onSeekBy(30000)} />

              <Pressable onPress={showMoreOptions} style={styles.podcastAuxControlButton}>
                <Text style={styles.podcastAuxControlText}>•••</Text>
              </Pressable>
            </View>

            {isPodcastTranscriptVisible ? (
              <View style={styles.podcastSubtitleDock}>
                <SubtitleModeSwitch subtitleMode={subtitleMode} setSubtitleMode={setSubtitleMode} tone="dark" />
              </View>
            ) : null}

            <View style={styles.podcastUtilityRow}>
              <Pressable
                onPress={() => setIsPodcastTranscriptVisible((previous) => !previous)}
                style={[styles.podcastUtilityButton, isPodcastTranscriptVisible ? styles.podcastUtilityButtonActive : null]}
                accessibilityRole="button"
                accessibilityLabel={isPodcastTranscriptVisible ? '隐藏字幕' : '显示字幕'}
              >
                <CaptionsIcon active={isPodcastTranscriptVisible} tone="dark" />
              </Pressable>

              <View style={styles.podcastUtilityButton}>
                <BroadcastIcon />
              </View>

              <Pressable onPress={showMoreOptions} style={styles.podcastUtilityButton} accessibilityLabel="播放列表与更多选项">
                <QueueIcon />
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Top Handle */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={20} style={styles.topChevronDrag}>
            <View style={styles.dragHandle} />
          </Pressable>
        </View>

        {/* Hero Cover Art */}
        <View style={styles.heroSection}>
          <View style={[styles.cover, isPlaying ? styles.coverPlaying : styles.coverPaused]}>
            {article.imageUrl ? (
              <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
            ) : (
              <Text style={styles.coverFallback}>听</Text>
            )}
          </View>
        </View>

        {/* Main Player Area - Left Aligned exactly with cover */}
        <View style={styles.playerSection}>

          {/* Metadata */}
          <View style={styles.metadataView}>
            <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
            <Text style={styles.seriesLabel} numberOfLines={1}>
              {article.topic} {article.series ? `— ${article.series}` : ''}
              {isIntensive && (
                <Text style={styles.modeHighlight}> · 精听第 {currentSentenceIndex + 1} 句</Text>
              )}
            </Text>
          </View>

          {/* Scrubber */}
          <View style={styles.scrubberView}>
            <ProgressBar progress={sentenceProgress} isIntensive />
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{formatTime(Math.max(0, progressMs - sentenceStartMs))}</Text>
              <Text style={styles.timeLabel}>-{formatTime(Math.max(0, sentenceDurationMs - (progressMs - sentenceStartMs)))}</Text>
            </View>
            {playbackErrorMessage ? (
              <Text style={styles.playbackError}>{playbackErrorMessage}</Text>
            ) : null}
          </View>

          {/* Primary Controls Row */}
          <View style={styles.controlsRow}>
            <Pressable onPress={() => onJumpSentence('prev')} style={styles.subCtrlWrapper}>
              <Text style={styles.subCtrlGlyph}>|‹</Text>
            </Pressable>

            <Pressable onPress={onTogglePlayback} style={styles.playPauseWrap}>
              <View style={styles.playPauseCircle}>
                  {isPlaying ? <Text style={styles.pauseGlyph}>||</Text> : <Text style={styles.playGlyph}>▶</Text>}
              </View>
            </Pressable>

            <Pressable onPress={() => onJumpSentence('next')} style={styles.subCtrlWrapper}>
              <Text style={styles.subCtrlGlyph}>›|</Text>
            </Pressable>
          </View>

          {/* Bottom Tool Row */}
          <View style={styles.toolsRow}>
            <Pressable onPress={showSpeedOptions} style={styles.toolBtn}>
              <Text style={[styles.toolBtnText, playbackRate !== 1 ? styles.toolBtnTextActive : null]}>
                {playbackRate}x
              </Text>
            </Pressable>

            <View style={styles.toolsCenterSpacer} />

            <Pressable onPress={showMoreOptions} style={styles.toolBtn}>
              <Text style={styles.toolBtnDots}>•••</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.transcriptHeader}>
          <Text style={styles.transcriptTitle}>转录稿</Text>
          <SubtitleModeSwitch subtitleMode={subtitleMode} setSubtitleMode={setSubtitleMode} />
        </View>

        {renderTranscriptList(onPlaySentence)}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  podcastSafeArea: {
    flex: 1,
    backgroundColor: '#504d56',
  },
  podcastBackdrop: {
    flex: 1,
    backgroundColor: '#56535d',
    overflow: 'hidden',
  },
  podcastBackdropGlowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '44%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  podcastBackdropGlowBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    backgroundColor: 'rgba(37,24,31,0.38)',
  },
  screen: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  content: {
    paddingBottom: 80,
  },
  topBar: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  topChevronDrag: {
    width: 60,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#d1d1d6',
    borderRadius: 3,
  },
  podcastDragHandle: {
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateTitle: { fontSize: 20, fontWeight: '600' },
  stateBody: { color: '#8e8e93', marginTop: 8 },

  heroSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  cover: {
    width: coverSize,
    height: coverSize,
    borderRadius: 16, // Apple standard slight roundness
    backgroundColor: '#f2f2f7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
    overflow: 'hidden',
  },
  coverPlaying: {
    transform: [{ scale: 1 }],
  },
  coverPaused: {
    transform: [{ scale: 0.85 }], // Deep shrink just like Apple Music/Podcasts
    shadowOpacity: 0.0,
  },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { fontSize: 60, color: '#c7c7cc', fontWeight: '700', alignSelf:'center', marginTop:'35%' },

  playerSection: {
    paddingHorizontal: CONTENT_PADDING,
  },
  podcastBody: {
    flex: 1,
    paddingHorizontal: 28,
  },
  podcastHeroBlock: {
    flex: 1,
  },
  podcastHeroCover: {
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  podcastMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 4,
  },
  podcastMetaCopy: {
    flex: 1,
  },
  podcastDateLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  podcastHeroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 31,
  },
  podcastHeroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 8,
  },
  podcastHeroSpacer: {
    flex: 1,
  },
  podcastCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
    paddingTop: 8,
  },
  podcastCompactMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  podcastCompactCover: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  podcastCompactFallback: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 28,
    fontWeight: '700',
    alignSelf: 'center',
    marginTop: 20,
  },
  podcastCompactCopy: {
    flex: 1,
  },
  podcastCompactTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  podcastCompactSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 16,
    lineHeight: 21,
    marginTop: 6,
  },
  podcastMoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastMoreButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  podcastTranscriptViewport: {
    flex: 1,
  },
  podcastTranscriptContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  podcastTranscriptEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podcastTranscriptEmpty: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 16,
  },
  podcastSentenceRow: {
    paddingVertical: 14,
  },
  podcastSentencePrimary: {
    color: '#ffffff',
    fontFamily: 'Georgia',
    fontSize: 27,
    lineHeight: 41,
    fontWeight: '700',
  },
  podcastSentencePrimaryActive: {
    opacity: 1,
  },
  podcastSentenceSecondary: {
    color: 'rgba(255,255,255,0.84)',
    fontFamily: 'Georgia',
    fontSize: 19,
    lineHeight: 29,
  },
  podcastSentenceSecondaryActive: {
    opacity: 0.76,
  },
  podcastSentenceSecondarySpacing: {
    marginTop: 8,
  },
  podcastSentenceInactive: {
    opacity: 0.18,
  },
  podcastBottomDeck: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 8,
  },
  podcastProgressBlock: {
    marginBottom: 20,
  },
  podcastTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  podcastTimeLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  podcastPlaybackError: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  podcastControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  podcastSpeedButton: {
    minWidth: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  podcastSpeedText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  podcastSkipButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastSkipCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastSkipNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  podcastSkipArrow: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  podcastPlayButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastPlayGlyph: {
    color: '#2f2931',
    fontSize: 34,
    marginLeft: 5,
  },
  podcastPauseGlyph: {
    color: '#2f2931',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  podcastAuxControlButton: {
    minWidth: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  podcastAuxControlText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  podcastSubtitleDock: {
    alignItems: 'center',
    marginTop: 18,
  },
  podcastUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 54,
  },
  podcastUtilityButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastUtilityButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  queueIcon: {
    width: 20,
    gap: 3,
  },
  queueIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  queueIconDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  queueIconLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  broadcastIcon: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  broadcastRingOuter: {
    position: 'absolute',
    bottom: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
    opacity: 0.4,
  },
  broadcastRingInner: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    opacity: 0.7,
  },
  broadcastBase: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginBottom: 1,
  },

  metadataView: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    lineHeight: 28,
    marginBottom: 4,
  },
  seriesLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#af52de', // Purple-ish iOS Podcasts brand color
  },
  modeHighlight: {
    color: '#007aff',
    fontWeight: '600',
  },

  scrubberView: {
    marginBottom: 32,
  },
  progressTrack: {
    height: 3, // Thinner Apple-style scrubber
    backgroundColor: '#e5e5ea',
    borderRadius: 1.5,
    position: 'relative',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressKnob: {
    position: 'absolute',
    top: -3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginLeft: -4.5,
    backgroundColor: '#000000', // Solid simple knob
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    opacity: 0.8,
  },
  playbackError: {
    color: '#d70015',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  playPauseWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#f2f2f7', // Solid minimal grey background
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    fontSize: 32,
    color: '#000000',
    marginLeft: 6, // Optical centering for play
  },
  pauseGlyph: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },
  subCtrlWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCtrlGlyph: {
    fontSize: 26,
    fontWeight: '400',
    color: '#000000',
  },

  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 40,
  },
  toolsCenterSpacer: {
    flex: 1,
  },
  toolBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  captionsToggle: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
  },
  captionsToggleActive: {
    backgroundColor: '#eef5ff',
  },
  captionsIcon: {
    width: 24,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  captionsIconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  captionsIconLine: {
    borderRadius: 1,
    height: 2,
  },
  toolBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1a6',
  },
  toolBtnTextActive: {
    color: '#007aff',
  },
  toolBtnDots: {
    fontSize: 20,
    fontWeight: '700',
    color: '#a1a1a6',
    letterSpacing: 2,
  },
  podcastTranscriptPanel: {
    backgroundColor: '#f7f7fa',
    borderRadius: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  podcastTranscriptHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  podcastTranscriptTitle: {
    color: '#1c1c1e',
    fontSize: 17,
    fontWeight: '700',
  },
  subtitleModeSwitch: {
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
  },
  subtitleModeSwitchDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  subtitleModeChip: {
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  subtitleModeChipActive: {
    backgroundColor: '#ffffff',
  },
  subtitleModeChipActiveDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  subtitleModeChipText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitleModeChipTextDark: {
    color: 'rgba(255,255,255,0.65)',
  },
  subtitleModeChipTextActive: {
    color: '#1c1c1e',
  },
  subtitleModeChipTextActiveDark: {
    color: '#ffffff',
  },

  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CONTENT_PADDING,
    marginBottom: 16,
  },
  transcriptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },

  transcriptList: {
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: 60,
  },
  transcriptEmpty: {
    color: '#8e8e93',
    fontSize: 14,
    paddingVertical: 12,
  },
  sentenceRow: {
    paddingVertical: 14,
  },
  // Apple Podcasts transcript style is huge and bold for active
  transcriptPrimary: {
    fontSize: 20,
    lineHeight: 28,
    color: '#000000',
    fontWeight: '700',
    opacity: 0.3, // Dimmed until active
  },
  transcriptPrimaryActive: {
    opacity: 1, // Full opacity when speaking
  },
  transcriptSecondary: {
    fontSize: 16,
    lineHeight: 22,
    color: '#a1a1a6',
    fontWeight: '500',
    opacity: 0.5,
  },
  transcriptSecondaryActive: {
    opacity: 1,
    color: '#8e8e93',
  },
});
