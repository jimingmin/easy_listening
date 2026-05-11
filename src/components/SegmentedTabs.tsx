import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tab, active ? styles.tabActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderColor: 'rgba(148,163,184,0.28)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    gap: 4
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  label: {
    color: '#64748b',
    fontWeight: '800'
  },
  labelActive: {
    color: '#f97316'
  }
});
