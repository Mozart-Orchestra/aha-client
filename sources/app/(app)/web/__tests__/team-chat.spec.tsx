import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import React from 'react';

// Mock Platform
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'web' },
}));

// Mock SafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: ({ source, style }: { source: { uri: string }; style: any }) => (
    <img src={source.uri} style={style} data-testid="expo-image" />
  ),
}));

// Mock Unistyles
jest.mock('react-native-unistyles', () => ({
  useUnistyles: () => ({
    theme: {
      colors: {
        groupped: {
          background: '#ffffff',
          surface: '#f5f5f5',
          page: '#f0f0f0',
          text: '#000000',
          caption: '#666666',
          border: '#e0e0e0',
          accent: '#4CAF50',
        },
      },
    },
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// MSW Server Setup
const server = setupServer(
  http.get('/api/teams', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'team-1', name: 'Test Team', avatar: 'https://test.com/1.jpg', memberCount: 5 },
      ],
    });
  }),
  http.get('/api/agents', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'agent-1', name: 'Code Reviewer', status: 'online', type: 'reviewer' },
      ],
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Team Chat Screen', () => {
  it('renders sidebar with teams', async () => {
    const TeamChat = (await import('../team-chat')).default;
    render(<TeamChat />);

    await waitFor(() => {
      expect(screen.getByText('Happy')).toBeTruthy();
    });
  });

  it('renders agent row', async () => {
    const TeamChat = (await import('../team-chat')).default;
    render(<TeamChat />);

    await waitFor(() => {
      expect(screen.getByText('Code Reviewer')).toBeTruthy();
    });
  });

  it('allows sending messages', async () => {
    const TeamChat = (await import('../team-chat')).default;
    render(<TeamChat />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    fireEvent.changeText(input, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeTruthy();
    });
  });

  it('renders team members panel', async () => {
    const TeamChat = (await import('../team-chat')).default;
    render(<TeamChat />);

    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeTruthy();
    });
  });
});
