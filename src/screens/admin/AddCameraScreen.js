import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, RadioButton, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { addCameraAPI } from '../../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const AddCameraScreen = () => {
  const theme = useTheme();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('IP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigation = useNavigation();

  const handleAddCamera = async () => {
    if (!id || !name || !url) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await addCameraAPI({ id, name, url, location, type });
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to add camera');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.mainCard} elevation={2}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>LINK NODE</Text>
                <Text style={styles.headerSubtitle}>INITIALIZE NEW CAMERA SENSOR</Text>
              </View>

              <Text style={styles.sectionLabel}>NODE ARCHITECTURE</Text>
              <TextInput
                label="Sensor ID"
                value={id}
                onChangeText={setId}
                mode="outlined"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
                autoCapitalize="none"
              />
              <TextInput
                label="Alias / Designation"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
              />
              <TextInput
                label="Feed URL / IP Address"
                value={url}
                onChangeText={setUrl}
                mode="outlined"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
                autoCapitalize="none"
                helperText="rtsp://ip:port/stream or 0 for local"
              />
              <TextInput
                label="Deployment Sector"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
              />

              <Text style={styles.sectionLabel}>NETWORK PROTOCOL</Text>
              <View style={styles.radioGroup}>
                {['IP', 'USB'].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.radioItem,
                      type === s && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
                    ]}
                  >
                    <RadioButton
                      value={s}
                      status={type === s ? 'checked' : 'unchecked'}
                      color={theme.colors.primary}
                      onPress={() => setType(s)}
                    />
                    <Text style={[styles.radioText, type === s && { color: theme.colors.primary, fontWeight: '800' }]}>
                      {s === 'IP' ? 'NETWORK (RTSP)' : 'LOCAL (USB)'}
                    </Text>
                  </View>
                ))}
              </View>

              <Button
                mode="contained"
                onPress={handleAddCamera}
                loading={loading}
                disabled={loading}
                style={styles.submitBtn}
                buttonColor={theme.colors.primary}
                labelStyle={styles.submitBtnLabel}
              >
                AUTHORIZE NODE
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: theme.colors.error, borderRadius: 12 }}>
        <Text style={styles.snackText}>{error}</Text>
      </Snackbar>
      <Snackbar visible={success} onDismiss={() => setSuccess(false)} duration={2000} style={{ backgroundColor: theme.colors.success, borderRadius: 12 }}>
        <Text style={styles.snackText}>NODE SUCCESSFULLY LINKED</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  mainCard: { borderRadius: 32, backgroundColor: '#FFFFFF' },
  cardContent: { padding: 24 },
  header: { marginBottom: 32 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  headerSubtitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 16, marginTop: 12 },
  input: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  radioGroup: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  radioItem: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingRight: 12, backgroundColor: '#F8FAFC' },
  radioText: { fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 1 },
  submitBtn: { marginTop: 16, borderRadius: 20, paddingVertical: 8 },
  submitBtnLabel: { fontWeight: '900', letterSpacing: 2, fontSize: 15, color: '#FFFFFF' },
  snackText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' }
});

export default AddCameraScreen;







