import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SearchSuggestions } from '../components/SearchSuggestions';
import { searchRoles } from '../sync/apiV5';

// Mock the API
jest.mock('../sync/apiV5', () => ({
  searchRoles: jest.fn(),
}));

describe('SearchSuggestions', () => {
  const mockOnSelect = jest.fn();
  const mockOnTagSelect = jest.fn();
  const mockCredentials = { serverUrl: 'https://test.com', token: 'test-token' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    query: '',
    availableSkills: ['React', 'TypeScript', 'Node.js'],
    recentSearches: ['frontend', 'architect'],
    popularTags: [
      { tag: 'AI', count: 15 },
      { tag: 'React', count: 12 },
    ],
    onSelect: mockOnSelect,
    onTagSelect: mockOnTagSelect,
    maxSuggestions: 8,
  };

  describe('V5-P0-004: Smart Search Autocomplete', () => {
    it('should show recent searches when query is empty', () => {
      const { getByText } = render(<SearchSuggestions {...defaultProps} />);

      expect(getByText('frontend')).toBeTruthy();
      expect(getByText('architect')).toBeTruthy();
    });

    it('should show popular tags when query is empty', () => {
      const { getByText } = render(<SearchSuggestions {...defaultProps} />);

      expect(getByText('#AI')).toBeTruthy();
      expect(getByText('15 roles')).toBeTruthy();
    });

    it('should filter skills based on query', () => {
      const { getByText, queryByText } = render(
        <SearchSuggestions {...defaultProps} query="Rea" />
      );

      expect(getByText('React')).toBeTruthy();
      expect(queryByText('TypeScript')).toBeNull();
    });

    it('should show tag suggestions when query starts with #', () => {
      const { getByText, queryByText } = render(
        <SearchSuggestions {...defaultProps} query="#A" />
      );

      expect(getByText('#AI')).toBeTruthy();
      expect(queryByText('#React')).toBeNull(); // Doesn't match 'A'
    });

    it('should call onSelect when suggestion is pressed', () => {
      const { getByText } = render(<SearchSuggestions {...defaultProps} />);

      fireEvent.press(getByText('frontend'));
      expect(mockOnSelect).toHaveBeenCalledWith('frontend');
    });

    it('should call onTagSelect when tag is pressed', () => {
      const { getByText } = render(<SearchSuggestions {...defaultProps} />);

      fireEvent.press(getByText('#AI'));
      expect(mockOnTagSelect).toHaveBeenCalledWith('AI');
    });

    it('should support natural language queries - React', () => {
      const { getByText } = render(
        <SearchSuggestions {...defaultProps} query="I need a React expert" />
      );

      expect(getByText('React Expert')).toBeTruthy();
      expect(getByText('I need a React expert')).toBeTruthy();
    });

    it('should support natural language queries - TypeScript', () => {
      const { getByText } = render(
        <SearchSuggestions {...defaultProps} query="TypeScript developer needed" />
      );

      expect(getByText('TypeScript Developer')).toBeTruthy();
    });

    it('should support natural language queries - Backend', () => {
      const { getByText } = render(
        <SearchSuggestions {...defaultProps} query="backend engineer" />
      );

      expect(getByText('Backend Engineer')).toBeTruthy();
    });

    it('should support natural language queries - AI/ML', () => {
      const { getByText } = render(
        <SearchSuggestions {...defaultProps} query="machine learning" />
      );

      expect(getByText('AI/ML Engineer')).toBeTruthy();
    });

    it('should integrate with semantic search API when credentials provided', async () => {
      const mockSearchRoles = searchRoles as jest.MockedFunction<typeof searchRoles>;
      mockSearchRoles.mockResolvedValueOnce({
        results: [
          {
            roleId: 'role-1',
            similarity: 0.92,
            metadata: {
              title: 'React Performance Expert',
              category: 'Engineering',
            },
          },
        ],
      });

      const { getByText, queryByText } = render(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="React"
        />
      );

      // Wait for debounce (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchRoles).toHaveBeenCalledWith(
          mockCredentials,
          expect.objectContaining({
            query: 'React',
            maxResults: 5,
            minSimilarity: 0.3,
            includeMetadata: true,
          })
        );
      });

      await waitFor(() => {
        expect(getByText('React Performance Expert')).toBeTruthy();
        expect(getByText('92% match - Engineering')).toBeTruthy();
      });
    });

    it('should respond within 300ms', async () => {
      const start = Date.now();

      const { getAllByText } = render(
        <SearchSuggestions {...defaultProps} query="Rea" />
      );

      const suggestions = getAllByText('React');
      expect(suggestions.length).toBeGreaterThan(0);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(300);
    });

    it('should not call API for queries shorter than 3 characters', () => {
      const mockSearchRoles = searchRoles as jest.MockedFunction<typeof searchRoles>;

      render(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="Re"
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearchRoles).not.toHaveBeenCalled();
    });

    it('should debounce API calls', async () => {
      const mockSearchRoles = searchRoles as jest.MockedFunction<typeof searchRoles>;
      mockSearchRoles.mockResolvedValue({ results: [] });

      const { rerender } = render(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="Rea"
        />
      );

      // Query changes before debounce completes
      rerender(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="Reac"
        />
      );

      rerender(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="React"
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should only call once with final query
        expect(mockSearchRoles).toHaveBeenCalledTimes(1);
        expect(mockSearchRoles).toHaveBeenCalledWith(
          mockCredentials,
          expect.objectContaining({ query: 'React' })
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockSearchRoles = searchRoles as jest.MockedFunction<typeof searchRoles>;
      mockSearchRoles.mockRejectedValueOnce(new Error('API Error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { queryByText } = render(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="React"
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch semantic search results:',
          expect.any(Error)
        );
      });

      // Component should still render other suggestions
      expect(queryByText('React')).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    it('should limit suggestions to maxSuggestions prop', () => {
      const manySkills = Array.from({ length: 20 }, (_, i) => `Skill${i}`);

      const { queryAllByText } = render(
        <SearchSuggestions
          {...defaultProps}
          availableSkills={manySkills}
          query="Skill"
          maxSuggestions={5}
        />
      );

      const skillItems = queryAllByText(/Skill\d+/);
      expect(skillItems.length).toBeLessThanOrEqual(5);
    });

    it('should display similarity percentage for semantic results', async () => {
      const mockSearchRoles = searchRoles as jest.MockedFunction<typeof searchRoles>;
      mockSearchRoles.mockResolvedValueOnce({
        results: [
          {
            roleId: 'role-1',
            similarity: 0.85,
            metadata: { title: 'Test Role' },
          },
        ],
      });

      const { getByText } = render(
        <SearchSuggestions
          {...defaultProps}
          credentials={mockCredentials}
          query="test"
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('85% match - Role')).toBeTruthy();
      });
    });
  });
});
