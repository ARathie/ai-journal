import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CustomTabBar({state, descriptors, navigation}) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;

        // Handle center "+" button
        if (index === 2) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.centerButton}
              onPress={() => navigation.navigate('NewEntry')}>
              <Icon name="add-circle" size={50} color="#007AFF" />
            </TouchableOpacity>
          );
        }

        // Adjust index for icon selection after the center button
        const getIconName = () => {
          const icons = {
            Journal: 'journal',
            Calendar: 'calendar',
            Trends: 'trending-up',
            Account: 'person',
          };
          return icons[route.name] || 'square';
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabButton}
            onPress={() => navigation.navigate(route.name)}>
            <Icon
              name={getIconName()}
              size={24}
              color={isFocused ? '#007AFF' : '#8E8E93'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 80,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
});
