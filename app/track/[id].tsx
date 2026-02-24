import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Order } from '@/lib/supabase';
import { MapPin, Clock, Truck, CheckCircle, ArrowLeft } from 'lucide-react-native';

export default function TrackOrderScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error loading order:', error);
    } else {
      setOrder(data);
    }

    setLoading(false);
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Assigned':
        return 2;
      case 'Completed':
        return 3;
      case 'Failed':
        return 0;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Track Order</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Track Order</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Track Order</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.mapPlaceholder}>
          <MapPin color="#007BFF" size={48} />
          <Text style={styles.mapText}>Map View Coming Soon</Text>
          <Text style={styles.mapSubtext}>
            Real-time tracking will show the truck location here
          </Text>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.orderInfoTitle}>Order Details</Text>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Waste Type:</Text>
            <Text style={styles.orderInfoValue}>{order.waste_type}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Location:</Text>
            <Text style={styles.orderInfoValue}>{order.pickup_location}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Scheduled Time:</Text>
            <Text style={styles.orderInfoValue}>
              {new Date(order.pickup_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          {order.cost && (
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>Cost:</Text>
              <Text style={[styles.orderInfoValue, styles.costValue]}>
                {new Intl.NumberFormat('en-US').format(order.cost * 3700)} UGX
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Order Status</Text>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, currentStep >= 1 && styles.timelineIconActive]}>
                <Clock color={currentStep >= 1 ? '#fff' : '#ccc'} size={20} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, currentStep >= 1 && styles.timelineLabelActive]}>
                  Order Placed
                </Text>
                <Text style={styles.timelineTime}>
                  {new Date(order.created_at).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={[styles.timelineLine, currentStep >= 2 && styles.timelineLineActive]} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, currentStep >= 2 && styles.timelineIconActive]}>
                <Truck color={currentStep >= 2 ? '#fff' : '#ccc'} size={20} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, currentStep >= 2 && styles.timelineLabelActive]}>
                  Truck Assigned
                </Text>
                <Text style={styles.timelineTime}>
                  {currentStep >= 2 ? 'In progress' : 'Waiting for assignment'}
                </Text>
              </View>
            </View>

            <View style={[styles.timelineLine, currentStep >= 3 && styles.timelineLineActive]} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, currentStep >= 3 && styles.timelineIconActive]}>
                <CheckCircle color={currentStep >= 3 ? '#fff' : '#ccc'} size={20} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, currentStep >= 3 && styles.timelineLabelActive]}>
                  Completed
                </Text>
                <Text style={styles.timelineTime}>
                  {order.completed_at
                    ? new Date(order.completed_at).toLocaleString()
                    : 'Not yet completed'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {order.status === 'Failed' && (
          <View style={styles.failedBanner}>
            <Text style={styles.failedText}>
              This order could not be completed. Please contact support or create a new order.
            </Text>
          </View>
        )}

        {order.status === 'Pending' && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Your order is pending assignment. A service provider will be assigned soon.
            </Text>
          </View>
        )}

        {order.status === 'Assigned' && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              A truck has been assigned to your order! The collection team is on the way.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#007BFF',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#DC3545',
    marginBottom: 24,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    borderRadius: 12,
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007BFF',
    marginTop: 16,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  orderInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  costValue: {
    color: '#28A745',
    fontSize: 16,
  },
  statusContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconActive: {
    backgroundColor: '#007BFF',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 24,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  timelineLabelActive: {
    color: '#333',
  },
  timelineTime: {
    fontSize: 14,
    color: '#999',
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#f0f0f0',
    marginLeft: 19,
    marginVertical: -8,
  },
  timelineLineActive: {
    backgroundColor: '#007BFF',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  failedBanner: {
    backgroundColor: '#FFEBEE',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  failedText: {
    color: '#DC3545',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBanner: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  infoText: {
    color: '#FF8C00',
    fontSize: 14,
    lineHeight: 20,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  successText: {
    color: '#28A745',
    fontSize: 14,
    lineHeight: 20,
  },
});
