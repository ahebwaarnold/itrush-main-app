import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, Clock, Trash2, Upload, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BookPickupScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    pickup_location: user?.address || '',
    location_lat: 0,
    location_lon: 0,
    waste_type: 'Residential',
    pickup_date: new Date(),
    pickup_time: new Date(),
    estimated_kg: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Convert USD to UGX (1 USD ≈ 3700 UGX)
  const USD_TO_UGX = 3700;
  const wasteTypes = [
    { value: 'Residential', label: 'Residential', costUSD: 2 },
    { value: 'Commercial', label: 'Commercial', costUSD: 5 },
    { value: 'Public', label: 'Public', costUSD: 3 },
  ];

  useEffect(() => {
    // Request location permissions on mount
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to use current location');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const address = geocode[0];
        const addressString = [
          address.street,
          address.district,
          address.city,
          address.country,
        ]
          .filter(Boolean)
          .join(', ') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        setFormData({
          ...formData,
          pickup_location: addressString,
          location_lat: latitude,
          location_lon: longitude,
        });
      } else {
        setFormData({
          ...formData,
          pickup_location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          location_lat: latitude,
          location_lon: longitude,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permission is required to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `trash-images/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('trash-images')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trash-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const calculateCost = () => {
    const selectedType = wasteTypes.find((t) => t.value === formData.waste_type);
    return selectedType ? selectedType.costUSD * USD_TO_UGX : 0;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const validateForm = () => {
    if (!formData.pickup_location) {
      setError('Please enter a pickup location');
      return false;
    }

    // Combine date and time to check if it's in the future
    const pickupDate = new Date(formData.pickup_date);
    const pickupTime = new Date(formData.pickup_time);
    pickupDate.setHours(pickupTime.getHours());
    pickupDate.setMinutes(pickupTime.getMinutes());
    pickupDate.setSeconds(0);
    pickupDate.setMilliseconds(0);

    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    if (pickupDate <= now) {
      setError('Please select a date and time in the future');
      return false;
    }

    return true;
  };

  const handleBookPickup = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Upload image if present
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadImageToSupabase(imageUri);
        if (!imageUrl) {
          console.warn('Image upload failed, continuing without image');
        }
      }

      // Combine date and time
      const pickupDate = new Date(formData.pickup_date);
      const pickupTime = new Date(formData.pickup_time);
      pickupDate.setHours(pickupTime.getHours());
      pickupDate.setMinutes(pickupTime.getMinutes());
      pickupDate.setSeconds(0);
      pickupDate.setMilliseconds(0);

      const cost = calculateCost();

      const orderData: any = {
        user_id: user.id,
        pickup_location: formData.pickup_location,
        waste_type: formData.waste_type,
        pickup_time: pickupDate.toISOString(),
        cost,
        status: 'Pending',
      };

      if (formData.location_lat && formData.location_lon) {
        orderData.location_lat = formData.location_lat;
        orderData.location_lon = formData.location_lon;
      }

      if (formData.estimated_kg) {
        orderData.estimated_kg = parseFloat(formData.estimated_kg);
      }

      if (imageUrl) {
        orderData.image_url = imageUrl;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      Alert.alert(
        'Success',
        'Your pickup has been scheduled! You can track it in the Orders tab.',
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/(tabs)/orders'),
          },
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                pickup_location: user.address || '',
                location_lat: 0,
                location_lon: 0,
                waste_type: 'Residential',
                pickup_date: new Date(),
                pickup_time: new Date(),
                estimated_kg: '',
              });
              setImageUri(null);
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to book pickup');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book a Pickup</Text>
        <Text style={styles.subtitle}>Schedule your waste collection</Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MapPin color="#007BFF" size={20} />
            <Text style={styles.label}>Pickup Location</Text>
          </View>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="Enter pickup address"
              placeholderTextColor="#999"
              value={formData.pickup_location}
              onChangeText={(text) => setFormData({ ...formData, pickup_location: text })}
              multiline
            />
            <TouchableOpacity
              style={[styles.locationButton, locationLoading && styles.buttonDisabled]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              <Text style={styles.locationButtonText}>
                {locationLoading ? '...' : '📍'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tap 📍 to use your current location</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Trash2 color="#007BFF" size={20} />
            <Text style={styles.label}>Waste Type</Text>
          </View>
          <View style={styles.wasteTypeContainer}>
            {wasteTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.wasteTypeButton,
                  formData.waste_type === type.value && styles.wasteTypeButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, waste_type: type.value })}
              >
                <Text
                  style={[
                    styles.wasteTypeText,
                    formData.waste_type === type.value && styles.wasteTypeTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
                <Text
                  style={[
                    styles.wasteTypeCost,
                    formData.waste_type === type.value && styles.wasteTypeCostSelected,
                  ]}
                >
                  {new Intl.NumberFormat('en-US').format(type.costUSD * USD_TO_UGX)} UGX
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Calendar color="#007BFF" size={20} />
            <Text style={styles.label}>Pickup Date</Text>
          </View>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              {formatDate(formData.pickup_date)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.pickup_date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setFormData({ ...formData, pickup_date: selectedDate });
                }
              }}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Clock color="#007BFF" size={20} />
            <Text style={styles.label}>Pickup Time</Text>
          </View>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateTimeText}>
              {formatTime(formData.pickup_time)}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={formData.pickup_time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setFormData({ ...formData, pickup_time: selectedTime });
                }
              }}
              is24Hour={true}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Kilograms</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5.5"
            placeholderTextColor="#999"
            value={formData.estimated_kg}
            onChangeText={(text) => setFormData({ ...formData, estimated_kg: text })}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Approximate weight of waste in kilograms</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Upload color="#007BFF" size={20} />
            <Text style={styles.label}>Trash Picture</Text>
            <Text style={styles.optionalLabel}>(Optional)</Text>
          </View>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <X color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Upload color="#007BFF" size={24} />
              <Text style={styles.uploadButtonText}>Upload Picture</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>Upload a photo of the waste (optional)</Text>
        </View>

        <View style={styles.costContainer}>
          <Text style={styles.costLabel}>Estimated Cost</Text>
          <Text style={styles.costValue}>
            {new Intl.NumberFormat('en-US').format(calculateCost())} UGX
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleBookPickup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Booking...' : 'Book Pickup'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <Text style={styles.infoText}>
            1. Your booking will be assigned to a nearby service provider{'\n'}
            2. You'll receive a notification when a truck is assigned{'\n'}
            3. Track your pickup in real-time from the Orders tab{'\n'}
            4. Payment will be processed after successful collection
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#007BFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  form: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  optionalLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#007BFF',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  locationButtonText: {
    fontSize: 20,
  },
  wasteTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  wasteTypeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  wasteTypeButtonSelected: {
    borderColor: '#007BFF',
    backgroundColor: '#E3F2FD',
  },
  wasteTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  wasteTypeTextSelected: {
    color: '#007BFF',
  },
  wasteTypeCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  wasteTypeCostSelected: {
    color: '#007BFF',
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#D32F2F',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007BFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
  },
  uploadButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  costContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28A745',
  },
  costValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007BFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
