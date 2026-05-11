import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ArticleMeta, PlaybackMode, ResourceCollection, TopicSummary } from '../models/article';
import { CollectionCard } from '../components/CollectionCard';
import { ResourceCard } from '../components/ResourceCard';
import { SegmentedTabs } from '../components/SegmentedTabs';

interface LibraryScreenProps {
  articles?: ArticleMeta[];
  collections?: ResourceCollection[];
  topics?: TopicSummary[];
  isLoading?: boolean;
  errorMessage?: string | null;
  apiBaseUrl?: string;
  onRetry?: () => void;
  onOpenArticle: (id: string) => void;
  onPlayArticle: (id: string, mode?: PlaybackMode) => void;
}

type LibraryTab = 'public' | 'collections';

export function LibraryScreen({
  articles = [],
  collections = [],
  topics = [],
  isLoading = false,
  errorMessage = null,
  apiBaseUrl = '',
  onRetry = () => {},
  onOpenArticle,
  onPlayArticle
}: LibraryScreenProps) {
  const [tab, setTab] = useState<LibraryTab>('public');
  const featuredTopics = topics.slice(0, 8);

  const renderLibraryState = () => {
    if (isLoading && articles.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>正在加载真实资源</Text>
          <Text style={styles.stateBody}>当前会从后端读取公开文章、合集和分类数据。</Text>
        </View>
      );
    }

    if (errorMessage && articles.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>资源接口暂时不可用</Text>
          <Text style={styles.stateBody}>{errorMessage}</Text>
          <Text style={styles.debugHint}>已尝试地址：{apiBaseUrl}</Text>
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryLabel}>重新加载</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  const stateCard = renderLibraryState();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Easy Listening Podcast</Text>
          <Text style={styles.title}>像听播客一样泛听，再逐句拆开精听</Text>
          <Text style={styles.subtitle}>
            复用“英语精听酱”的核心语料，优先提供播客式播放、中英双语字幕和逐句精听。
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{articles.length}</Text>
              <Text style={styles.heroStatLabel}>公开音频</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{collections.length}</Text>
              <Text style={styles.heroStatLabel}>合集</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>中英</Text>
              <Text style={styles.heroStatLabel}>字幕模式</Text>
            </View>
          </View>
        </View>

        {errorMessage && articles.length > 0 ? (
          <View style={styles.inlineNotice}>
            <Text style={styles.inlineNoticeText}>{errorMessage}</Text>
          </View>
        ) : null}

        <SegmentedTabs<LibraryTab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'public', label: '公开资源' },
            { value: 'collections', label: '合集' }
          ]}
        />

        {stateCard}

        {tab === 'public' ? (
          <View style={styles.section}>
            {featuredTopics.length > 0 ? (
              <View style={styles.topicBlock}>
                <Text style={styles.sectionTitle}>公开分类</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {featuredTopics.map((topic) => (
                    <View key={topic.name} style={styles.topicChip}>
                      <Text style={styles.topicName}>{topic.name}</Text>
                      <Text style={styles.topicCount}>{topic.count}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>公开资源</Text>
            <View style={styles.list}>
              {articles.map((article) => (
                <ResourceCard
                  key={article.id}
                  article={article}
                  onOpen={onOpenArticle}
                  onPlay={onPlayArticle}
                />
              ))}
            </View>
            {!isLoading && articles.length === 0 && !errorMessage ? (
              <Text style={styles.collectionHint}>当前后端还没有返回公开文章。</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>合集浏览</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </ScrollView>
            <Text style={styles.collectionHint}>
              目前合集数据来自后端真实 `series` 聚合结果，后续会继续补合集详情和顺序播放。
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f8fb'
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 180,
    gap: 20
  },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderColor: 'rgba(226,232,240,0.86)',
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2
  },
  eyebrow: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900'
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 23
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  heroStat: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  heroStatValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900'
  },
  heroStatLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  inlineNotice: {
    backgroundColor: '#fff6da',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  inlineNoticeText: {
    color: '#8a5b13',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600'
  },
  section: {
    gap: 14
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 21,
    fontWeight: '900'
  },
  topicBlock: {
    gap: 12
  },
  topicChip: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(226,232,240,0.9)',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    marginRight: 10,
    minWidth: 110
  },
  topicName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800'
  },
  topicCount: {
    color: '#7c8a96',
    fontSize: 12
  },
  list: {
    gap: 14
  },
  collectionHint: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20
  },
  stateCard: {
    backgroundColor: '#fffaf4',
    borderRadius: 22,
    padding: 18,
    gap: 10
  },
  stateTitle: {
    color: '#1d2731',
    fontSize: 18,
    fontWeight: '800'
  },
  stateBody: {
    color: '#4f5f6d',
    fontSize: 14,
    lineHeight: 21
  },
  debugHint: {
    color: '#7a5a2c',
    fontSize: 12,
    lineHeight: 18
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1d2731',
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  retryLabel: {
    color: '#fff8ef',
    fontWeight: '700'
  }
});
