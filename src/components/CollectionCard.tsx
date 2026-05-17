import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ResourceCollection } from '../models/article';

export function CollectionCard({ collection }: { collection: ResourceCollection }) {
  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {collection.coverImage ? (
          <Image source={{ uri: collection.coverImage }} style={styles.coverImage} />
        ) : (
          <Text style={styles.coverFallback}>集</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{collection.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {collection.articleCount} 篇{collection.lastUpdatedLabel ? ` · ${collection.lastUpdatedLabel}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
    gap: 8,
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    color: '#8e8e93',
    fontSize: 30,
    fontWeight: '700',
  },
  body: {
    gap: 2,
  },
  title: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  meta: {
    color: '#8e8e93',
    fontSize: 13,
  },
});
