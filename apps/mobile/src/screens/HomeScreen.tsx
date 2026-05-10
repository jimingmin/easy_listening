import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { sampleArticlePreview } from '@easy-listening/shared';

export function HomeScreen() {
  return (
    <LinearGradient colors={['#f7efe2', '#f3f5ef', '#e9efe8']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Easy Listening</Text>
            <Text style={styles.title}>把英语精听练习，做成随手就能开始的移动体验</Text>
            <Text style={styles.subtitle}>
              第一版工程已就绪，接下来我们会优先打通 iOS 上的资源列表、文章详情与逐句播放。
            </Text>
          </View>

          <Image
            source={require('../../assets/seed/home/study-1.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.card}>
            <Text style={styles.cardLabel}>首批复用模型</Text>
            <Text style={styles.cardTitle}>{sampleArticlePreview.title}</Text>
            <Text style={styles.cardMeta}>
              {sampleArticlePreview.level} · {sampleArticlePreview.topic} · {sampleArticlePreview.sentenceCount} 句
            </Text>
            <Text style={styles.cardBody}>
              共享层已经预留文章、句子、练习分段等核心类型，后续可以直接对接旧项目 API。
            </Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="继续搭建 iOS 首页" />
            <PrimaryButton label="下一步接入文章 API" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20
  },
  hero: {
    gap: 12,
    paddingTop: 8
  },
  eyebrow: {
    color: '#6c5d45',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  title: {
    color: '#182028',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800'
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    backgroundColor: '#ddd7cb'
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 24,
    padding: 20,
    gap: 8
  },
  cardLabel: {
    color: '#8b6f3d',
    fontSize: 12,
    fontWeight: '700'
  },
  cardTitle: {
    color: '#1f2937',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800'
  },
  cardMeta: {
    color: '#5b6472',
    fontSize: 14
  },
  cardBody: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22
  },
  actions: {
    gap: 12
  }
});
