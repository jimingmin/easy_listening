import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ArticleMeta, PlaybackMode } from '../models/article';

interface ResourceCardProps {
  article: ArticleMeta;
  onOpen: (id: string) => void;
  onPlay: (id: string, mode: PlaybackMode) => void;
}

function getDurationText(ms?: number | null): string {
  if (!ms || ms <= 0) return '';
  const mins = Math.ceil(ms / 60000);
  return `${mins} 分钟`;
}

export function ResourceCard({ article, onOpen, onPlay }: ResourceCardProps) {
  const statusLabel = article.processingStatus && article.processingStatus !== 'ready'
    ? ` · ${article.processingStatus}`
    : '';
  const durationText = getDurationText(article.durationMs);

  return (
    <Pressable onPress={() => onOpen(article.id)} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.dateLabel} numberOfLines={1}>
          {article.topic} {article.series ? `· ${article.series}` : ''}
        </Text>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.summary} numberOfLines={2}>
          {article.summaryText ?? article.topic}
        </Text>
        <View style={styles.footer}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onPlay(article.id, 'full');
            }}
            style={styles.playBtn}
            hitSlop={8}
          >
            <Text style={styles.playBtnIcon}>▶</Text>
          </Pressable>
          <Text style={styles.metaLabel}>
            {durationText ? `${durationText} · ` : ''}{article.sentenceCount} 句{statusLabel}
          </Text>
          <Text style={styles.level}>{article.level}</Text>
        </View>
      </View>
      <View style={styles.cover}>
        {article.imageUrl ? (
          <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
        ) : (
          <Text style={styles.coverFallback}>听</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
    gap: 16,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    color: '#8e8e93',
    fontSize: 20,
    fontWeight: '700',
  },
  dateLabel: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    color: '#000000',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  summary: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnIcon: {
    color: '#007aff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 2, // optical center for play triangle
  },
  level: {
    color: '#8e8e93',
    fontSize: 13,
  },
  metaLabel: {
    color: '#8e8e93',
    fontSize: 13,
  },
});
