import React, { useState, useEffect } from 'react';
import {  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Dimensions, StatusBar, Alert, Image, TouchableOpacity , useWindowDimensions } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Snackbar,
  RadioButton,
  ActivityIndicator,
  useTheme,
  Avatar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserById, updateUser } from '../../services/userService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';



const EditUserScreen = () => {
  const { width, height } = useWindowDimensions();

  const route = useRoute();
  const navigation = useNavigation();
  const theme = useTheme();
  const { userId } = route.params;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getUserById(userId);
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
        setRole(user.role || 'student');
        setStudentId(user.studentId || '');
        setPhotoUrl(user.photoUrl || null);
      }
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
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
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleUpdateUser = async () => {
    if (!name || !email) {
      setError('Please fill in all required fields');
      return;
    }

    if (role === 'student' && !studentId) {
      setError('Student ID is required for students');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updates = {
        name,
        email,
        role,
        ...(password && password.length >= 6 && { password }),
        ...(role === 'student' && { studentId }),
        ...(photoUri && { photoUri }),
      };

      await updateUser(userId, updates);

      setSuccess(true);
      setError('');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarTouch}>
            {photoUri || photoUrl ? (
              <Image source={{ uri: photoUri || photoUrl }} style={styles.avatarImg} />
            ) : (
              <Avatar.Icon size={120} icon="account" backgroundColor="rgba(255,255,255,0.1)" color="#FFFFFF" />
            )}
            <View style={styles.camBadge}>
              <Icon name="camera-plus" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <TextInput
                label="FULL IDENTITY"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="account-circle-outline" />}
              />

              <TextInput
                label="SECURE EMAIL"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                left={<TextInput.Icon icon="email-outline" />}
              />

              <TextInput
                label="OVERRIDE PASSWORD"
                placeholder="Leave blank to keep current"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                left={<TextInput.Icon icon="key-outline" />}
              />

              <Text style={styles.roleLabel}>ACCESS CLEARANCE</Text>
              <View style={styles.roleContainer}>
                <RoleOption label="Student" value="student" selected={role} onSelect={setRole} />
                <RoleOption label="Guard" value="guard" selected={role} onSelect={setRole} />
                <RoleOption label="Head" value="security_head" selected={role} onSelect={setRole} />
              </View>

              {role === 'student' && (
                <TextInput
                  label="STUDENT TRACKING ID"
                  value={studentId}
                  onChangeText={setStudentId}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="fingerprint" />}
                />
              )}

              <Button
                mode="contained"
                onPress={handleUpdateUser}
                loading={saving}
                disabled={saving}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                EXECUTE UPDATES
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        style={{ backgroundColor: theme.colors.error }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={success}
        onDismiss={() => setSuccess(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors.success }}
      >
        Entity authorization updated.
      </Snackbar>
    </View>
  );
};

const RoleOption = ({ label, value, selected, onSelect }) => {
  const isSelected = selected === value;
  return (
    <TouchableOpacity
      onPress={() => onSelect(value)}
      style={[styles.roleBox, isSelected && styles.roleBoxActive]}
    >
      <Text style={[styles.roleBoxText, isSelected && styles.roleBoxTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center' },
  headerNav: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2.5 },
  avatarContainer: { marginTop: 24 },
  avatarTouch: { position: 'relative' },
  avatarImg: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#FFFFFF' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#06B6D4', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24 },
  card: { borderRadius: 32, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  input: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  roleLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  roleContainer: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBox: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  roleBoxActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  roleBoxText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  roleBoxTextActive: { color: '#FFFFFF' },
  button: { marginTop: 12, borderRadius: 16, backgroundColor: '#0F172A' },
  buttonContent: { height: 56 },
  buttonLabel: { fontWeight: '900', letterSpacing: 1 },
});

export default EditUserScreen;
