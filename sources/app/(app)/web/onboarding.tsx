/**
 * W10 - Web Onboarding
 * 3-step feature cards with Get Started CTA
 */

import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_GREEN = '#22C55E';

interface OnboardingStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: 'people',
    title: 'Build Your Legion',
    description: 'Create AI agents that work together as a team. Each agent specializes in different tasks—from code review to testing.',
    color: '#22C55E',
  },
  {
    icon: 'git-branch',
    title: 'Ship Faster',
    description: 'Your agents handle the heavy lifting: write code, run tests, review PRs, and deploy—all in parallel.',
    color: '#3B82F6',
  },
  {
    icon: 'stats-chart',
    title: 'Track Progress',
    description: 'Monitor your team\'s performance with real-time stats, cost tracking, and detailed activity logs.',
    color: '#8B5CF6',
  },
];

function OnboardingCard({ step, index }: { step: OnboardingStep; index: number }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minWidth: 280,
      }}
    >
      {/* Step Number */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${step.color}15`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: step.color, fontFamily: 'Outfit' }}>
          {index + 1}
        </Text>
      </View>

      {/* Icon */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: `${step.color}10`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Ionicons name={step.icon} size={28} color={step.color} />
      </View>

      {/* Title */}
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Outfit', marginBottom: 12 }}>
        {step.title}
      </Text>

      {/* Description */}
      <Text style={{ fontSize: 15, color: '#6B7280', fontFamily: 'Outfit', lineHeight: 24 }}>
        {step.description}
      </Text>
    </View>
  );
}

export default function WebOnboardingScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    router.replace('/web/home');
  };

  const handleSkip = () => {
    router.replace('/web/home');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View
          style={{
            padding: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
            Happy
          </Text>
          <Pressable onPress={handleSkip}>
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Hero Section */}
        <View style={{ padding: 24, alignItems: 'center', marginTop: 32 }}>
          <Text
            style={{
              fontSize: 40,
              fontWeight: '700',
              color: '#111827',
              fontFamily: 'Outfit',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Welcome to Happy
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: '#6B7280',
              fontFamily: 'Outfit',
              textAlign: 'center',
              maxWidth: 560,
              lineHeight: 28,
            }}
          >
            Your AI-powered development team. Build faster, ship confidently, and scale your productivity.
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={{ padding: 24, marginTop: 32 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {steps.map((step, index) => (
              <OnboardingCard key={step.title} step={step} index={index} />
            ))}
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 48,
            padding: 32,
            marginTop: 16,
          }}
        >
          {[
            { value: '10x', label: 'Faster Development' },
            { value: '80%', label: 'Less Context Switching' },
            { value: '24/7', label: 'Agent Availability' },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit', marginTop: 4 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ padding: 24, alignItems: 'center', marginTop: 16 }}>
          <Pressable
            onPress={handleGetStarted}
            style={{
              backgroundColor: ACCENT_GREEN,
              borderRadius: 12,
              paddingHorizontal: 48,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: ACCENT_GREEN,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 12 }} />
          </Pressable>

          <Pressable onPress={() => router.push('/web/login')} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>

        {/* Trust Indicators */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 32,
            padding: 24,
            marginTop: 32,
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark" size={20} color="#6B7280" />
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
              Secure by Default
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="lock-closed" size={20} color="#6B7280" />
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
              Encrypted
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="speedometer" size={20} color="#6B7280" />
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit' }}>
              Low Latency
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
