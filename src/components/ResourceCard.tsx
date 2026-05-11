import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ArticleMeta, PlaybackMode } from '../models/article';

interface ResourceCardProps {
  article: ArticleMeta;
  onOpen: (id: string) => void;
  onPlay: (id: string, mode: PlaybackMode) => void;
}

export function ResourceCard({ article, onOpen, onPlay }: ResourceCardProps) {
  const statusLabel = article.processingStatus && article.processingStatus !== 'ready'
    ? ` · ${article.processingStatus}`
    : '';

  return (
    <Pressable onPress={() => onOpen(article.id)} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.cover}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles.coverImage} />
          ) : (
            <Text style={styles.coverFallback}>听</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <View style={styles.badges}>
            <Text style={styles.level}>{article.level}</Text>
            <Text style={styles.series}>{article.series ?? '公开资源'}</Text>
          </View>
          <Text style={styles.title}>{article.title}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{article.summaryText ?? article.topic}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {article.topic} · {article.sentenceCount} 句{statusLabel}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onPlay(article.id, 'sentence');
            }}
            style={styles.listenCta}
          >
            <Text style={styles.listenCtaText}>精听</Text>
          </Pressable>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onPlay(article.id, 'full');
            }}
            style={styles.playCta}
          >
            <Text style={styles.playCtaText}>泛听</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(226,232,240,0.9)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  topRow: {
    flexDirection: 'row',
    gap: 12
  },
  cover: {
    width: 74,
    height: 74,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  coverFallback: {
    color: '#f97316',
    fontSize: 24,
    fontWeight: '900'
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 7
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  level: {
    backgroundColor: '#fff7ed',
    color: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800'
  },
  series: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800'
  },
  summary: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  meta: {
    flex: 1,
    color: '#64748b',
    fontSize: 13
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  listenCta: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 12,
    justifyContent: 'center'
  },
  listenCtaText: {
    color: '#15803d',
    fontWeight: '800'
  },
  playCta: {
    backgroundColor: '#f97316',
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center'
  },
  playCtaText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
