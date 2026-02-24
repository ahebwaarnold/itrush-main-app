# iTRUSH - Smart Waste Management System

iTRUSH is a comprehensive cross-platform mobile application designed to automate solid waste collection in the Greater Kampala Metropolitan Area (GKMA). The platform enables residents, businesses, service providers, and KCCA administrators to efficiently schedule, track, and manage waste collection services.

## 🎯 Project Overview

### Background
The GKMA, with a population of over 3.65 million, generates approximately 2,000 tons of solid waste daily. Only 56% is properly collected. iTRUSH addresses key challenges including:
- Irregular collection schedules
- Overcharges and varying fees
- Lack of digital infrastructure
- Accountability issues

### Objective
Transform waste management in GKMA through a user-friendly digital platform that promotes transparency, efficiency, and accountability.

## ✨ Features

### For Residents & Businesses
- ✅ **User Registration**: Secure account creation with email/password
- ✅ **Waste Pickup Booking**: Schedule collections with location, waste type, and time selection
- ✅ **Order Management**: View and track all orders with status updates
- ✅ **Real-Time Tracking**: Monitor assigned collection trucks
- ✅ **Payment Processing**: Secure payment after service completion
- ✅ **Digital Receipts**: Download payment receipts

### For Service Providers
- ✅ **Provider Dashboard**: View and manage assigned orders
- ✅ **Order Assignment**: Accept pending collection requests
- ✅ **Status Updates**: Mark orders as completed or failed
- ✅ **Customer Information**: Access pickup details and contact info

### For KCCA Administrators
- ✅ **Admin Dashboard**: System-wide statistics and metrics
- ✅ **User Management**: Monitor registered users
- ✅ **Order Monitoring**: Track all collection activities
- ✅ **Revenue Tracking**: View total payments processed
- ✅ **Provider Analytics**: Monitor service provider performance

## 💰 Pricing

- **Residential Waste**: $2 per collection
- **Commercial Waste**: $5 per collection
- **Public Waste**: $3 per collection

## 🛠 Technology Stack

### Frontend
- **React Native** with Expo SDK 54
- **Expo Router** for file-based navigation
- **TypeScript** for type safety
- **Lucide React Native** for icons

### Backend & Database
- **Supabase** (Backend-as-a-Service)
  - PostgreSQL database
  - Authentication & user management
  - Row Level Security (RLS)
  - Real-time capabilities

### Libraries & Tools
- `@supabase/supabase-js` - Supabase client
- `expo-router` - Navigation
- `lucide-react-native` - Icons
- `react-native-url-polyfill` - URL polyfill for Supabase

## 📁 Project Structure

```
├── app/
│   ├── (tabs)/                 # Tab navigation
│   │   ├── _layout.tsx        # Tabs configuration
│   │   ├── index.tsx          # Home screen
│   │   ├── book.tsx           # Booking screen
│   │   ├── orders.tsx         # Orders list
│   │   └── profile.tsx        # User profile
│   ├── payment/
│   │   └── [orderId].tsx      # Payment screen
│   ├── receipt/
│   │   └── [paymentId].tsx    # Receipt screen
│   ├── track/
│   │   └── [id].tsx           # Order tracking
│   ├── index.tsx              # Login screen
│   ├── signup.tsx             # Registration
│   ├── admin.tsx              # Admin dashboard
│   ├── provider-dashboard.tsx # Provider interface
│   └── _layout.tsx            # Root layout
├── contexts/
│   └── AuthContext.tsx        # Authentication state
├── lib/
│   └── supabase.ts            # Supabase client & types
├── scripts/
│   └── seed-data.sql          # Sample data
└── assets/                    # Images & resources
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Expo CLI (optional, but recommended)

### Installation

1. **Clone the repository**
```bash
git clone [repository-url]
cd itrush-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
The `.env` file contains Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**If you see "NetworkError when attempting to fetch resource" when signing in or signing up (especially on web):**  
The browser blocks requests from your app (e.g. `http://localhost:8081`) to Supabase (a different origin). Use the **same-origin proxy** below so the app talks to your dev server, which forwards to Supabase (no CORS).

