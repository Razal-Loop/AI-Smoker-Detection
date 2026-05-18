import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AdminNavigator from './AdminNavigator';
import StudentNavigator from './StudentNavigator';
import GuardNavigator from './GuardNavigator';
import SecurityHeadNavigator from './SecurityHeadNavigator';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  const { userRole, loading, currentUser, refreshUserRole } = useAuth();

  // Force refresh role after a delay if not loaded
  useEffect(() => {
    if (currentUser && !userRole && !loading) {
      // Wait a bit and check again - sometimes Firestore needs a moment
      const timer = setTimeout(() => {
        console.log('⏳ Re-checking user role after delay...');
        // The AuthContext will automatically re-check on auth state change
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, userRole, loading]);

  // Show loading while role is being fetched
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // If no role, show error with helpful instructions
  if (!userRole) {
    const { currentUser, logout } = useAuth();
    return (
      <View style={styles.flex}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Role Not Found</Text>
          <Text style={styles.errorText}>
            Your account is authenticated but the role field is missing or invalid in the database.
          </Text>

          {currentUser && (
            <View style={styles.userInfoCard}>
              <Text style={styles.userInfoTitle}>Your Account Information:</Text>
              <Text style={styles.userInfoText}>Email: {currentUser.email}</Text>
              <Text style={styles.userInfoText}>UID: {currentUser.uid}</Text>
              <Text style={styles.userInfoNote}>
                ⚠️ Check the console for detailed debug information
              </Text>
            </View>
          )}

          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={async () => {
                console.log('🔄 Manually refreshing user role...');
                if (refreshUserRole) {
                  await refreshUserRole();
                }
              }}
            >
              <Text style={styles.reloadButtonText}>Refresh Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reloadButton, { backgroundColor: '#FF5252', marginTop: 10 }]}
              onPress={async () => {
                try {
                  await logout();
                } catch (err) {
                  console.error('Action error:', err);
                }
              }}
            >
              <Text style={styles.reloadButtonText}>Terminate Session</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>To Fix This in Firestore:</Text>
            <Text style={styles.instructionsText}>
              1. Go to Firebase Console → Firestore Database{'\n\n'}
              2. Find document in "users" collection{'\n'}
              • Document ID MUST be: {currentUser?.uid || 'YOUR_UID'}{'\n\n'}
              3. Check the document has these EXACT fields:{'\n'}
              • role (type: string, value: "admin"){'\n'}
              • email (type: string){'\n'}
              • name (type: string){'\n\n'}
              4. Common issues:{'\n'}
              • Field name must be "role" (lowercase){'\n'}
              • Value must be "admin" (lowercase, no quotes){'\n'}
              • Document ID must match your UID exactly{'\n'}
              • Check for typos or extra spaces
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const getNavigator = () => {
    switch (userRole) {
      case 'admin':
        return <Stack.Screen name="AdminStack" component={AdminNavigator} />;
      case 'student':
        return <Stack.Screen name="StudentStack" component={StudentNavigator} />;
      case 'guard':
        return <Stack.Screen name="GuardStack" component={GuardNavigator} />;
      case 'security_head':
        return <Stack.Screen name="SecurityHeadStack" component={SecurityHeadNavigator} />;
      default:
        return (
          <Stack.Screen
            name="Error"
            component={() => (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Invalid role: {userRole}</Text>
              </View>
            )}
          />
        );
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {getNavigator()}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  userInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  userInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  errorNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  userInfoNote: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 8,
    fontStyle: 'italic',
  },
  debugCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  actionCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  reloadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  reloadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  firestoreCard: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  firestoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 8,
  },
  firestoreText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});

export default MainNavigator;


