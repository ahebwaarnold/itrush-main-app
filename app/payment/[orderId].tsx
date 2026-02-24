import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase, Order } from '@/lib/supabase';
import { CreditCard, Smartphone, ArrowLeft, CheckCircle } from 'lucide-react-native';

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'Mobile Money' | 'Card'>('Mobile Money');

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } else {
      setOrder(data);
    }

    setLoading(false);
  };

  const processPayment = async () => {
    if (!order) return;

    setProcessing(true);

    try {
      const costInUGX = order.cost ? order.cost * 3700 : 0;
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: costInUGX,
          status: 'Completed',
          payment_method: selectedMethod,
          transaction_id: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      Alert.alert(
        'Payment Successful',
        `Your payment of ${new Intl.NumberFormat('en-US').format(costInUGX)} UGX has been processed successfully.`,
        [
          {
            text: 'View Receipt',
            onPress: () => router.push(`/receipt/${payment.id}`),
          },
          {
            text: 'Done',
            onPress: () => router.push('/(tabs)/orders'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Please try again');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading payment details...</Text>
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
          <Text style={styles.title}>Payment</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Waste Type:</Text>
            <Text style={styles.summaryValue}>{order.waste_type}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location:</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>
              {order.pickup_location}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pickup Time:</Text>
            <Text style={styles.summaryValue}>
              {new Date(order.pickup_time).toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              {order.cost ? `${new Intl.NumberFormat('en-US').format(order.cost * 3700)} UGX` : '0 UGX'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedMethod === 'Mobile Money' && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedMethod('Mobile Money')}
          >
            <View style={styles.paymentMethodIcon}>
              <Smartphone
                color={selectedMethod === 'Mobile Money' ? '#007BFF' : '#666'}
                size={28}
              />
            </View>
            <View style={styles.paymentMethodContent}>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  selectedMethod === 'Mobile Money' && styles.paymentMethodTitleSelected,
                ]}
              >
                MTN Mobile Money
              </Text>
              <Text style={styles.paymentMethodSubtitle}>
                Pay using your MTN Mobile Money account
              </Text>
            </View>
            {selectedMethod === 'Mobile Money' && (
              <CheckCircle color="#007BFF" size={24} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedMethod === 'Card' && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedMethod('Card')}
          >
            <View style={styles.paymentMethodIcon}>
              <CreditCard
                color={selectedMethod === 'Card' ? '#007BFF' : '#666'}
                size={28}
              />
            </View>
            <View style={styles.paymentMethodContent}>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  selectedMethod === 'Card' && styles.paymentMethodTitleSelected,
                ]}
              >
                Credit/Debit Card
              </Text>
              <Text style={styles.paymentMethodSubtitle}>
                Pay using Visa or Mastercard
              </Text>
            </View>
            {selectedMethod === 'Card' && <CheckCircle color="#007BFF" size={24} />}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Secure Payment</Text>
          <Text style={styles.infoText}>
            Your payment information is encrypted and secure. We use industry-standard
            security measures to protect your data.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={processPayment}
          disabled={processing}
        >
          <Text style={styles.payButtonText}>
            {processing ? 'Processing...' : `Pay ${order.cost ? new Intl.NumberFormat('en-US').format(order.cost * 3700) : 0} UGX`}
          </Text>
        </TouchableOpacity>
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
  },
  orderSummary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  paymentMethodSelected: {
    borderColor: '#007BFF',
    backgroundColor: '#E3F2FD',
  },
  paymentMethodIcon: {
    marginRight: 16,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  paymentMethodTitleSelected: {
    color: '#007BFF',
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  infoBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#28A745',
    margin: 16,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
