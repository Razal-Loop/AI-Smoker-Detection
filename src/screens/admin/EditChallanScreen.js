import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Snackbar,
  ActivityIndicator,
  RadioButton,
} from 'react-native-paper';
import { updateChallan } from '../../services/challanService';
import { getProofImageUrl } from '../../services/detectionService';
import { useRoute, useNavigation } from '@react-navigation/native';

const EditChallanScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { challan } = route.params || {};

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('pending');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (challan) {
      setAmount(challan.amount?.toString() || '');
      setStatus(challan.status || 'pending');
      setDescription(challan.description || '');
      setLocation(challan.location || '');
    }
  }, [challan]);

  const handleUpdate = async () => {
    if (!amount) {
      setError('Amount is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateChallan(challan.id, {
        amount: parseFloat(amount),
        status,
        description,
        location,
      });
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update challan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Edit Challan
            </Text>

            <Text variant="bodyMedium" style={styles.studentName}>
              Student: {challan?.studentName || 'Unknown'}
            </Text>

            {getProofImageUrl(challan) ? (
              <View style={styles.proofSection}>
                <Text variant="bodySmall" style={styles.proofLabel}>Detection proof</Text>
                <Image
                  source={{ uri: getProofImageUrl(challan) }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <TextInput
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              mode="outlined"
              keyboardType="numeric"
              left={<TextInput.Icon icon="currency-inr" />}
              style={styles.input}
            />

            <Text variant="bodyMedium" style={styles.statusLabel}>
              Status
            </Text>
            <RadioButton.Group onValueChange={setStatus} value={status}>
              <View style={styles.radioOption}>
                <RadioButton value="pending" />
                <Text>Pending</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="paid" />
                <Text>Paid</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="cancelled" />
                <Text>Cancelled</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              left={<TextInput.Icon icon="map-marker" />}
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              left={<TextInput.Icon icon="note-text" />}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleUpdate}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Update Challan
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={success}
        onDismiss={() => setSuccess(false)}
        duration={2000}
      >
        Challan updated successfully!
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  studentName: {
    marginBottom: 24,
    color: '#666',
  },
  proofSection: {
    marginBottom: 16,
  },
  proofLabel: {
    marginBottom: 8,
    color: '#64748b',
    fontWeight: '600',
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  input: {
    marginBottom: 16,
  },
  statusLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 4,
  },
});

export default EditChallanScreen;


