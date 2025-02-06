import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {format} from 'date-fns';

// Define types based on our Prisma schema
interface JournalEntry {
  id: string;
  title: string | null;
  content: string | null;
  createdAt: string;
  keyPoints: string[];
  sentiment: string | null;
  emotionTags: string[];
  topicTags: string[];
}

interface ApiResponse {
  entries: JournalEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

export default function JournalScreen({navigation}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async (shouldRefresh = false) => {
    try {
      if (loading || (!hasMore && !shouldRefresh)) return;

      setLoading(true);
      const cursor = shouldRefresh ? '' : nextCursor;
      const url = `http://192.168.1.95:3000/api/entries/list?limit=20${
        cursor ? `&cursor=${cursor}` : ''
      }`;

      console.log('Fetching entries from:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch entries: ${errorText}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Received data:', {
        entriesCount: data.entries.length,
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
      });

      setEntries(prevEntries =>
        shouldRefresh ? data.entries : [...prevEntries, ...data.entries],
      );
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Detailed fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchEntries(true);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        'http://localhost:3000/api/entries/search/qna',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({question: searchQuery}),
        },
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      // Navigate to search results screen with the answer
      navigation.navigate('SearchResults', {
        answer: data.answer,
        context: data.context,
        question: searchQuery,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({item}: {item: JournalEntry}) => {
    const formattedDate = format(new Date(item.createdAt), 'MMM d, yyyy');
    const keyPointsPreview = item.keyPoints.slice(0, 2).join(' • ');

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() =>
          navigation.navigate('JournalDetail', {entryId: item.id})
        }>
        <Text style={styles.entryTitle}>{item.title || 'Untitled Entry'}</Text>
        <Text style={styles.entryDate}>{formattedDate}</Text>
        <Text style={styles.entryPreview} numberOfLines={2}>
          {keyPointsPreview ||
            item.content?.slice(0, 100) + '...' ||
            'No content'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && !entries.length) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => fetchEntries(true)}
          style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search or Ask your entries with AI"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onRefresh={() => fetchEntries(true)}
        refreshing={refreshing}
        onEndReached={() => fetchEntries()}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    backgroundColor: '#E5E5EA',
    padding: 8,
    borderRadius: 10,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 15,
  },
  entryCard: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  entryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  entryPreview: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
