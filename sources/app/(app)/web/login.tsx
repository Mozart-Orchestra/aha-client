/**
 * W6 - Web Login & Device Code Auth
 * Green brand background with device code authentication
 */

import * as React from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_GREEN = '#22C55E';
const ACCENT_GREEN_DARK = '#16A34A';

export default function WebLoginScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [deviceCode, setDeviceCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    if (deviceCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/web/home');
    }, 1500);
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: ACCENT_GREEN,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }}>
      {/* Header */}
      <View style={{ padding: 24, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit' }}>
          Happy
        </Text>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 40,
          width: '100%',
          maxWidth: 480,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 8,
        }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: ACCENT_GREEN,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="happy-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', fontFamily: 'Outfit' }}>
              Welcome back
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', fontFamily: 'Outfit', marginTop: 8 }}>
              Enter your device code to continue
            </Text>
          </View>

          {/* Device Code Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', fontFamily: 'Outfit', marginBottom: 8 }}>
              Device Code
            </Text>
            <TextInput
              value={deviceCode}
              onChangeText={(text) => {
                setDeviceCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                setError(null);
              }}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              style={{
                fontSize: 32,
                fontWeight: '600',
                color: '#111827',
                fontFamily: 'Outfit',
                textAlign: 'center',
                letterSpacing: 8,
                padding: 16,
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: error ? '#EF4444' : '#E5E7EB',
              }}
            />
            {error && (
              <Text style={{ fontSize: 14, color: '#EF4444', fontFamily: 'Outfit', marginTop: 8, textAlign: 'center' }}>
                {error}
              </Text>
            )}
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={{
              backgroundColor: ACCENT_GREEN,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Outfit' }}>
                Sign In
              </Text>
            )}
          </Pressable>

          {/* QR Alternative */}
          <Pressable
            onPress={() => router.push('/web/qr-login')}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, color: ACCENT_GREEN, fontFamily: 'Outfit' }}>
              Scan QR code instead
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit' }}>
          Don't have a device code? Open the Happy app on your device
        </Text>
      </View>
    </View>
  );
}
