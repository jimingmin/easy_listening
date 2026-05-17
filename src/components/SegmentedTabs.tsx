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
    backgroundColor: '#e5e5ea',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    minHeight: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  },
  label: {
    color: '#000000',
    fontWeight: '500',
    fontSize: 13,
  },
  labelActive: {
    color: '#000000',
    fontWeight: '600'
  }
});
