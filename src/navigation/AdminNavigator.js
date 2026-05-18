import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import ChallansScreen from '../screens/admin/ChallansScreen';
import LiveCameraScreen from '../screens/admin/LiveCameraScreen';
import AddUserScreen from '../screens/admin/AddUserScreen';
import EditChallanScreen from '../screens/admin/EditChallanScreen';
import EditUserScreen from '../screens/admin/EditUserScreen';
import CreateChallanScreen from '../screens/admin/CreateChallanScreen';
import AddCameraScreen from '../screens/admin/AddCameraScreen';
import DetectionDetailScreen from '../screens/admin/DetectionDetailScreen';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AdminTabs = () => {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabelPosition: 'below-icon',
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Users') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Challans') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'LiveCam') {
            iconName = focused ? 'video-plus' : 'video-plus-outline';
          }

          return (
            <View style={styles.iconWrapper}>
              <Icon name={iconName} size={24} color={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
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
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 1,
          marginTop: 2,
          textTransform: 'uppercase'
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'DASHBOARD' }}
      />
      <Tab.Screen
        name="Users"
        component={ManageUsersScreen}
        options={{ tabBarLabel: 'ENTITIES' }}
      />
      <Tab.Screen
        name="Challans"
        component={ChallansScreen}
        options={{ tabBarLabel: 'AUDITS' }}
      />
      <Tab.Screen
        name="LiveCam"
        component={LiveCameraScreen}
        options={{ tabBarLabel: 'NODES' }}
      />
    </Tab.Navigator>
  );
};

const AdminNavigator = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '900', fontSize: 16, letterSpacing: 2 },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen
        name="AdminTabs"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{ title: 'ENROLL ENTITY' }}
      />
      <Stack.Screen
        name="EditChallan"
        component={EditChallanScreen}
        options={{ title: 'AUDIT CHALLAN' }}
      />
      <Stack.Screen
        name="EditUser"
        component={EditUserScreen}
        options={{ title: 'MODIFY ACCESS' }}
      />
      <Stack.Screen
        name="CreateChallan"
        component={CreateChallanScreen}
        options={{ title: 'INITIALIZE PENALTY' }}
      />
      <Stack.Screen
        name="AddCamera"
        component={AddCameraScreen}
        options={{ title: 'LINK NODE' }}
      />
      <Stack.Screen
        name="DetectionDetail"
        component={DetectionDetailScreen}
        options={{ title: 'INCIDENT DOSSIER' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 60,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 4px rgba(15, 23, 42, 0.5)' }
      : { shadowColor: '#0F172A', shadowOpacity: 0.5, shadowRadius: 4 })
  }
});

export default AdminNavigator;
