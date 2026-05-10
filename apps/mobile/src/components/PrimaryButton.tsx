import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PrimaryButtonProps {
  label: string;
}

export function PrimaryButton({ label }: PrimaryButtonProps) {
  return (
    <Pressable style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#20262e',
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  label: {
    color: '#fffaf2',
    fontSize: 16,
    fontWeight: '700'
  }
});
