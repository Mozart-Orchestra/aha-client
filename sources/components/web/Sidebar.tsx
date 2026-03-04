import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { MaterialIcons } from '@expo/vector-icons';
import { t } from '@/text';

interface SidebarProps {
  activeItem: string;
  onPermissionsClick: () => void;
}

export function Sidebar({ activeItem, onPermissionsClick }: SidebarProps) {
  const { theme } = useUnistyles();

  const navItems = [
    { id: 'chat', label: 'Chat', icon: 'chat' as const },
    { id: 'board', label: 'Board', icon: 'dashboard' as const },
    { id: 'stats', label: 'Stats', icon: 'analytics' as const },
    { id: 'evolution', label: 'Evolution', icon: 'trending-up' as const },
  ];

  return (
    <View style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image
          source={theme.dark ? require('@/assets/images/logotype-light.png') : require('@/assets/images/logotype-dark.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.divider} />

      {/* Teams Section */}
      <View style={styles.teamsSection}>
        <Text style={styles.sectionLabel}>{t('web.sidebar.myTeams')}</Text>
        <View style={styles.teamItem}>
          <View style={styles.teamAvatar}>
            <Text style={styles.teamAvatarText}>M</Text>
          </View>
          <Text style={styles.teamName}>My Startup</Text>
        </View>
        <View style={[styles.teamItem, styles.teamInactive]}>
          <View style={[styles.teamAvatar, styles.teamAvatarInactive]}>
            <Text style={styles.teamAvatarText}>C</Text>
          </View>
          <Text style={[styles.teamName, styles.teamNameInactive]}>Client Project</Text>
        </View>
        <Pressable style={styles.newTeamButton}>
          <MaterialIcons name="add" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.newTeamText}>{t('web.sidebar.newTeam')}</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Quick Nav Section */}
      <View style={styles.navSection}>
        <Text style={styles.sectionLabel}>{t('web.sidebar.quickNav')}</Text>
        {navItems.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.navItem, activeItem === item.id && styles.navItemActive]}
          >
            <MaterialIcons
              name={item.icon}
              size={20}
              color={activeItem === item.id ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.navItemText,
                activeItem === item.id && styles.navItemTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.divider} />

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Pressable style={styles.bottomItem} onPress={onPermissionsClick}>
          <MaterialIcons name="notifications" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.bottomItemText}>{t('web.sidebar.permissions')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2</Text>
          </View>
        </Pressable>
        <Pressable style={styles.bottomItem}>
          <MaterialIcons name="settings" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.bottomItemText}>{t('web.sidebar.settings')}</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.bottomItem}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>A</Text>
          </View>
          <Text style={styles.bottomItemText}>Alex Chen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    width: 260,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    flexDirection: 'column',
  },
  logoSection: {
    padding: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 45,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  teamsSection: {
    padding: 16,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: theme.colors.textTertiary,
    marginBottom: 8,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
  },
  teamInactive: {
    backgroundColor: 'transparent',
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarInactive: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  teamAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  teamNameInactive: {
    color: theme.colors.textSecondary,
  },
  newTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  newTeamText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  navSection: {
    padding: 16,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingLeft: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  navItemText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  navItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    padding: 16,
    gap: 4,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingLeft: 12,
    borderRadius: 8,
  },
  bottomItemText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
}));
