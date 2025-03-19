import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import JournalEditor from '../components/JournalEditor';
import type {JournalEntry} from '../types/journal';
import {API_BASE_URL} from '../config/api';

export default function JournalDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const entryId = route.params?.entryId;

  // Fetch entry data on mount
  useEffect(() => {
    if (!entryId) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/entries/${entryId}`)
      .then(res => res.json())
      .then(data => {
        setEntry(data);
      })
      .catch(err => {
        Alert.alert('Error', 'Failed to load journal entry');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [entryId]);

  // Save entry changes
  const saveEntry = useCallback(
    async (updates: Partial<JournalEntry>) => {
      if (!entryId) return;

      setSaving(true);
      try {
        const response = await fetch(`${API_BASE_URL}/entries/${entryId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();
        setEntry(prev => ({...prev, ...data.entry}));
      } catch (err) {
        Alert.alert('Error', 'Failed to save changes');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [entryId],
  );

  // Debounced content updates
  const handleContentChange = useCallback(
    (content: string) => {
      setEntry(prev => (prev ? {...prev, content} : null));
      // Debounce save for 1 second after typing stops
      const timeoutId = setTimeout(() => {
        saveEntry({content});
      }, 1000);
      return () => clearTimeout(timeoutId);
    },
    [saveEntry],
  );

  // Immediate title updates
  const handleTitleChange = useCallback(
    (title: string) => {
      setEntry(prev => (prev ? {...prev, title} : null));
      saveEntry({title});
    },
    [saveEntry],
  );

  // Handle recording
  const handleRecord = useCallback(() => {
    // TODO: Implement recording logic
    Alert.alert('Coming Soon', 'Recording feature will be implemented soon');
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <JournalEditor
        entry={entry}
        onUpdateContent={handleContentChange}
        onUpdateTitle={handleTitleChange}
        onPressRecord={handleRecord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
