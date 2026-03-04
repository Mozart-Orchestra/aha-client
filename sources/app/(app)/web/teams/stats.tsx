/**
 * R7 Team Stats Dashboard Web Page
 * Route: /web/teams/stats
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { TeamStatsDashboard } from '@/components/TeamStatsDashboard';
import { useLocalSearchParams } from 'expo-router';
import { useArtifacts } from '@/sync/storage';

export default function TeamStatsPage() {
  const { teamId } = useLocalSearchParams<{ teamId?: string }>();
  const artifacts = useArtifacts();

  const teams = React.useMemo(
    () => artifacts.filter((artifact) => artifact.type === 'team'),
    [artifacts]
  );
  const selectedTeamId = teamId || teams[0]?.id;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Team Statistics',
          headerShown: true,
        }}
      />
      {selectedTeamId ? <TeamStatsDashboard teamId={selectedTeamId} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
