import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
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
}

function Chip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
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
  subtitleMode,
  playbackRate,
  progressMs,
  isSentenceLooping,
  currentSentenceIndex,
  onTogglePlayback,
  onChangePlaybackMode,
  onChangeSubtitleMode,
  onChangePlaybackRate,
  onToggleSentenceLoop,
  onJumpSentence
}: PlayerBarProps) {
  const currentSentence = article.sentences[currentSentenceIndex];
  const durationMs =
    article.durationMs ??
    article.sentences[article.sentences.length - 1]?.endMs ??
    0;
  const progressPercent: DimensionValue = durationMs > 0
    ? `${Math.min(100, Math.max(0, (progressMs / durationMs) * 100))}%`
    : '0%';
  const speedOptions = [0.75, 1, 1.25, 1.5];

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressPercent }]} />
      </View>

      <View style={styles.headerRow}>
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
            {playbackMode === 'full'
              ? `播客泛听 · ${formatTime(progressMs)} / ${formatTime(durationMs)}`
              : `逐句精听 · 第 ${currentSentenceIndex + 1} 句${isSentenceLooping ? ' · 循环' : ''}`}
          </Text>
        </View>
        <Pressable onPress={onTogglePlayback} style={styles.playButton}>
          <Text style={styles.playLabel}>{isPlaying ? '暂停' : '播放'}</Text>
        </Pressable>
      </View>

      <Text numberOfLines={2} style={styles.preview}>
        {subtitleMode === 'zh'
          ? (currentSentence?.translation ?? '暂无中文翻译')
          : currentSentence?.text ?? '准备开始播放'}
      </Text>

      <View style={styles.controlsRow}>
        <Pressable onPress={() => onJumpSentence('prev')} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>上一句</Text>
        </Pressable>
        <Pressable onPress={() => onJumpSentence('next')} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>下一句</Text>
        </Pressable>
        <Pressable onPress={onToggleSentenceLoop} style={[styles.smallButton, isSentenceLooping ? styles.loopActive : null]}>
          <Text style={[styles.smallButtonText, isSentenceLooping ? styles.loopActiveText : null]}>
            循环
          </Text>
        </Pressable>
      </View>

      <View style={styles.chipsGroup}>
        <Chip label="泛听" active={playbackMode === 'full'} onPress={() => onChangePlaybackMode('full')} />
        <Chip label="精听" active={playbackMode === 'sentence'} onPress={() => onChangePlaybackMode('sentence')} />
        <Chip label="英文" active={subtitleMode === 'en'} onPress={() => onChangeSubtitleMode('en')} />
        <Chip label="中文" active={subtitleMode === 'zh'} onPress={() => onChangeSubtitleMode('zh')} />
        <Chip label="双语" active={subtitleMode === 'both'} onPress={() => onChangeSubtitleMode('both')} />
        {speedOptions.map((rate) => (
          <Chip
            key={rate}
            label={`${rate}x`}
            active={playbackRate === rate}
            onPress={() => onChangePlaybackRate(rate)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(226,232,240,0.9)',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 4
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 999
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
    fontSize: 20,
    fontWeight: '900'
  },
  titleBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900'
  },
  caption: {
    color: '#64748b',
    fontSize: 13
  },
  playButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    minHeight: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playLabel: {
    color: '#ffffff',
    fontWeight: '900'
  },
  preview: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10
  },
  smallButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: 'center'
  },
  smallButtonText: {
    color: '#334155',
    fontWeight: '800'
  },
  loopActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0'
  },
  loopActiveText: {
    color: '#15803d'
  },
  chipsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa'
  },
  chipText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 12
  },
  chipTextActive: {
    color: '#ea580c'
  }
});
