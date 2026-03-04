import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';

interface TopNavProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function TopNav({ title, rightContent }: TopNavProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || 'Team Chat'}</Text>
      <View style={styles.rightSection}>
        {rightContent || (
          <>
            <Pressable style={styles.actionButton}>
              <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.actionButton}>
              <MaterialIcons name="more-vert" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));