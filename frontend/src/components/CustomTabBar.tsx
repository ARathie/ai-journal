import React from 'react';
import {View, TouchableOpacity, StyleSheet, Text} from 'react-native';
import {
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  UserIcon,
  PlusIcon,
} from 'react-native-heroicons/outline';

export default function CustomTabBar({state, descriptors, navigation}) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? '#007AFF' : '#8E8E93';

        // Handle center "+" button
        if (index === 2) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.centerButton}
              onPress={() => navigation.navigate('NewEntry')}>
              <View style={styles.addCircle}>
                <PlusIcon color="white" size={24} />
              </View>
            </TouchableOpacity>
          );
        }

        // Render the appropriate icon based on the route name
        const renderIcon = () => {
          switch (route.name) {
            case 'Journal':
              return <DocumentTextIcon size={24} color={color} />;
            case 'Calendar':
              return <CalendarIcon size={24} color={color} />;
            case 'Trends':
              return <ChartBarIcon size={24} color={color} />;
            case 'Account':
              return <UserIcon size={24} color={color} />;
            default:
              return <Text style={{color}}>•</Text>;
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabButton}
            onPress={() => navigation.navigate(route.name)}>
            {renderIcon()}
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
  addCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
