import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function NewEntryScreen() {
  return (
    <View style={styles.container}>
      <Text>New Entry Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
