import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { AuthCredentials } from '@/auth/tokenStorage';
import { searchRoles, SearchResult } from '@/sync/apiV5';

export interface SearchSuggestion {
  id: string;
  type: 'role' | 'skill' | 'tag' | 'history' | 'popular';
  text: string;
  subtitle?: string;
  icon: string;
  count?: number; // For popular searches or tags
}

export interface SearchSuggestionsProps {
  /** Current search query */
  query: string;
  /** Available skills from roles */
  availableSkills: string[];
  /** Recent search history */
  recentSearches: string[];
  /** Popular searches/tags */
  popularTags: Array<{ tag: string; count: number }>;
  /** Auth credentials for V5 API calls (optional) */
  credentials?: AuthCredentials | null;
  /** Callback when suggestion is selected */
  onSelect: (suggestion: string) => void;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: string) => void;
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
}

/**
 * SearchSuggestions Component
 *
 * V5-UX-002: Intelligent Search Enhancement
 *
 * Provides intelligent search suggestions including:
 * - Skill/role matching
 * - Tag suggestions
 * - Recent search history
 * - Popular searches
 *
 * Usage:
 * ```tsx
 * <SearchSuggestions
 *   query={searchQuery}
 *   availableSkills={['React', 'TypeScript', 'Node.js']}
 *   recentSearches={['frontend', 'architect']}
 *   popularTags={[{ tag: 'AI', count: 15 }]}
 *   onSelect={(text) => setSearchQuery(text)}
 * />
 * ```
 */
