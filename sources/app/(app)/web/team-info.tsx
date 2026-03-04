import * as React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';

interface Team {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  stats: {
    tasks: number;
    messages: number;
    commits: number;
  };
}

interface Evolution {
  version: string;
  date: string;
  changes: string[];
}

const mockTeams: Team[] = [
  { id: 'team-1', name: 'My Startup', avatar: 'https://i.pravatar.cc/150?u=team-1', memberCount: 5, stats: { tasks: 24, messages: 128, commits: 47 } },
  { id: 'team-2', name: 'Client Project', avatar: 'https://i.pravatar.cc/150?u=team-2', memberCount: 3, stats: { tasks: 12, messages: 64, commits: 23 } },
];

const mockEvolution: Evolution = {
  version: 'v20303',
  date: '2026-03-04',
  changes: [
    'Web UI with sidebar navigation',
    'Team Chat with agent integration',
    'Device pairing with QR codes',
    'Permission Inbox for agent requests',
  ],
};

function Sidebar() {
  const { theme } = useUnistyles();
  return (
    <View style={{ width: 260, height: '100%', backgroundColor: theme.colors.groupped.background, borderRightWidth: 1, borderRightColor: theme.colors.groupped.border }}>
      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Happy</Text>
      </View>
      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/team-info')} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: theme.colors.groupped.accent + '20' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.groupped.accent, fontFamily: 'Outfit' }}>Teams</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/web/devices')} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Devices</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ height: 1, backgroundColor: theme.colors.groupped.border }} />
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/settings')}>
          <Text style={{ fontSize: 14, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeamCard({ team }: { team: Team }) {
  const { theme } = useUnistyles();
  return (
    <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.groupped.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image source={{ uri: team.avatar }} style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{team.name}</Text>
          <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>{team.memberCount} members</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.groupped.border }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{team.stats.tasks}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Tasks</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{team.stats.messages}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Messages</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>{team.stats.commits}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>Commits</Text>
        </View>
      </View>
    </View>
  );
}

function EvolutionCard({ evolution }: { evolution: Evolution }) {
  const { theme } = useUnistyles();
  return (
    <View style={{ backgroundColor: theme.colors.groupped.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.groupped.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Evolution</Text>
        <View style={{ backgroundColor: theme.colors.groupped.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ fontSize: 12, color: theme.colors.groupped.accent, fontWeight: '600', fontFamily: 'Outfit' }}>{evolution.version}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: theme.colors.groupped.caption, fontFamily: 'Outfit', marginBottom: 12 }}>{evolution.date}</Text>
      {evolution.changes.map((change, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: theme.colors.groupped.accent, marginRight: 8 }}>•</Text>
          <Text style={{ fontSize: 13, color: theme.colors.groupped.text, fontFamily: 'Outfit', flex: 1 }}>{change}</Text>
        </View>
      ))}
    </View>
  );
}

function MainContent() {
  const { theme } = useUnistyles();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: theme.colors.groupped.background, borderBottomWidth: 1, borderBottomColor: theme.colors.groupped.border }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit' }}>Teams & Evolution</Text>
        <Pressable style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.groupped.accent, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Outfit', fontSize: 12 }}>+ New Team</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.groupped.page, padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.groupped.text, fontFamily: 'Outfit', marginBottom: 16 }}>Your Teams</Text>
        {mockTeams.map((team) => <TeamCard key={team.id} team={team} />)}
        <View style={{ marginTop: 24 }}>
          <EvolutionCard evolution={mockEvolution} />
        </View>
      </ScrollView>
    </View>
  );
}

export default function TeamInfoScreen() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Team Info is only available on web</Text></View>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Sidebar />
      <MainContent />
    </View>
  );
}
