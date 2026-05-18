import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, StatusBar, Platform } from 'react-native';
import { Card, Text, ActivityIndicator, Avatar, TextInput, Button, useTheme, TouchableRipple, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { getUserById, updateUser } from '../../services/userService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = () => {
  const { currentUser, logout } = useAuth();
  const theme = useTheme();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      if (currentUser) {
        const data = await getUserById(currentUser.uid);
        setUserData(data);
        setEditName(data?.name || '');
      }
    } catch (error) { console.error('Error loading user data:', error); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Terminate current secure session?');
      if (!confirmed) return;
      try {
        await logout();
      } catch (err) {
        console.error("Logout error:", err);
        window.alert("System was unable to terminate session safely.");
      }
    } else {
      Alert.alert(
        "CONFIRM LOGOUT",
        "Terminate current secure session?",
        [
          { text: "CANCEL", style: "cancel" },
          {
            text: "TERMINATE",
            onPress: async () => {
              try {
                await logout();
              } catch (err) {
                console.error("Logout error:", err);
                Alert.alert("Logout Failed", "System was unable to terminate session safely.");
              }
            },
            style: 'destructive'
          }
        ]
      );
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Gallery permissions denied');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setEditPhotoUri(result.assets[0].uri);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return Alert.alert('Error', 'Name required');
    setSaving(true);
    try {
      const updates = { name: editName, ...(editPhotoUri && { photoUri: editPhotoUri }) };
      await updateUser(currentUser.uid, updates);
      await loadUserData();
      setEditing(false);
      setEditPhotoUri(null);
      Alert.alert('Success', 'Profile Updated Successfully');
    } catch (err) { Alert.alert('Error', err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#0F172A" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
          <View style={styles.navBar}>
            <Text style={styles.navTitle}>MY PROFILE</Text>
            <IconButton
              icon="logout-variant"
              iconColor="#FFFFFF"
              size={22}
              onPress={handleLogout}
              style={styles.logoutBtn}
            />
          </View>

          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={editing ? handlePickImage : null} disabled={!editing} style={styles.avatarTouch}>
              {editPhotoUri || userData?.photoUrl ? (
                <Image source={{ uri: editPhotoUri || userData.photoUrl }} style={styles.avatarImage} />
              ) : (
                <Avatar.Text size={130} label={userData?.name?.charAt(0)?.toUpperCase() || 'U'} style={styles.avatar} color="#fff" />
              )}
              {editing && (
                <View style={styles.editOverlay}>
                  <Icon name="camera-enhance" size={36} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            {!editing && userData?.photoUrl && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={24} color="#10B981" />
              </View>
            )}
          </View>

          <View style={styles.headerText}>
            {editing ? (
              <TextInput
                value={editName}
                onChangeText={setEditName}
                mode="flat"
                style={styles.editNameInput}
                textColor="#FFFFFF"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
            ) : (
              <Text style={styles.name}>{userData?.name || 'My Name'}</Text>
            )}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userData?.role?.replace('_', ' ').toUpperCase() || 'STUDENT'}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY INFORMATION</Text>
            <Button
              mode={editing ? "contained" : "text"}
              onPress={editing ? handleSaveProfile : () => setEditing(true)}
              loading={saving}
              icon={editing ? "content-save-check" : "account-edit"}
              buttonColor={editing ? "#10B981" : "transparent"}
              textColor={editing ? "#FFFFFF" : "#0F172A"}
              labelStyle={{ fontWeight: '900', letterSpacing: 1 }}
              style={styles.editBtn}
            >
              {editing ? "SAVE PROFILE" : "EDIT PROFILE"}
            </Button>
          </View>

          <Card style={styles.infoCard} elevation={2}>
            <Card.Content style={styles.cardContent}>
              <InfoRow icon="fingerprint" label="STUDENT ID" value={userData?.studentId || 'N/A'} color="#0F172A" />
              <Divider style={styles.divider} />
              <InfoRow icon="email-check-outline" label="EMAIL ADDRESS" value={currentUser?.email} color="#334155" />
              <Divider style={styles.divider} />
              <InfoRow icon="shield-check" label="ACCOUNT STATUS" value="ACTIVE" color="#10B981" />
            </Card.Content>
          </Card>

          <Text style={[styles.sectionTitle, { marginTop: 32 }]}>SECURITY SETTINGS</Text>
          <Card style={styles.infoCard} elevation={2}>
            <TouchableRipple onPress={() => Alert.alert("ACCESS RESTRICTED", "Password modifications must be requested via the Security Department.")}>
              <View style={styles.settingRow}>
                <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
                  <Icon name="shield-key-outline" size={24} color="#0F172A" />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>MANAGE PASSWORD</Text>
                  <Text style={styles.infoValue}>Update Account Security</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#CBD5E1" />
              </View>
            </TouchableRipple>
          </Card>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const Divider = ({ style }) => <View style={[styles.dividerLine, style]} />;

const InfoRow = ({ icon, label, value, color }) => (
  <View style={styles.infoRow} >
    <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 60, paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  navBar: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  navTitle: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  logoutBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  avatarWrapper: { marginBottom: 24, position: 'relative' },
  avatarTouch: { position: 'relative', elevation: 20, ...(Platform.OS === 'web' ? { boxShadow: '0 10px 15px rgba(0,0,0,0.3)' } : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15 }) },
  avatar: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' },
  avatarImage: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: '#FFFFFF' },
  editOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 65, justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#FFFFFF', borderRadius: 15, padding: 2, elevation: 4 },
  headerText: { alignItems: 'center' },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  editNameInput: { backgroundColor: 'rgba(255,255,255,0.1)', height: 50, width: 260, textAlign: 'center', color: '#FFFFFF', fontSize: 22, borderRadius: 16, fontWeight: '900' },
  roleBadge: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  roleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 2 },
  infoCard: { borderRadius: 32, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  cardContent: { padding: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  infoText: { marginLeft: 16, flex: 1 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900', letterSpacing: 1.5 },
  infoValue: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 4 },
  dividerLine: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 24 },
  editBtn: { borderRadius: 16 }
});

export default ProfileScreen;
