import React from 'react';
import {  View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Platform , useWindowDimensions } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';



const WelcomeScreen = () => {
  const { width, height } = useWindowDimensions();

  const navigation = useNavigation();
  const theme = useTheme();

  const roles = [
    {
      id: 'admin',
      label: 'COMMAND CENTER',
      icon: 'shield-account',
      color: theme.colors.primary,
      description: 'System-wide surveillance & administration',
      navigateTo: 'AdminLogin',
    },
    {
      id: 'security_head',
      label: 'SECURITY HEAD',
      icon: 'brain',
      color: theme.colors.success,
      description: 'Review audits & strategic intelligence',
      navigateTo: 'SecurityHeadLogin',
    },
    {
      id: 'guard',
      label: 'FIELD OPERATIVE',
      icon: 'security',
      color: theme.colors.warning,
      description: 'Real-time response & enforcement',
      navigateTo: 'GuardLogin',
    },
    {
      id: 'student',
      label: 'STUDENT PORTAL',
      icon: 'account-school',
      color: '#EC4899', // Keeping a vibrant pink for students
      description: 'Personal records & active challans',
      navigateTo: 'StudentLogin',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="smoke-detector-variant" size={72} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>AI SMOKER DETECTION</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRISM v1.0.0</Text>
          </View>
        </View>

        <View style={styles.rolesGrid}>
          <Text style={styles.sectionTitle}>SELECT ACCESS PROTOCOL</Text>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => navigation.navigate(role.navigateTo)}
              activeOpacity={0.7}
            >
              <Card style={styles.roleCard} elevation={2}>
                <View style={styles.cardContent}>
                  <View style={[styles.iconBox, { backgroundColor: role.color + '15' }]}>
                    <Icon name={role.icon} size={36} color={role.color} />
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={[styles.roleLabel, { color: theme.colors.onSurface }]}>{role.label}</Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={28} color="#CBD5E1" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SYSTEMS ONLINE // ENCRYPTION ENABLED</Text>
          <View style={[styles.statusLine, { backgroundColor: theme.colors.success }]} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 52 },
  logoContainer: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  badge: { backgroundColor: 'rgba(15, 23, 42, 0.05)', paddingHorizontal: 18, paddingVertical: 6, borderRadius: 24, marginTop: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  badgeText: { color: '#0F172A', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  sectionTitle: { color: '#64748B', fontSize: 13, fontWeight: '900', letterSpacing: 2.5, marginBottom: 28, textAlign: 'center' },
  rolesGrid: { gap: 16 , maxWidth: 600, alignSelf: 'center', width: '100%'},
  roleCard: { backgroundColor: '#FFFFFF', borderRadius: 32, overflow: 'hidden' },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  iconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  textColumn: { flex: 1 },
  roleLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  roleDesc: { fontSize: 13, color: '#64748B', fontWeight: '600', lineHeight: 18 },
  footer: { marginTop: 60, alignItems: 'center' },
  footerText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },
  statusLine: { width: 44, height: 3, marginTop: 14, borderRadius: 2 }
});

export default WelcomeScreen;
