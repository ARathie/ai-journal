import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import JournalEditor from '../components/JournalEditor';
import type {JournalEntry} from '../types/journal';
import {API_BASE_URL} from '../config/api';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function NewEntryScreen({navigation}: Props) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleDone}
          disabled={!isDirty}
          style={({pressed}) => ({
            opacity: pressed ? 0.5 : 1,
            marginRight: 15,
          })}>
          {saving ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={{
                color: !isDirty ? '#999' : '#007AFF',
              }}>
              Done
            </Text>
          )}
        </Pressable>
      ),
      headerLeft: () => (
        <Pressable
          onPress={handleCancel}
          style={({pressed}) => ({
            opacity: pressed ? 0.5 : 1,
            marginLeft: 15,
          })}>
          <Text style={{color: '#007AFF'}}>Cancel</Text>
        </Pressable>
      ),
    });
  }, [navigation, saving, isDirty]);

  const handleDone = useCallback(async () => {
    if (!isDirty) return;

    try {
      await saveEntry({
        content: localContent,
        title: localTitle,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry');
    }
  }, [localContent, localTitle, isDirty, saveEntry, navigation]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation]);

  // Save entry changes
  const saveEntry = useCallback(
    async (updates: Partial<JournalEntry>) => {
      setSaving(true);
      try {
        const method = entry?.id ? 'PUT' : 'POST';
        const url = entry?.id
          ? `${API_BASE_URL}/entries/${entry.id}`
          : `${API_BASE_URL}/entries`;

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();
        setEntry(prev => ({...prev, ...data.entry}));

        // If this is the first save with content, navigate back
        if (updates.content && !entry?.content) {
          navigation.goBack();
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to save changes');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [entry?.id, entry?.content, navigation],
  );

  // Content updates
  const handleContentChange = useCallback((content: string) => {
    setLocalContent(content);
    setIsDirty(true);
  }, []);

  // Title updates
  const handleTitleChange = useCallback((title: string) => {
    setLocalTitle(title);
    setIsDirty(true);
  }, []);

  // Handle recording
  const handleRecord = useCallback(() => {
    if (!isDirty) {
      Alert.alert('Error', 'Please add some content first');
      return;
    }
    Alert.alert('Coming Soon', 'Recording feature will be implemented soon');
  }, [isDirty]);

  return (
    <View style={styles.container}>
      <JournalEditor
        entry={
          {
            content: localContent,
            title: localTitle,
          } as JournalEntry
        }
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
});
