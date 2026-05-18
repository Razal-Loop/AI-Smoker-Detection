import React, { useState } from 'react';
import {  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar , useWindowDimensions } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, useTheme, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { login } from '../../services/authService';



const GuardLoginScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('ERROR: CREDENTIALS REQUIRED');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password, 'guard');
    } catch (err) {
      setError(err.message || 'AUTH_FAIL: REJECTED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.headerBackground}>
        <LinearGradient colors={theme.colors.headerGradient} style={styles.headerGradient}>
          <IconButton
            icon="chevron-left"
            iconColor="#fff"
            size={30}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <Icon name="security" size={52} color={theme.colors.warning} />
            </View>
            <Text style={styles.titleText}>FIELD SURVEILLANCE</Text>
            <Text style={styles.subtitleText}>OPERATIVE AUTHENTICATION</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.loginCard} elevation={4}>
            <Card.Content style={styles.cardInner}>
              <TextInput
                label="OPERATOR EMAIL"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                textColor="#111827"
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.warning}
                style={styles.input}
                left={<TextInput.Icon icon="account-badge-outline" iconColor="#6B7280" />}
              />

              <TextInput
                label="OPERATIONAL KEY"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                textColor="#111827"
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.warning}
                style={styles.input}
                left={<TextInput.Icon icon="shield-key-outline" iconColor="#6B7280" />}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
                labelStyle={styles.loginButtonLabel}
                buttonColor={theme.colors.warning}
              >
                DEFER TO STATION
              </Button>

              <View style={styles.securityTag}>
                <Icon name="sync" size={14} color={theme.colors.warning} />
                <Text style={[styles.securityText, { color: theme.colors.warning }]}>SYNCING WITH HUB...</Text>
              </View>
            </Card.Content>
          </Card>

          <Text style={styles.forgotText}>REPORT LOST CREDENTIALS TO HQ</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.errorSnackbar}
      >
        <Text style={styles.errorText}>{error}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  headerBackground: { height: 280, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
  headerGradient: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40 },
  backButton: { marginLeft: -12 },
  headerContent: { alignItems: 'center' },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
  subtitleText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
  scrollContent: { padding: 24, paddingTop: -40 },
  loginCard: { backgroundColor: '#FFFFFF', borderRadius: 32, marginTop: -40 , maxWidth: 450, alignSelf: 'center', width: '100%'},
  cardInner: { padding: 24 },
  input: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  loginButton: { marginTop: 10, borderRadius: 16 },
  loginButtonContent: { height: 64 },
  loginButtonLabel: { fontWeight: '900', letterSpacing: 2, fontSize: 14, color: '#FFFFFF' },
  securityTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, opacity: 0.8 },
  securityText: { fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 1.2 },
  forgotText: { textAlign: 'center', marginTop: 40, color: '#6B7280', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  errorSnackbar: { backgroundColor: '#EF4444', borderRadius: 16 },
  errorText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' }
});

export default GuardLoginScreen;
