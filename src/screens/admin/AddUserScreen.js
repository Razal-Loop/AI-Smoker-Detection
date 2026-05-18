import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, RadioButton, ActivityIndicator, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { addUser } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const AddUserScreen = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getAccentColor = () => {
    switch (role) {
      case 'student': return '#06B6D4';
      case 'guard': return '#F59E0B';
      case 'security_head': return '#22C55E';
      default: return '#0F172A';
    }
  };

  const accentColor = getAccentColor();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Gallery permission required');

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (err) { setError('Failed to pick image'); }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Camera permission required');
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (err) { setError('Failed to take photo'); }
  };

  const handleAddUser = async () => {
    if (!name || !email || !password) return setError('Fill all required fields');
    if (role === 'student' && (!studentId || !photoUri)) return setError('Student ID and Photo required');

    setLoading(true);
    setError('');
    try {
      const userData = { name, role, ...(role === 'student' && { studentId, photoUri }) };
      let authToken = null;
      if (currentUser) authToken = await currentUser.getIdToken();
      await addUser(email, password, userData, authToken);
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      setError(err.message || 'Enrollment failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Card style={styles.mainCard} elevation={2}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.header}>
                  <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Register New User</Text>
                  <Text style={styles.headerSubtitle}>Enter user details to create a new account</Text>
                </View>

                <TextInput
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#E2E8F0"
                  activeOutlineColor={accentColor}
                  textColor="#1E293B"
                />
                <TextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#E2E8F0"
                  activeOutlineColor={accentColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textColor="#1E293B"
                />
                <TextInput
                  label="Account Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#E2E8F0"
                  activeOutlineColor={accentColor}
                  secureTextEntry
                  textColor="#1E293B"
                />

                <Text style={styles.sectionLabel}>Select Account Type</Text>
                <View style={styles.radioContainer}>
                  {['student', 'guard', 'security_head'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRole(r)}
                      style={[
                        styles.radioItem,
                        role === r && { borderColor: accentColor, backgroundColor: accentColor + '10' }
                      ]}
                      activeOpacity={0.6}
                    >
                      <RadioButton
                        value={r}
                        status={role === r ? 'checked' : 'unchecked'}
                        color={accentColor}
                        onPress={() => setRole(r)}
                      />
                      <Text style={[styles.radioText, role === r && { color: accentColor, fontWeight: '800' }]}>
                        {r.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {role === 'student' && (
                  <View style={styles.studentSection}>
                    <TextInput
                      label="Student ID Number"
                      value={studentId}
                      onChangeText={setStudentId}
                      mode="outlined"
                      style={styles.input}
                      outlineColor="#E2E8F0"
                      activeOutlineColor={accentColor}
                      textColor="#1E293B"
                    />
                    <Text style={styles.sectionLabel}>Student Photo (Required for Detection)</Text>
                    <View style={styles.photoBox}>
                      {photoUri ? (
                        <View style={styles.imageWrapper}>
                          <Image source={{ uri: photoUri }} style={[styles.previewImage, { borderColor: accentColor }]} />
                          <IconButton
                            icon="close-circle"
                            iconColor="#EF4444"
                            size={28}
                            style={styles.removeBtn}
                            onPress={() => setPhotoUri(null)}
                          />
                        </View>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Icon name="face-recognition" size={56} color="#CBD5E1" />
                          <Text style={styles.placeholderText}>No Photo Selected</Text>
                        </View>
                      )}
                      <View style={styles.photoActions}>
                        <Button
                          mode="outlined"
                          icon="image-plus"
                          onPress={pickImage}
                          style={styles.imgBtn}
                          textColor={accentColor}
                          outlineColor={accentColor}
                        >
                          GALLERY
                        </Button>
                        <Button
                          mode="outlined"
                          icon="camera-account"
                          onPress={takePhoto}
                          style={styles.imgBtn}
                          textColor={accentColor}
                          outlineColor={accentColor}
                        >
                          TAKE PHOTO
                        </Button>
                      </View>
                    </View>
                  </View>
                )}

                <Button
                  mode="contained"
                  onPress={handleAddUser}
                  loading={loading}
                  disabled={loading}
                  style={[styles.submitBtn, { backgroundColor: accentColor }]}
                  labelStyle={styles.submitBtnLabel}
                >
                  Create User Account
                </Button>
              </Card.Content>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Snackbar visible={!!error} onDismiss={() => setError('')} style={styles.errorSnack}>
        <Text style={styles.snackText}>{error}</Text>
      </Snackbar>
      <Snackbar visible={success} onDismiss={() => setSuccess(false)} style={styles.successSnack}>
        <Text style={styles.snackText}>User Registered Successfully!</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  mainCard: { borderRadius: 32, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  cardContent: { padding: 24 },
  header: { marginBottom: 32 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  headerSubtitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, marginTop: 6 },
  input: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginTop: 16, marginBottom: 16 },
  radioContainer: { marginBottom: 20 },
  radioItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 20, marginBottom: 10, paddingRight: 16 },
  radioText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  studentSection: { marginTop: 10 },
  photoBox: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  imageWrapper: { position: 'relative' },
  previewImage: { width: 160, height: 160, borderRadius: 80, borderWidth: 4 },
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFFFFF', elevation: 4, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } : {}) },
  photoPlaceholder: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
  placeholderText: { fontSize: 10, fontWeight: '900', color: '#94A3B8', marginTop: 12 },
  photoActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  imgBtn: { flex: 1, borderRadius: 16, height: 50, justifyContent: 'center' },
  submitBtn: { marginTop: 36, borderRadius: 20, paddingVertical: 8 },
  submitBtnLabel: { fontWeight: '900', letterSpacing: 1.5, fontSize: 15, color: '#FFFFFF' },
  errorSnack: { backgroundColor: '#EF4444', borderRadius: 12 },
  successSnack: { backgroundColor: '#10B981', borderRadius: 12 },
  snackText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' }
});

export default AddUserScreen;
