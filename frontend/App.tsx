import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import JournalScreen from './src/screens/JournalScreen';
import JournalDetailScreen from './src/screens/JournalDetailScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import TrendsScreen from './src/screens/TrendsScreen';
import AccountScreen from './src/screens/AccountScreen';
import NewEntryScreen from './src/screens/NewEntryScreen';
import CustomTabBar from './src/components/CustomTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
      }}>
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="NewEntry"
        component={NewEntryScreen}
        options={{tabBarButton: () => null}}
      />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="JournalDetailScreen"
          component={JournalDetailScreen}
          options={{
            title: 'Entry Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="NewEntry"
          component={NewEntryScreen}
          options={{presentation: 'modal'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
