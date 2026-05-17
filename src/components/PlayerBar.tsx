import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type DimensionValue, Platform } from 'react-native';
import type { ArticleDetail, PlaybackMode, SubtitleMode } from '../models/article';

interface PlayerBarProps {
  article: ArticleDetail;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  subtitleMode: SubtitleMode;
  playbackRate: number;
  progressMs: number;
  isSentenceLooping: boolean;
  currentSentenceIndex: number;
  onTogglePlayback: () => void;
  onChangePlaybackMode: (mode: PlaybackMode) => void;
  onChangeSubtitleMode: (mode: SubtitleMode) => void;
  onChangePlaybackRate: (rate: number) => void;
  onToggleSentenceLoop: () => void;
  onJumpSentence: (direction: 'prev' | 'next') => void;
  onPress: () => void;
}

function formatTime(ms?: number | null): string {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function PlayerBar({
  article,
  isPlaying,
  playbackMode,
  progressMs,
  isSentenceLooping,
  currentSentenceIndex,
  onTogglePlayback,
  onJumpSentence,
  onPress
}: PlayerBarProps) {
  const currentSentence = article.sentences[currentSentenceIndex];
  const durationMs =
    article.durationMs ??
    article.sentences[article.sentences.length - 1]?.endMs ??
    0;

  const isIntensive = playbackMode === 'sentence';

  let progressPercent: DimensionValue = '0%';
  if (isIntensive && currentSentence) {
     const sentenceStartMs = currentSentence.startMs ?? 0;
     const sentenceDurationMs = (currentSentence.endMs ?? 0) - sentenceStartMs;
     if (sentenceDurationMs > 0) {
        progressPercent = `${Math.min(100, Math.max(0, ((progressMs - sentenceStartMs) / sentenceDurationMs) * 100))}%`;
     }
  } else if (durationMs > 0) {
     progressPercent = `${Math.min(100, Math.max(0, (progressMs / durationMs) * 100))}%`;
  }

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      {/* Top very thin progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressPercent, backgroundColor: isIntensive ? '#007aff' : '#000000' }]} />
      </View>

      <View style={styles.contentRow}>
        <View style={styles.cover}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
          ) : (
            <Text style={styles.coverFallback}>听</Text>
          )}
        </View>

        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {article.title}
          </Text>
          <Text numberOfLines={1} style={styles.caption}>
            {isIntensive
              ? `精听 · 第 ${currentSentenceIndex + 1} 句${isSentenceLooping ? ' · 循环' : ''}`
              : `泛听 · ${formatTime(progressMs)}`}
          </Text>
        </View>

        <View style={styles.controlsBlock}>
          <Pressable onPress={onTogglePlayback} style={styles.actionButton} hitSlop={15}>
             {isPlaying ? <Text style={styles.pauseIcon}>||</Text> : <Text style={styles.playIcon}>▶</Text>}
          </Pressable>
          <Pressable onPress={() => onJumpSentence('next')} style={styles.actionButton} hitSlop={15}>
             <Text style={styles.nextIcon}>›|</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#f2f2f7',
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    color: '#8e8e93',
    fontSize: 18,
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  caption: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '400',
  },
  controlsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#000000',
  },
  pauseIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1,
  },
  nextIcon: {
    fontSize: 22,
    color: '#000000',
  },
});
