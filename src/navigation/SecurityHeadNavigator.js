import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import GuardsActivityScreen from '../screens/securityhead/GuardsActivityScreen';
import ChallansScreen from '../screens/securityhead/ChallansScreen';
import { useAuth } from '../context/AuthContext';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const SecurityHeadTabs = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;
    }
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabelPosition: 'below-icon',
        headerShown: true,
        headerStyle: { backgroundColor: '#020617' },
        headerTintColor: '#fff',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Guards') {
            iconName = focused ? 'account-tie' : 'account-tie-outline';
          } else if (route.name === 'Challans') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          }
          return (
            <View style={focused ? styles.activeTab : null}>
              <Icon name={iconName} size={24} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 25,
          ...(Platform.OS === 'web' 
             ? { 
                 position: 'absolute',
                 bottom: 20,
                 left: 0,
                 right: 0,
                 marginHorizontal: 'auto',
                 width: '100%',
                 maxWidth: 450,
                 borderRadius: 36,
                 borderWidth: 1,
                 borderColor: '#E2E8F0',
                 boxShadow: '0 10px 25px rgba(15, 23, 42, 0.1)',
                 height: 70,
                 paddingTop: 12,
                 paddingBottom: 12,
               }
             : {
                 height: Platform.OS === 'ios' ? 95 : 82,
                 paddingBottom: Platform.OS === 'ios' ? 30 : 20,
                 paddingTop: 12,
                 position: 'absolute',
                 bottom: 0,
                 left: 0,
                 right: 0,
                 borderTopLeftRadius: 36,
                 borderTopRightRadius: 36,
                 borderWidth: 1,
                 borderColor: '#F1F5F9',
                 shadowColor: '#0F172A',
                 shadowOffset: { width: 0, height: -4 },
                 shadowOpacity: 0.1,
                 shadowRadius: 10
               })
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 20 }}>
            <Icon name="logout" size={24} color="#10b981" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Guards" component={GuardsActivityScreen} options={{ title: 'OPERATIVE INTEL' }} />
      <Tab.Screen name="Challans" component={ChallansScreen} options={{ title: 'SURVEILLANCE ARCHIVE' }} />
    </Tab.Navigator>
  );
};

const SecurityHeadNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SecurityHeadTabs" component={SecurityHeadTabs} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  }
});

export default SecurityHeadNavigator;
