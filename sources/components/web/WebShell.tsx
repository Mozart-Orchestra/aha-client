import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet as UnistylesStyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAuth } from '@/auth/AuthContext';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { PermissionDrawer } from './PermissionDrawer';
import { t } from '@/text';

interface WebShellProps {
  children: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  rightPanelContent?: React.ReactNode;
  activeNavItem?: string;
}

export function WebShell({
  children,
  title,
  showSidebar = true,
  showRightPanel = false,
  rightPanelContent,
  activeNavItem = 'chat',
}: WebShellProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [isPermissionDrawerOpen, setIsPermissionDrawerOpen] = useState(false);

  // Only render web shell on web platform
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {showSidebar && (
        <Sidebar
          activeItem={activeNavItem}
          onPermissionsClick={() => setIsPermissionDrawerOpen(true)}
        />
      )}
      <View style={styles.mainContent}>
        <TopNav title={title} />
        <View style={styles.contentArea}>{children}</View>
      </View>
      {showRightPanel && (
        <View style={styles.rightPanel}>{rightPanelContent}</View>
      )}
      <PermissionDrawer
        isOpen={isPermissionDrawerOpen}
        onClose={() => setIsPermissionDrawerOpen(false)}
      />
    </View>
  );
}

const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  contentArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary || theme.colors.background,
  },
  rightPanel: {
    width: 300,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
}));