export function SearchSuggestions({
  query,
  availableSkills,
  recentSearches,
  popularTags,
  credentials,
  onSelect,
  onTagSelect,
  maxSuggestions = 8,
}: SearchSuggestionsProps) {
  const [semanticResults, setSemanticResults] = React.useState<SearchResult[]>([]);
  const [isLoadingSemantic, setIsLoadingSemantic] = React.useState(false);

  // V5-UX-002: Semantic search integration
  React.useEffect(() => {
    if (!credentials || query.length < 3) {
      setSemanticResults([]);
      return;
    }

    const fetchSemanticResults = async () => {
      setIsLoadingSemantic(true);
      try {
        const response = await searchRoles(credentials, {
          query,
          maxResults: 5,
          minSimilarity: 0.3,
          includeMetadata: true,
        });
        setSemanticResults(response.results);
      } catch (error) {
        console.error('Failed to fetch semantic search results:', error);
        setSemanticResults([]);
      } finally {
        setIsLoadingSemantic(false);
      }
    };

    const debounceTimer = setTimeout(fetchSemanticResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [credentials, query]);

  const suggestions = React.useMemo(() => {
    const result: SearchSuggestion[] = [];

    // 0. V5-UX-002: Semantic search results (highest priority if available)
    if (semanticResults.length > 0) {
      semanticResults.slice(0, 3).forEach((semanticResult) => {
        result.push({
          id: `semantic-${semanticResult.roleId}`,
          type: 'role',
          text: semanticResult.metadata?.title || semanticResult.roleId,
          subtitle: `${(semanticResult.similarity * 100).toFixed(0)}% match - ${semanticResult.metadata?.category || 'Role'}`,
          icon: 'search',
          count: Math.round(semanticResult.similarity * 100),
        });
      });
    }

    // 1. Exact skill matches (highest priority)
    if (query.length >= 2) {
      const skillMatches = availableSkills
        .filter((skill) => skill.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      skillMatches.forEach((skill) => {
        result.push({
          id: `skill-${skill}`,
          type: 'skill',
          text: skill,
          subtitle: 'Skill',
          icon: 'ribbon',
        });
      });
    }

    // 2. Tag suggestions (with # prefix)
    if (query.startsWith('#')) {
      const tagQuery = query.slice(1).toLowerCase();
      const tagMatches = popularTags
        .filter((tag) => tag.tag.toLowerCase().includes(tagQuery))
        .slice(0, 4);

      tagMatches.forEach(({ tag, count }) => {
        result.push({
          id: `tag-${tag}`,
          type: 'tag',
          text: `#${tag}`,
          subtitle: `${count} roles`,
          icon: 'pricetag',
          count,
        });
      });
    }

    // 3. Recent searches (if query is empty or very short)
    if (query.length < 2) {
      recentSearches.slice(0, 3).forEach((search) => {
        result.push({
          id: `history-${search}`,
          type: 'history',
          text: search,
          subtitle: 'Recent search',
          icon: 'time',
        });
      });
    }

    // 4. Popular tags (if query is empty)
    if (query.length === 0) {
      popularTags.slice(0, 3).forEach(({ tag, count }) => {
        result.push({
          id: `popular-${tag}`,
          type: 'popular',
          text: `#${tag}`,
          subtitle: `${count} roles`,
          icon: 'trending-up',
          count,
        });
      });
    }

    // 5. Natural language query suggestions
    if (query.length >= 3 && !query.startsWith('#')) {
      const lowerQuery = query.toLowerCase();

      // React-related
      if (lowerQuery.includes('react') || lowerQuery.includes('frontend')) {
        result.push({
          id: 'nl-react',
          type: 'role',
          text: 'React Expert',
          subtitle: 'I need a React expert',
          icon: 'person',
        });
      }

      // TypeScript-related
      if (lowerQuery.includes('typescript') || lowerQuery.includes('type')) {
        result.push({
          id: 'nl-typescript',
          type: 'role',
          text: 'TypeScript Developer',
          subtitle: 'I need a TypeScript developer',
          icon: 'person',
        });
      }

      // Backend-related
      if (
        lowerQuery.includes('backend') ||
        lowerQuery.includes('api') ||
        lowerQuery.includes('server')
      ) {
        result.push({
          id: 'nl-backend',
          type: 'role',
          text: 'Backend Engineer',
          subtitle: 'I need a backend engineer',
          icon: 'person',
        });
      }

      // AI-related
      if (
        lowerQuery.includes('ai') ||
        lowerQuery.includes('ml') ||
        lowerQuery.includes('machine learning')
      ) {
        result.push({
          id: 'nl-ai',
          type: 'role',
          text: 'AI/ML Engineer',
          subtitle: 'I need an AI/ML engineer',
          icon: 'person',
        });
      }
    }

    // Sort by relevance and limit results
    return result
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.type === 'skill' && b.type !== 'skill') return -1;
        if (b.type === 'skill' && a.type !== 'skill') return 1;

        // Then tags
        if (a.type === 'tag' && b.type !== 'tag') return -1;
        if (b.type === 'tag' && a.type !== 'tag') return 1;

        // Then by count (for popular/tags)
        return (b.count || 0) - (a.count || 0);
      })
      .slice(0, maxSuggestions);
  }, [query, availableSkills, recentSearches, popularTags, maxSuggestions, semanticResults]);

  const getSuggestionStyle = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'skill':
        return { backgroundColor: '#E8F5E9', iconColor: '#4CAF50' };
      case 'tag':
        return { backgroundColor: '#E3F2FD', iconColor: '#2196F3' };
      case 'history':
        return { backgroundColor: '#F5F5F5', iconColor: '#666' };
      case 'popular':
        return { backgroundColor: '#FFF3E0', iconColor: '#FF9800' };
      case 'role':
        return { backgroundColor: '#F3E5F5', iconColor: '#9C27B0' };
      default:
        return { backgroundColor: '#F5F5F5', iconColor: '#666' };
    }
  };

  const handlePress = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag' && onTagSelect) {
      onTagSelect(suggestion.text.replace('#', ''));
    } else {
      onSelect(suggestion.text);
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Suggestions</Text>
      {suggestions.map((suggestion) => {
        const style = getSuggestionStyle(suggestion.type);
        return (
          <Pressable
            key={suggestion.id}
            style={({ pressed }) => [
              styles.suggestionItem,
              { backgroundColor: style.backgroundColor },
              pressed && styles.pressed,
            ]}
            onPress={() => handlePress(suggestion)}
          >
            <View style={styles.suggestionLeft}>
              <Ionicons name={suggestion.icon as any} size={20} color={style.iconColor} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>{suggestion.text}</Text>
                {suggestion.subtitle && (
                  <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
                )}
              </View>
            </View>
            {suggestion.count !== undefined && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{suggestion.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
