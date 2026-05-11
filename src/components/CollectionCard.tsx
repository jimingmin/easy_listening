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
        <Text style={styles.eyebrow}>合集</Text>
        <Text style={styles.title}>{collection.title}</Text>
        <Text style={styles.description}>{collection.description}</Text>
      </View>
      <Text style={styles.meta}>
        {collection.articleCount} 篇
        {collection.lastUpdatedLabel ? ` · ${collection.lastUpdatedLabel}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 270,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 14,
    gap: 12,
    marginRight: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2
  },
  cover: {
    height: 116,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  coverFallback: {
    color: '#fb923c',
    fontSize: 30,
    fontWeight: '900'
  },
  body: {
    gap: 7
  },
  eyebrow: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '800'
  },
  title: {
    color: '#fff8ef',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800'
  },
  description: {
    color: '#d3dce3',
    fontSize: 14,
    lineHeight: 20
  },
  meta: {
    color: '#8aa0b2',
    fontSize: 13
  }
});
