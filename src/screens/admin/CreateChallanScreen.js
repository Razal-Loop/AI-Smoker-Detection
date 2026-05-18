import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, ActivityIndicator, RadioButton, Searchbar, Chip, Divider, useTheme } from 'react-native-paper';
import { createChallan } from '../../services/challanService';
import { getUsers } from '../../services/userService';
import { getDetectionsWithStudents, getProofImageUrl } from '../../services/detectionService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const CreateChallanScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();

  const detectionFromRoute = route.params?.detection;
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);
  const [showDetections, setShowDetections] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('pending');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadStudents();
    loadRecentDetections();
  }, []);

  useEffect(() => {
    if (detectionFromRoute) {
      setDescription(detectionFromRoute.description || 'Smoking detected via AI camera system');
      setLocation(detectionFromRoute.location || 'Campus');
      const student = detectionFromRoute.matchedStudent || (detectionFromRoute.studentId ? {
        id: detectionFromRoute.studentId,
        name: detectionFromRoute.studentName,
        email: detectionFromRoute.studentEmail,
        studentId: detectionFromRoute.studentStudentId,
      } : null);
      if (student && (student.id || student.name || student.email)) setSelectedStudent(student);
    }
  }, [detectionFromRoute]);

  const loadStudents = async () => {
    try {
      const allStudents = await getUsers('student');
      setStudents(allStudents);
    } catch (err) { setError('Failed to load students'); }
    finally { setLoading(false); }
  };

  const loadRecentDetections = async () => {
    try {
      const detections = await getDetectionsWithStudents(20);
      setRecentDetections(detections);
    } catch (err) { console.error('Failed to load detections:', err); }
  };

  const handleSelectFromDetection = (detection) => {
    const student = detection.matchedStudent || (detection.studentId ? {
      id: detection.studentId,
      name: detection.studentName,
      email: detection.studentEmail,
      studentId: detection.studentStudentId,
    } : null);
    if (student && (student.id || student.name || student.email)) setSelectedStudent(student);
    setDescription(detection.description || 'Smoking detected via AI camera system');
    setLocation(detection.location || 'Campus');
    setShowDetections(false);
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) return setError('Invalid amount');
    if (!detectionFromRoute && !selectedStudent) return setError('Select a student');

    setSaving(true);
    setError('');

    try {
      const challanData = {
        studentId: selectedStudent?.id ?? null,
        studentName: selectedStudent?.name ?? (detectionFromRoute ? 'Unidentified' : undefined),
        amount: parseFloat(amount),
        status,
        description,
        location,
      };
      const proofUrl = getProofImageUrl(detectionFromRoute);
      if (proofUrl) { challanData.imageUrl = proofUrl; }
      await createChallan(challanData);
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) { setError(err.message || 'Creation failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.mainCard} elevation={2}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>INITIALIZE PENALTY</Text>
                <Text style={styles.headerSubtitle}>ENFORCEMENT PROTOCOL ACTIVATED</Text>
              </View>

              {recentDetections.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={() => setShowDetections(!showDetections)}
                  icon="camera-iris"
                  style={styles.toggleBtn}
                  textColor={theme.colors.primary}
                  buttonColor="#F8FAFC"
                >
                  {showDetections ? 'HIDE' : 'LINK RECENT DETECTION'} ({recentDetections.length})
                </Button>
              )}

              {showDetections && recentDetections.length > 0 && (
                <View style={styles.detectionsSection}>
                  <Text style={styles.sectionLabel}>RECENT ANALYTICS MATCHES</Text>
                  <ScrollView style={styles.detectionsScroll} nestedScrollEnabled horizontal showsHorizontalScrollIndicator={false}>
                    {recentDetections.map((detection) => (
                      <TouchableOpacity key={detection.id} onPress={() => handleSelectFromDetection(detection)} style={styles.detectionItem}>
                        <Image source={{ uri: getProofImageUrl(detection) }} style={styles.detThumb} />
                        <View style={styles.detInfo}>
                          <Text style={styles.detName}>{detection.matchedStudent?.name || 'UNKNOWN'}</Text>
                          <Text style={styles.detTime}>CONF: {(detection.matchConfidence * 100 || 0).toFixed(0)}%</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Divider style={styles.divider} />

              <Text style={styles.sectionLabel}>TARGET ENTITY</Text>
              <Searchbar
                placeholder="Search personnel..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                inputStyle={{ fontSize: 13 }}
              />

              <View style={styles.studentList}>
                {filteredStudents.slice(0, 5).map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => setSelectedStudent(student)}
                    style={[styles.studentItem, selectedStudent?.id === student.id && { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary, borderWidth: 1 }]}
                  >
                    <Icon
                      name={selectedStudent?.id === student.id ? "check-circle" : "account-circle-outline"}
                      size={22}
                      color={selectedStudent?.id === student.id ? theme.colors.primary : "#94A3B8"}
                    />
                    <View style={{ marginLeft: 16 }}>
                      <Text style={[styles.studentName, selectedStudent?.id === student.id && { color: theme.colors.primary }]}>
                        {student.name || student.email}
                      </Text>
                      <Text style={styles.studentId}>{student.studentId || 'NO_ID'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                label="FEE AMOUNT (₨)"
                value={amount}
                onChangeText={setAmount}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
              />

              <Text style={styles.sectionLabel}>STATUS CLASSIFICATION</Text>
              <View style={styles.radioGroup}>
                {['pending', 'paid', 'cancelled'].map((s) => {
                  let statusColor = s === 'paid' ? theme.colors.success : (s === 'cancelled' ? theme.colors.error : theme.colors.warning);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setStatus(s)}
                      style={[
                        styles.radioItem,
                        status === s && { borderColor: statusColor, backgroundColor: statusColor + '10' }
                      ]}
                    >
                      <RadioButton
                        value={s}
                        status={status === s ? 'checked' : 'unchecked'}
                        color={statusColor}
                        onPress={() => setStatus(s)}
                      />
                      <Text style={[styles.radioText, status === s && { color: statusColor, fontWeight: '800' }]}>
                        {s.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                label="OPERATIONAL LOCATION"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
              />
              <TextInput
                label="INCIDENT DESCRIPTION"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                textColor="#1E293B"
              />

              <Button
                mode="contained"
                onPress={handleCreate}
                loading={saving}
                disabled={saving}
                style={styles.submitBtn}
                buttonColor={theme.colors.primary}
                labelStyle={styles.submitBtnLabel}
              >
                LOG VIOLATION
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} style={{ backgroundColor: theme.colors.error, borderRadius: 12 }}>
        <Text style={styles.snackText}>{error}</Text>
      </Snackbar>
      <Snackbar visible={success} onDismiss={() => setSuccess(false)} style={{ backgroundColor: theme.colors.success, borderRadius: 12 }}>
        <Text style={styles.snackText}>PROTOCOL COMMITTED</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  mainCard: { borderRadius: 32, backgroundColor: '#FFFFFF' },
  cardContent: { padding: 24 },
  header: { marginBottom: 32 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  headerSubtitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginTop: 6 },
  toggleBtn: { borderRadius: 16, marginBottom: 24 },
  detectionsSection: { marginBottom: 24 },
  detectionsScroll: { paddingVertical: 12 },
  detectionItem: { width: 160, marginRight: 16, backgroundColor: '#F8FAFC', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  detThumb: { width: '100%', height: 100 },
  detInfo: { padding: 12 },
  detName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  detTime: { fontSize: 11, color: '#64748B', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 16, marginTop: 12 },
  searchbar: { borderRadius: 16, backgroundColor: '#F8FAFC', elevation: 0, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  studentList: { marginBottom: 24 },
  studentItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 10, backgroundColor: '#F8FAFC' },
  studentName: { fontSize: 15, fontWeight: '700' },
  studentId: { fontSize: 11, color: '#64748B', marginTop: 4 },
  input: { marginBottom: 20, backgroundColor: '#FFFFFF' },
  radioGroup: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  radioItem: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingRight: 12, backgroundColor: '#F8FAFC' },
  radioText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  submitBtn: { marginTop: 16, borderRadius: 20, paddingVertical: 8 },
  submitBtnLabel: { fontWeight: '900', letterSpacing: 2, fontSize: 15, color: '#FFFFFF' },
  snackText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  divider: { marginVertical: 32, backgroundColor: '#E2E8F0' }
});

export default CreateChallanScreen;
