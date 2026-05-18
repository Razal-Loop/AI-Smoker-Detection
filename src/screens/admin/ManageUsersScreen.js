import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, StatusBar, Alert, Platform, useWindowDimensions } from 'react-native';
import {
  Card,
  Text,
  FAB,
  ActivityIndicator,
  useTheme,
  Avatar,
  IconButton,
  TouchableRipple
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { getUsers, deleteUser } from '../../services/userService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';



const ManageUsersScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('User Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const unsubscribe = navigation.addListener('focus', loadUsers);
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (userId) => {
    Alert.alert(
      'DELETE USER',
      'Are you sure you want to delete this user account?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              loadUsers();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete user.');
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerSection}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>USER DIRECTORY</Text>
          <Text style={styles.headerSub}>{users.filter(u => u.role === 'student').length} Students Registered</Text>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadUsers(); }}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={() => navigation.navigate('EditUser', { userId: user.id })}
              onDelete={() => handleDelete(user.id)}
            />
          ))}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <FAB
        icon="account-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => navigation.navigate('AddUser')}
      />
    </View>
  );
};

const UserCard = ({ user, onEdit, onDelete }) => {
  const theme = useTheme();
  const roleColors = {
    admin: '#0F172A',
    student: '#06B6D4',
    guard: '#F59E0B',
    security_head: '#22C55E'
  };
  const roleColor = roleColors[user.role] || theme.colors.primary;

  return (
    <Card style={styles.userCard} elevation={2}>
      <View style={styles.cardInner}>
        <View style={styles.avatarSection}>
          {user.photoUrl ? (
            <Avatar.Image
              size={56}
              source={{ uri: user.photoUrl }}
              style={[styles.avatar, { backgroundColor: '#F8FAFC' }]}
            />
          ) : (
            <Avatar.Text
              size={56}
              label={user.name?.[0] || 'U'}
              style={[styles.avatar, { backgroundColor: 'rgba(15, 23, 42, 0.08)' }]}
              labelStyle={[styles.avatarLabel, { color: theme.colors.primary }]}
            />
          )}
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleText}>{user.role?.replace('_', ' ').toUpperCase() || 'STUDENT'}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.userName}>{user.name || 'No Name'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userMetadata}>ID: {user.studentId || 'N/A'}</Text>
        </View>

        <View style={styles.actionSection}>
          <IconButton
            icon="account-edit-outline"
            size={22}
            iconColor={theme.colors.primary}
            onPress={onEdit}
            style={styles.actionBtn}
          />
          <IconButton
            icon="delete-sweep-outline"
            size={22}
            iconColor={theme.colors.error}
            onPress={onDelete}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 70 : 60, paddingBottom: 44, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerContent: { alignItems: 'flex-start' },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', marginTop: 6, letterSpacing: 1 },
  scrollContent: { padding: 20, paddingTop: 30 },
  grid: { gap: 16 },
  userCard: { borderRadius: 32, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  cardInner: { padding: 18, flexDirection: 'row', alignItems: 'center' },
  avatarSection: { alignItems: 'center', position: 'relative' },
  avatar: { borderWidth: 1, borderColor: '#F1F5F9' },
  avatarLabel: { fontWeight: '900' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: -12, borderWidth: 2, borderColor: '#FFFFFF', elevation: 4 },
  roleText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  infoSection: { flex: 1, marginLeft: 20 },
  userName: { fontSize: 17, fontWeight: '900', color: '#111827' },
  userEmail: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginTop: 2 },
  userMetadata: { fontSize: 11, color: '#94A3B8', fontWeight: '900', marginTop: 8, letterSpacing: 1 },
  actionSection: { alignItems: 'center' },
  actionBtn: { backgroundColor: '#F8FAFC', marginVertical: 4 },
  fab: { position: 'absolute', margin: 24, right: 10, bottom: 85, borderRadius: 20 }
});

export default ManageUsersScreen;
