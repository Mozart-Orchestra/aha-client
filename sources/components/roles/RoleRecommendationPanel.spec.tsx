/**
 * V5-AI-001: 智能角色推荐 UI 组件测试
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RoleRecommendationPanel } from '../RoleRecommendationPanel';
import { getRoleRecommendations } from '@/sync/apiV5';

// Mock API
jest.mock('@/sync/apiV5');
const mockGetRoleRecommendations = getRoleRecommendations as jest.MockedFunction<typeof getRoleRecommendations>;

describe('RoleRecommendationPanel', () => {
  const mockCredentials = {
    serverUrl: 'http://test.com',
    teamId: 'team-1',
    apiKey: 'test-key',
  };

  const mockRecommendations = [
    {
      role: {
        id: 'role-1',
        name: 'React Developer',
        category: 'implementer',
        assignedSkills: ['React', 'TypeScript'],
        description: 'React specialist',
        rating: 4.8,
        completedTasks: 25,
        successRate: 0.92,
      },
      matchScore: 95,
      reasons: ['Perfect tech stack match', 'High rating'],
      skillMatch: {
        matched: ['React', 'TypeScript'],
        missing: [],
        bonus: ['Node.js'],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project requirement form', () => {
    const { getByText, getByPlaceholderText } = render(
      <RoleRecommendationPanel credentials={mockCredentials} />
    );

    expect(getByText('Project Requirements')).toBeTruthy();
    expect(getByPlaceholderText('Enter tech stack (comma separated)')).toBeTruthy();
  });

  it('submits requirements and displays recommendations', async () => {
    mockGetRoleRecommendations.mockResolvedValueOnce({
      success: true,
      recommendations: mockRecommendations,
    });

    const { getByPlaceholderText, getByText, getByTestId } = render(
      <RoleRecommendationPanel credentials={mockCredentials} />
    );

    // Fill form
    fireEvent.changeText(
      getByPlaceholderText('Enter tech stack (comma separated)'),
      'React, TypeScript'
    );
    fireEvent.changeText(
      getByPlaceholderText('Team size'),
      '5'
    );

    // Submit
    fireEvent.press(getByText('Get Recommendations'));

    // Wait for results
    await waitFor(() => {
      expect(mockGetRoleRecommendations).toHaveBeenCalledWith(
        mockCredentials,
        expect.objectContaining({
          techStack: ['React', 'TypeScript'],
          teamSize: 5,
        })
      );
    });

    await waitFor(() => {
      expect(getByText('React Developer')).toBeTruthy();
      expect(getByText('95% Match')).toBeTruthy();
    });
  });

  it('displays match score and reasons', async () => {
    mockGetRoleRecommendations.mockResolvedValueOnce({
      success: true,
      recommendations: mockRecommendations,
    });

    const { getByText, findByText } = render(
      <RoleRecommendationPanel credentials={mockCredentials} />
    );

    fireEvent.press(getByText('Get Recommendations'));

    await waitFor(async () => {
      expect(await findByText('Perfect tech stack match')).toBeTruthy();
      expect(await findByText('Matched: React, TypeScript')).toBeTruthy();
    });
  });

  it('handles apply recommendation', async () => {
    const onApply = jest.fn();
    mockGetRoleRecommendations.mockResolvedValueOnce({
      success: true,
      recommendations: mockRecommendations,
    });

    const { getByText, findByText } = render(
      <RoleRecommendationPanel
        credentials={mockCredentials}
        onApplyRecommendation={onApply}
      />
    );

    fireEvent.press(getByText('Get Recommendations'));

    const applyButton = await findByText('Apply');
    fireEvent.press(applyButton);

    expect(onApply).toHaveBeenCalledWith(mockRecommendations[0]);
  });

  it('shows loading state', () => {
    mockGetRoleRecommendations.mockImplementation(() => new Promise(() => {}));

    const { getByText, getByTestId } = render(
      <RoleRecommendationPanel credentials={mockCredentials} />
    );

    fireEvent.press(getByText('Get Recommendations'));

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('handles errors gracefully', async () => {
    mockGetRoleRecommendations.mockRejectedValueOnce(new Error('API Error'));

    const { getByText, findByText } = render(
      <RoleRecommendationPanel credentials={mockCredentials} />
    );

    fireEvent.press(getByText('Get Recommendations'));

    expect(await findByText(/Failed to get recommendations/)).toBeTruthy();
  });
});
