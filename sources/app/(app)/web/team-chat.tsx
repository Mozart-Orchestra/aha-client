import * as React from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useUnistyles } from 'react-native-unistyles';
import { router, useLocalSearchParams } from 'expo-router';

// Types
interface Team {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  teamStatus: 'healthy' | 'busy' | 'blocked';
}

interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline';
  type: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'agent';
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  role: string;
}

type ChatErrorType = 'network' | 'agent' | 'api-key' | null;

// Mock data (will be replaced with API calls)
const mockTeams: Team[] = [
  { id: 'team-1', name: 'My Startup', avatar: 'https://i.pravatar.cc/150?u=team-1', memberCount: 5, teamStatus: 'healthy' },
  { id: 'team-2', name: 'Client Project', avatar: 'https://i.pravatar.cc/150?u=team-2', memberCount: 3, teamStatus: 'busy' },
  { id: 'team-3', name: 'Personal', avatar: 'https://i.pravatar.cc/150?u=team-3', memberCount: 1, teamStatus: 'blocked' },
];

const mockAgents: Agent[] = [
  { id: 'agent-1', name: 'Code Reviewer', status: 'online', type: 'reviewer' },
  { id: 'agent-2', name: 'Test Writer', status: 'offline', type: 'tester' },
  { id: 'agent-3', name: 'Docs Helper', status: 'online', type: 'docs' },
];

