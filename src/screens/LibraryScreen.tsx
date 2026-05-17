import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, SafeAreaView } from 'react-native';
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
          <Text style={styles.stateTitle}>Loading...</Text>
        </View>
      );
    }
    if (errorMessage && articles.length === 0) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Unavailable</Text>
          <Text style={styles.stateBody}>{errorMessage}</Text>
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  const stateCard = renderLibraryState();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.largeTitle}>现在就听</Text>
        </View>

        {errorMessage && articles.length > 0 ? (
          <View style={styles.inlineNotice}>
            <Text style={styles.inlineNoticeText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tabsWrapper}>
          <SegmentedTabs<LibraryTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'public', label: '最新内容' },
              { value: 'collections', label: '所有节目' }
            ]}
          />
        </View>

        {stateCard}

        {tab === 'public' ? (
          <View style={styles.section}>
            {featuredTopics.length > 0 ? (
              <View style={styles.topicBlock}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicScroll}>
                  {featuredTopics.map((topic) => (
                    <View key={topic.name} style={styles.topicChip}>
                      <Text style={styles.topicName}>{topic.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

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
              <Text style={styles.collectionHint}>暂无内容。</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionScroll}>
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </ScrollView>
            <Text style={styles.collectionHint}>
              可以在这里浏览所有节目合集。
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  content: {
    paddingBottom: 180,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  largeTitle: {
    color: '#000000',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tabsWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inlineNotice: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff6da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inlineNoticeText: {
    color: '#8a5b13',
    fontSize: 13,
    fontWeight: '600'
  },
  section: {
    paddingHorizontal: 20,
  },
  topicBlock: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  topicScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  topicChip: {
    backgroundColor: '#f2f2f7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topicName: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600'
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
  },
  collectionScroll: {
    paddingRight: 20,
  },
  collectionHint: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 24,
    textAlign: 'center'
  },
  stateCard: {
    padding: 20,
    alignItems: 'center',
    gap: 8
  },
  stateTitle: {
    color: '#8e8e93',
    fontSize: 15,
    fontWeight: '600'
  },
  stateBody: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#007aff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryLabel: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