- **Option A – Same-origin proxy (recommended for web):**
  1. In `app.json`, under `expo.web`, set `"output": "server"` (instead of `"single"`).
  2. Create the folder `app/supabase-proxy` and in it create a file named `[[...path]]+api.ts` with the contents from the **"Supabase proxy API route"** section at the end of this README.
  3. In `.env`, add a new line: `EXPO_PUBLIC_USE_SUPABASE_PROXY=true`
  4. Restart the dev server and run for web: `npx expo start --web`
  5. Sign in/sign up should work in the browser.
- **Option B – Without proxy:** Ensure the values above are set in `.env`, add `http://localhost:8081` in **Supabase Dashboard → Authentication → URL Configuration** (Site URL and Redirect URLs), restart the dev server, and try again (some environments still block due to CORS).

4. **Run the development server**
```bash
npm run dev
```

### Development Commands

```bash
npm run dev          # Start development server
npm run typecheck    # Run TypeScript type checking
npm run build:web    # Build for web platform
```

## 💾 Database Schema

### Tables

**users**
- id (uuid, PK)
- name (text)
- email (text, unique)
- phone (text)
- gender (text)
- address (text)
- user_type (text: resident, business, admin, provider)
- created_at (timestamptz)

**service_providers**
- id (uuid, PK)
- name (text)
- contact (text)
- area (text)
- location_lat (decimal)
- location_lon (decimal)
- status (text: active, inactive)
- created_at (timestamptz)

**orders**
- id (uuid, PK)
- user_id (uuid, FK → users)
- provider_id (uuid, FK → service_providers)
- pickup_location (text)
- location_lat (decimal)
- location_lon (decimal)
- waste_type (text: Residential, Commercial, Public)
- pickup_time (timestamptz)
- status (text: Pending, Assigned, Completed, Failed)
- cost (decimal)
- created_at (timestamptz)
- completed_at (timestamptz)

**payments**
- id (uuid, PK)
- order_id (uuid, FK → orders)
- amount (decimal)
- status (text: Pending, Completed, Failed)
- payment_method (text: Mobile Money, Card)
- transaction_id (text)
- created_at (timestamptz)

**reports**
- id (uuid, PK)
- generated_at (timestamptz)
- metrics (jsonb)
- area (text)
- provider_id (uuid, FK → service_providers)
- report_type (text)

### Security (RLS Policies)

All tables have Row Level Security enabled with policies ensuring:
- Users can only view/edit their own data
- Providers can only see assigned orders
- Admins have full access to all data
- Public data is appropriately restricted

## 👥 User Roles

### Resident
Create account → Book pickups → Track orders → Make payments

### Business
Same as Resident with commercial waste type option

### Provider
View available orders → Accept assignments → Update status → Complete collections

### Admin
Monitor system → View analytics → Manage users → Track all orders

## 🔐 Security Features

- ✅ Supabase Authentication (email/password)
- ✅ Row Level Security on all database tables
- ✅ Secure password hashing
- ✅ Session management
- ✅ Role-based access control
- ✅ Data encryption in transit (HTTPS)

## 📱 User Flows

### Booking a Pickup
1. Login to the app
2. Navigate to "Book Pickup" tab
3. Enter pickup location
4. Select waste type
5. Choose date and time
6. Confirm booking
7. Receive confirmation

### Tracking an Order
1. Navigate to "My Orders" tab
2. Select an order
3. View order status timeline
4. Track truck location (when assigned)
5. Receive notifications

### Making Payment
1. Order marked as "Completed"
2. Click "Pay Now" button
3. Select payment method
4. Complete payment
5. Receive digital receipt

## 🎨 Design System

### Colors
- **Primary Blue**: #007BFF (actions, navigation)
- **Success Green**: #28A745 (success states)
- **Warning Orange**: #FFA500 (pending states)
- **Error Red**: #DC3545 (errors, failures)
- **Background**: #f8f9fa (light gray)

### Typography
- Body text: 16px
- Headings: 24-28px
- Labels: 14px
- Font weight: Regular (400), Semibold (600), Bold (700)

