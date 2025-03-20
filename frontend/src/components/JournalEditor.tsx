import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import {format} from 'date-fns';
import debounce from 'lodash/debounce';

interface JournalEditorProps {
  entry: JournalEntry | null;
  onUpdateContent: (content: string) => void;
  onUpdateTitle: (title: string) => void;
  onPressRecord: () => void;
}

export default function JournalEditor({
  entry,
  onUpdateContent,
  onUpdateTitle,
  onPressRecord,
}: JournalEditorProps) {
  const contentInputRef = useRef<TextInput>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');

  useEffect(() => {
    setLocalContent(entry?.content || '');
    setLocalTitle(entry?.title || '');
  }, [entry]);

  const debouncedUpdateContent = useCallback(
    debounce((content: string) => {
      onUpdateContent(content);
    }, 1000),
    [onUpdateContent],
  );

  const debouncedUpdateTitle = useCallback(
    debounce((title: string) => {
      onUpdateTitle(title);
    }, 1000),
    [onUpdateTitle],
  );

  useEffect(() => {
    return () => {
      debouncedUpdateContent.cancel();
      debouncedUpdateTitle.cancel();
    };
  }, [debouncedUpdateContent, debouncedUpdateTitle]);

  const handleContentChange = (text: string) => {
    setLocalContent(text);
    debouncedUpdateContent(text);
  };

  const handleTitleChange = (text: string) => {
    setLocalTitle(text);
    debouncedUpdateTitle(text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.titleInput}
        value={localTitle}
        onChangeText={handleTitleChange}
        placeholder="Entry Title"
      />

      <Text style={styles.dateText}>
        {entry?.createdAt
          ? format(new Date(entry.createdAt), 'MMMM d, yyyy')
          : format(new Date(), 'MMMM d, yyyy')}
      </Text>

      {entry?.keyPoints && entry.keyPoints.length > 0 && (
        <TouchableOpacity
          style={styles.summaryContainer}
          onPress={() => setIsCollapsed(!isCollapsed)}>
          <Text style={styles.summaryTitle}>
            Key Points {isCollapsed ? '▼' : '▲'}
          </Text>
          {!isCollapsed && (
            <View style={styles.keyPointsContainer}>
              {entry.keyPoints.map((point, idx) => (
                <Text key={idx} style={styles.keyPoint}>
                  • {point}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}

      <TextInput
        ref={contentInputRef}
        style={styles.contentInput}
        multiline
        value={localContent}
        onChangeText={handleContentChange}
        placeholder="Start writing or tap the microphone to record..."
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={onPressRecord}>
          <Icon name="mic" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Icon name="image" size={24} color="#ccc" />
        <Icon name="photo-camera" size={24} color="#ccc" />
        <Icon name="location-on" size={24} color="#ccc" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
  },
  dateText: {
    color: '#666',
    marginBottom: 15,
  },
  summaryContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: 5,
  },
  keyPointsContainer: {
    marginTop: 5,
  },
  keyPoint: {
    marginBottom: 3,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
