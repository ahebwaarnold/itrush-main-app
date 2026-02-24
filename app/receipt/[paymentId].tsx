import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { CheckCircle, ArrowLeft, Download } from 'lucide-react-native';

interface PaymentWithOrder {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  orders: {
    pickup_location: string;
    waste_type: string;
    pickup_time: string;
    users: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

export default function ReceiptScreen() {
  const { paymentId } = useLocalSearchParams();
  const [payment, setPayment] = useState<PaymentWithOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentId) {
      loadReceipt();
    }
  }, [paymentId]);

  const loadReceipt = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders:order_id (
          pickup_location,
          waste_type,
          pickup_time,
          users:user_id (
            name,
            email,
            phone
          )
        )
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      console.error('Error loading receipt:', error);
    } else {
      setPayment(data as any);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Receipt</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading receipt...</Text>
        </View>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Receipt</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Receipt not found</Text>
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
        <Text style={styles.title}>Receipt</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.successBanner}>
          <CheckCircle color="#28A745" size={64} />
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtitle}>
            Your payment has been processed successfully
          </Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>iTRUSH</Text>
            <Text style={styles.receiptSubtitle}>Payment Receipt</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Transaction ID</Text>
            <Text style={styles.sectionValue}>{payment.transaction_id}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date & Time</Text>
            <Text style={styles.sectionValue}>
              {new Date(payment.created_at).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Method</Text>
            <Text style={styles.sectionValue}>{payment.payment_method}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{payment.orders.users.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{payment.orders.users.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{payment.orders.users.phone}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service:</Text>
              <Text style={styles.detailValue}>Waste Collection</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Waste Type:</Text>
              <Text style={styles.detailValue}>{payment.orders.waste_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {payment.orders.pickup_location}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup Time:</Text>
              <Text style={styles.detailValue}>
                {new Date(payment.orders.pickup_time).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount Paid</Text>
            <Text style={styles.totalAmount}>{new Intl.NumberFormat('en-US').format(payment.amount)} UGX</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>PAID</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for using iTRUSH. For any inquiries, contact KCCA Waste Management
            Department.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Text style={styles.buttonText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
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
  successBanner: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28A745',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 4,
  },
  receiptSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  totalSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28A745',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
  },
  footer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
