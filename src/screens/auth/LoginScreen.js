import React, { useState } from 'react';
import { 
  View,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar
, useWindowDimensions } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  ActivityIndicator,
  useTheme,
  IconButton,
  TouchableRipple
} from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';



const LoginScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin' || userData.role === 'security_head') {
          navigation.replace('AdminTab');
        } else {
          navigation.replace('StudentTab');
        }
      }
    } catch (err) {
      setError(err.message.includes('auth/invalid-credential')
        ? 'Invalid email or password'
        : 'Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e1b4b']}
        style={styles.background}
      >
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              style={styles.logoGlow}
            >
              <IconButton icon="shield-lock" size={48} iconColor="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.welcomeText}>SECURE TERMINAL</Text>
          <Text style={styles.titleText}>SHIELD AI</Text>
        </View>

        <Surface style={styles.authCard} elevation={4}>
          <Text style={styles.authTitle}>INITIALIZE ACCESS</Text>
          <Text style={styles.authSub}>Enter credentials for biometric uplink</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <TextInput
            label="COMMANDER EMAIL"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account-circle-outline" color="#6366f1" />}
            autoCapitalize="none"
            outlineColor="#e2e8f0"
            activeOutlineColor="#6366f1"
          />

          <TextInput
            label="ACCESS KEY"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="key-outline" color="#6366f1" />}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
            outlineColor="#e2e8f0"
            activeOutlineColor="#6366f1"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            ESTABLISH CONNECTION
          </Button>

          <TouchableRipple
            onPress={() => navigation.navigate('Signup')}
            style={styles.signupLink}
          >
            <Text style={styles.signupText}>
              NEW ENTITY? <Text style={{ color: '#6366f1', fontWeight: '900' }}>REGISTER DATA</Text>
            </Text>
          </TouchableRipple>
        </Surface>

        <Text style={styles.footerText}>ENCRYPTED BY SHIELD INTELLIGENCE v4.0</Text>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topSection: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { marginBottom: 16 },
  logoGlow: { borderRadius: 24, padding: 4, elevation: 15, ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(99,102,241,0.5)' } : { shadowColor: '#6366f1', shadowOpacity: 0.5, shadowRadius: 20 }) },
  welcomeText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  titleText: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  authCard: { width: '100%', backgroundColor: '#fff', borderRadius: 32, padding: 32, paddingBottom: 40 , maxWidth: 450, alignSelf: 'center'},
  authTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
  authSub: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 24, fontWeight: '600' },
  input: { marginBottom: 16, backgroundColor: '#fff' },
  errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#fee2e2' },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  loginButton: { marginTop: 8, borderRadius: 16, backgroundColor: '#6366f1' },
  loginButtonContent: { height: 56 },
  loginButtonLabel: { fontWeight: '900', letterSpacing: 1 },
  signupLink: { marginTop: 24, alignItems: 'center' },
  signupText: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 1 },
  footerText: { position: 'absolute', bottom: 40, color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 2 }
});

export default LoginScreen;