const mockMembers: Member[] = [
  { id: 'user-1', name: 'Alex Chen', avatar: 'https://i.pravatar.cc/150?u=user-1', status: 'online', role: 'admin' },
  { id: 'user-2', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=user-2', status: 'away', role: 'member' },
  { id: 'user-3', name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/150?u=user-3', status: 'offline', role: 'member' },
];

// Sidebar Component
function Sidebar({ teams, activeTeamId }: { teams: Team[]; activeTeamId: string }) {
  const { theme } = useUnistyles();
  const statusColor = (status: Team['teamStatus']) =>
    status === 'healthy' ? '#22C55E' : status === 'busy' ? '#F59E0B' : '#EF4444';
  const statusLabel = (status: Team['teamStatus']) =>
    status === 'healthy' ? 'Healthy' : status === 'busy' ? 'Busy' : 'Blocked';

  return (
    <View style={{
      width: 260,
      height: '100%',
      backgroundColor: theme.colors.groupped.background,
      borderRightWidth: 1,
      borderRightColor: theme.colors.groupped.border,
    }}>
      {/* Logo */}
      <View style={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.groupped.text,
          fontFamily: 'Outfit',
        }}>
          Happy
        </Text>
      </View>

      <View style={{
        height: 1,
        backgroundColor: theme.colors.groupped.border,
      }} />

      {/* Teams */}
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        {teams.map((team) => (
          <Pressable
            key={team.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              borderRadius: 8,
              justifyContent: 'space-between',
              backgroundColor: team.id === activeTeamId ? theme.colors.groupped.accent + '20' : 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: team.avatar }}
                style={{ width: 32, height: 32, borderRadius: 8 }}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: theme.colors.groupped.text,
                  fontFamily: 'Outfit',
                }}>
                  {team.name}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.colors.groupped.caption,
                  fontFamily: 'Outfit',
                }}>
                  {team.memberCount} members
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: statusColor(team.teamStatus),
                }}
              />
              <Text style={{ fontSize: 11, color: theme.colors.groupped.caption, fontFamily: 'Outfit' }}>
                {statusLabel(team.teamStatus)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={{
        height: 1,
        backgroundColor: theme.colors.groupped.border,
      }} />

      {/* Quick Nav */}
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable
          onPress={() => router.push('/web/team-chat')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
            backgroundColor: theme.colors.groupped.accent + '20',
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: theme.colors.groupped.accent,
            fontFamily: 'Outfit',
          }}>
            Chat
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/web/devices')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          <Text style={{
            fontSize: 14,
            color: theme.colors.groupped.caption,
            fontFamily: 'Outfit',
          }}>
            Devices
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{
        height: 1,
        backgroundColor: theme.colors.groupped.border,
      }} />

      {/* Bottom */}
      <View style={{ padding: 16, paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.push('/web/settings')}>
          <Text style={{
            fontSize: 14,
            color: theme.colors.groupped.caption,
            fontFamily: 'Outfit',
          }}>
            Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Main Content Component
function ChatStateCard({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', fontFamily: 'Outfit' }}>
        {title}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: '#6B7280', fontFamily: 'Outfit' }}>
        {description}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={onAction}
          style={{
            backgroundColor: '#22C55E',
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
            {actionLabel}
          </Text>
        </Pressable>
        {secondaryLabel && onSecondary && (
          <Pressable
            onPress={onSecondary}
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', fontFamily: 'Outfit' }}>
              {secondaryLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MainContent({
  agents,
  errorType,
  forceEmpty,
}: {
  agents: Agent[];
  errorType: ChatErrorType;
  forceEmpty: boolean;
}) {
  const { theme } = useUnistyles();
  const [messages, setMessages] = React.useState<Message[]>(() => {
    if (forceEmpty) {
      return [];
    }

    return [
      {
        id: 'msg-1',
        senderId: 'user-1',
        senderName: 'Alex Chen',
        senderAvatar: 'https://i.pravatar.cc/150?u=user-1',
        content: 'Hey team, the new feature is ready for review!',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        type: 'text',
      },
      {
        id: 'msg-2',
        senderId: 'agent-1',
        senderName: 'Code Reviewer',
        senderAvatar: 'https://i.pravatar.cc/150?u=agent-1',
        content: 'I\'ve reviewed the PR. Overall looks good, but I found 3 minor issues...',
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        type: 'agent',
      },
    ];
  });
  const [inputText, setInputText] = React.useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      senderName: 'You',
      senderAvatar: 'https://i.pravatar.cc/150?u=me',
      content: inputText,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Topbar */}
      <View style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: theme.colors.groupped.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.groupped.border,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: theme.colors.groupped.text,
          fontFamily: 'Outfit',
        }}>
          My Startup
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {agents.filter(a => a.status === 'online').map(agent => (
            <View
              key={agent.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#4CAF50',
              }}
            />
          ))}
        </View>
      </View>

      {/* Agent Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 20,
        gap: 12,
        backgroundColor: theme.colors.groupped.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.groupped.border,
      }}>
        {agents.map((agent) => (
          <View
            key={agent.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.groupped.surface,
              borderRadius: 20,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: agent.status === 'online' ? '#4CAF50' : '#9E9E9E',
              }}
            />
            <Text style={{
              fontSize: 12,
              color: theme.colors.groupped.text,
              fontFamily: 'Outfit',
            }}>
              {agent.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{
          flex: 1,
          backgroundColor: theme.colors.groupped.page,
        }}
        contentContainerStyle={{ padding: 20 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {errorType === 'network' && (
          <ChatStateCard
            title="Network unavailable"
            description="无法连接到服务器。检查网络或服务状态后，点击重试。"
            actionLabel="Retry"
            onAction={() => router.replace('/web/team-chat')}
            secondaryLabel="Open Home"
            onSecondary={() => router.push('/web/home')}
          />
        )}

        {errorType === 'agent' && (
          <ChatStateCard
            title="Agent runtime is offline"
            description="当前没有可执行任务的在线Agent。你可以先到Board查看设备状态并恢复在线机器。"
            actionLabel="Open Board"
            onAction={() => router.push('/web/devices')}
            secondaryLabel="Retry Chat"
            onSecondary={() => router.replace('/web/team-chat')}
          />
        )}

        {errorType === 'api-key' && (
          <ChatStateCard
            title="API key required"
            description="检测到密钥未配置或失效。请先在设置中修复 API Key，再回来继续对话。"
            actionLabel="Open Settings"
            onAction={() => router.push('/web/settings')}
            secondaryLabel="Use Device Code"
            onSecondary={() => router.push('/restore/device-code')}
          />
        )}

        {!errorType && messages.length === 0 && (
          <ChatStateCard
            title="No messages yet"
            description="从一句自然语言开始：例如“把登录改成设备码+Google双入口，并给我生成任务拆解”。"
            actionLabel="Open Board"
            onAction={() => router.push('/web/devices')}
            secondaryLabel="New Team"
            onSecondary={() => router.push('/teams/new-wizard')}
          />
        )}

        {!errorType && messages.map((message) => (
          <View
            key={message.id}
            style={{
              flexDirection: 'row',
              marginBottom: 16,
              alignSelf: message.senderId === 'me' ? 'flex-end' : 'flex-start',
            }}
          >
            {message.senderId !== 'me' && (
              <Image
                source={{ uri: message.senderAvatar }}
                style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
              />
            )}
            <View
              style={{
                maxWidth: '70%',
                padding: 12,
                borderRadius: 12,
                backgroundColor: message.type === 'agent'
                  ? theme.colors.groupped.accent + '15'
                  : message.senderId === 'me'
                  ? theme.colors.groupped.accent
                  : theme.colors.groupped.surface,
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: message.senderId === 'me' ? '#fff' : theme.colors.groupped.text,
                fontFamily: 'Outfit',
                marginBottom: 4,
              }}>
                {message.senderName}
              </Text>
              <Text style={{
                fontSize: 14,
                color: message.senderId === 'me' ? '#fff' : theme.colors.groupped.text,
                fontFamily: 'Outfit',
              }}>
                {message.content}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 20,
        gap: 12,
        backgroundColor: theme.colors.groupped.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.groupped.border,
      }}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.groupped.caption}
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: theme.colors.groupped.surface,
            borderRadius: 8,
            color: theme.colors.groupped.text,
            fontFamily: 'Outfit',
            fontSize: 14,
          }}
          onSubmitEditing={sendMessage}
        />
        <Pressable
          onPress={sendMessage}
          style={{
            padding: 12,
            backgroundColor: theme.colors.groupped.accent,
            borderRadius: 8,
          }}
        >
          <Text style={{
            color: '#fff',
            fontWeight: '600',
            fontFamily: 'Outfit',
          }}>
            Send
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Right Panel Component
function RightPanel({ members }: { members: Member[] }) {
  const { theme } = useUnistyles();

  return (
    <View style={{
      width: 300,
      height: '100%',
      backgroundColor: theme.colors.groupped.background,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.groupped.border,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.groupped.border,
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: theme.colors.groupped.text,
          fontFamily: 'Outfit',
        }}>
          Team Members
        </Text>
        <Text style={{
          fontSize: 12,
          color: theme.colors.groupped.caption,
          fontFamily: 'Outfit',
        }}>
          {members.length}
        </Text>
      </View>

      {/* Member List */}
      <ScrollView style={{ padding: 8 }}>
        {members.map((member) => (
          <View
            key={member.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              borderRadius: 8,
            }}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: member.avatar }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor:
                    member.status === 'online' ? '#4CAF50' :
                    member.status === 'away' ? '#FFC107' : '#9E9E9E',
                  borderWidth: 2,
                  borderColor: theme.colors.groupped.background,
                }}
              />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.colors.groupped.text,
                fontFamily: 'Outfit',
              }}>
                {member.name}
              </Text>
              <Text style={{
                fontSize: 12,
                color: theme.colors.groupped.caption,
                fontFamily: 'Outfit',
                textTransform: 'capitalize',
              }}>
                {member.role}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// Main Screen Component
export default function TeamChatScreen() {
  const insets = useSafeAreaInsets();
  const { error, empty } = useLocalSearchParams<{ error?: string; empty?: string }>();

  const errorType: ChatErrorType =
    error === 'network' || error === 'agent' || error === 'api-key'
      ? error
      : null;
  const forceEmpty = empty === '1' || empty === 'true';

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Team Chat is only available on web</Text>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1,
      flexDirection: 'row',
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }}>
      <Sidebar teams={mockTeams} activeTeamId="team-1" />
      <MainContent agents={mockAgents} errorType={errorType} forceEmpty={forceEmpty} />
      <RightPanel members={mockMembers} />
    </View>
  );
}