### Components
- Cards with rounded corners (12px radius)
- Elevated shadows for depth
- Status badges with color coding
- Icon-based navigation
- Responsive layouts

## 🔄 Application Flow

```
Login/Signup → Home Dashboard →
  → Book Pickup → Order Confirmation
  → View Orders → Track Order → Payment → Receipt
  → Profile → Settings/Logout

Admin → Dashboard → Analytics → Reports
Provider → Dashboard → Accept Orders → Complete Orders
```

## 📊 Testing

### Sample Data
Run the SQL script to add sample service providers:
```bash
# In Supabase SQL Editor, run:
scripts/seed-data.sql
```

### Test Accounts
Create test accounts for different roles:

**Resident**
```
Email: resident@test.com
Password: test123456
User Type: Resident
```

**Admin**
```
Email: admin@test.com
Password: admin123456
User Type: Admin
```

**Provider**
```
Email: provider@test.com
Password: test123456
User Type: Provider
```

## 🚧 Future Enhancements

### Planned Features
- 🗺️ Google Maps integration for live tracking
- 💳 Full payment gateway integration (Flutterwave)
- 🔔 Push notifications for order updates
- 📍 GPS location detection
- 📧 Email notifications
- 📱 SMS alerts
- 📊 Advanced analytics and reporting
- 🌐 Multi-language support
- 📄 PDF report generation
- ⭐ User ratings and reviews

### Technical Improvements
- Real-time order updates via Supabase subscriptions
- Offline mode with data synchronization
- Image upload for waste documentation
- Route optimization for providers
- Automated order assignment algorithm

## 🤝 Contributing

This project is developed for Kampala Capital City Authority. For contributions or issues, please contact the development team.

## 📞 Support

For support or inquiries:
- **KCCA Waste Management Department**
- City Hall, Kampala
- Email: waste@kcca.go.ug

## 📄 License

Proprietary - Kampala Capital City Authority

## 🙏 Acknowledgments

- Kampala Capital City Authority (KCCA)
- Greater Kampala Metropolitan Area residents
- Private waste management companies
  - De Waste (U) Limited
  - Nabugabo Updeal
- Environmental and public health organizations

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Status**: Production Ready
**Platform**: iOS, Android, Web (via Expo)

---

## 📝 Notes

### Database Migration
The database schema is automatically created through Supabase migrations. All tables, indexes, and RLS policies are properly configured.

### Environment Variables
All required environment variables are pre-configured in the `.env` file. Never commit this file to version control.

### App Configuration
The app is configured in `app.json` with proper metadata, icons, and splash screens for all platforms.

---

### Supabase proxy API route (for web CORS fix)

When using **Option A** above, create `app/supabase-proxy/[[...path]]+api.ts` with this content:

```ts
/** Proxy to Supabase to avoid CORS when running the app in the browser. */

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const PREFIX = '/supabase-proxy';

function getSubPath(request: Request): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (!pathname.startsWith(PREFIX + '/') && pathname !== PREFIX) return '';
  const sub = pathname.slice(PREFIX.length) || '/';
  return sub.startsWith('/') ? sub.slice(1) : sub;
}

async function proxyToSupabase(request: Request): Promise<Response> {
  const subPath = getSubPath(request);
  const targetUrl = `${SUPABASE_URL}/${subPath}${new URL(request.url).search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'origin' || lower === 'referer') return;
    headers.set(key, value);
  });
  const body = request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined;
  const res = await fetch(targetUrl, { method: request.method, headers, body });
  const resHeaders = new Headers(res.headers);
  resHeaders.set('Access-Control-Allow-Origin', request.headers.get('origin') ?? '*');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders });
}

export async function GET(request: Request) { return proxyToSupabase(request); }
export async function POST(request: Request) { return proxyToSupabase(request); }
export async function PUT(request: Request) { return proxyToSupabase(request); }
export async function PATCH(request: Request) { return proxyToSupabase(request); }
export async function DELETE(request: Request) { return proxyToSupabase(request); }
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

---

**Made with ❤️ for a cleaner Kampala**
