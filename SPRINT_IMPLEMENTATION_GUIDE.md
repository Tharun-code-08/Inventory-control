# Sprint Implementation Guide

## Status Summary

### ✅ SPRINT 1 — COMPLETE
- [x] GR features with validations
- [x] Product images (upload & display)
- [x] Dashboard with all KPIs (6 KPIs added to backend & mobile)
- [x] Module cleanup (navigation already optimized)

### 🔄 SPRINT 2 — IN PROGRESS

#### ✅ Task #5: Enhanced Login (DONE)
- [x] Company Code field added
- [x] Remember Me checkbox (stores company code + email in SecureStore)
- [x] Forgot Password screen created
- [ ] Backend: validate company code in login API (optional - add later)
- [ ] Multi-tenant validation enforcement

**Status**: Functional, needs backend integration for company code validation

---

#### ⏳ Task #6: Biometric Login (READY TO IMPLEMENT)

**Implementation Steps:**

1. **Install dependency:**
```bash
cd retail-ims && npm install expo-local-authentication
```

2. **Create biometric service** (`apps/mobile/src/lib/biometric.ts`):
```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(email: string, password: string) {
  const credentials = JSON.stringify({ email, password, timestamp: Date.now() });
  await SecureStore.setItemAsync('biometric_credentials', credentials);
  await SecureStore.setItemAsync('biometric_enabled', 'true');
}

export async function getBiometricCredentials() {
  try {
    const auth = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason: 'Authenticate to access your account',
    });
    
    if (!auth.success) return null;
    
    const stored = await SecureStore.getItemAsync('biometric_credentials');
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    return null;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync('biometric_enabled');
  return enabled === 'true';
}

export async function disableBiometric() {
  await SecureStore.deleteItemAsync('biometric_credentials');
  await SecureStore.deleteItemAsync('biometric_enabled');
}
```

3. **Update login screen** to check for biometric:
```typescript
// In useEffect after loadRememberedCredentials
useEffect(() => {
  checkBiometricLogin();
}, []);

async function checkBiometricLogin() {
  const biometricEnabled = await isBiometricEnabled();
  if (biometricEnabled) {
    const creds = await getBiometricCredentials();
    if (creds && (Date.now() - creds.timestamp) < 86400000) { // 24h
      setEmail(creds.email);
      // Show biometric prompt option
    }
  }
}
```

4. **Add biometric prompt after first login:**
   - After successful login in `loginWithCredentials`, prompt user
   - Only ask once with "Don't ask again" option

---

#### ⏳ Task #7: Device Registration & Sessions (READY TO IMPLEMENT)

**Backend Requirements** (add to API):
- `POST /api/v1/auth/devices` - Register device
- `GET /api/v1/auth/devices` - List active devices
- `POST /api/v1/auth/devices/{deviceId}/revoke` - Revoke specific device
- `POST /api/v1/auth/logout-all` - Logout from all devices

**Prisma Schema Addition:**
```prisma
model UserDevice {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId String
  deviceName String
  platform String // "iOS", "Android", "Web"
  osVersion String
  lastLoginAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?
  
  @@unique([userId, deviceId])
}
```

**Mobile Implementation:**
1. Use `expo-device` to get device info
2. Register device on login
3. Create `Settings → Security → Active Devices` screen
4. Show list with logout actions

---

#### ⏳ Task #8: Failed Login Protection & Audit (READY TO IMPLEMENT)

**Backend:**
- Track login attempts (success & failures) in `audit_logs` table
- Lock account after 5 failed attempts for 15 minutes
- Clear counter on successful login

**Mobile:**
- Display friendly error messages
- Show "Too many attempts, try again in X minutes"

---

### 🚀 SPRINT 3 — NOTIFICATIONS & APPROVALS

#### ⏳ Task #9: Notification Engine

**Install:**
```bash
npm install expo-notifications expo-device
```

**Steps:**
1. Create `src/lib/notifications.ts` with FCM/APNS setup
2. Add notification permissions check
3. Get push token and send to backend
4. Listen to incoming notifications
5. Dispatch to Zustand notification store

**Schema:**
```prisma
model NotificationSubscription {
  id String @id @default(cuid())
  userId String
  deviceId String
  platform String // "ios", "android"
  pushToken String
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
}

model Notification {
  id String @id @default(cuid())
  userId String
  type String // "GR_CREATED", "LOW_STOCK", etc.
  title String
  body String
  data String? // JSON payload for deep linking
  isRead Boolean @default(false)
  readAt DateTime?
  sentAt DateTime
  createdAt DateTime @default(now())
  
  @@index([userId, isRead])
}
```

---

#### ⏳ Task #10: Notification Center Module

**Create screens:**
- `(app)/notifications/index.tsx` - List all notifications
- `(app)/notifications/[id].tsx` - Notification details
- Filter by: type, status (read/unread), date range

**Features:**
- Mark read/unread
- Delete notification
- Deep linking to related screens (GR, Product, etc.)
- Unread badge on tab
- Pull-to-refresh

---

#### ⏳ Task #11: Approval Inbox

**Separate from Notification Center:**
- Dedicated approval workflow
- Show pending approvals (GR, PO, RFQ, Quotations)
- Approve/Reject/Comment actions
- Escalation logic:
  - 24h pending → remind
  - 48h pending → escalate to manager
  - 72h pending → escalate to admin

**Backend Endpoints:**
- `GET /api/v1/approvals` - List pending approvals
- `POST /api/v1/approvals/{id}/approve` - Approve
- `POST /api/v1/approvals/{id}/reject` - Reject
- `POST /api/v1/approvals/{id}/comment` - Add comment

---

#### ⏳ Task #12: Low Stock Alerts

**Integrate with Notification Engine:**
- Trigger when stock < minStockLevel or < reorderPoint
- Show in Notification Center
- Quick actions: Create RFQ, Create PO

---

#### ⏳ Task #13: Deep Linking & Preferences

**Deep Linking Pattern:**
```
GR Created → /goods-receipts/{grId}
Low Stock → /products/{productId}
PO Approval → /purchase-orders/{poId}
```

**Notification Preferences Screen:**
- `Settings → Notifications → Preferences`
- Toggle by event type
- Choose frequency (real-time, daily, weekly, off)

---

#### ⏳ Task #14: Dashboard Awareness

**Lazy Refresh Pattern:**
```typescript
// In dashboard hook
export function useDashboard() {
  const [isDirty, setIsDirty] = useState(false);
  
  // Listen to notification events
  useEffect(() => {
    const unsub = subscribeToNotifications((notification) => {
      if (['GR_POSTED', 'PO_APPROVED', 'STOCK_CHANGED'].includes(notification.type)) {
        setIsDirty(true);
      }
    });
    return unsub;
  }, []);
  
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => { /* ... */ },
    staleTime: isDirty ? 0 : 60_000, // Refetch if dirty
  });
}
```

**Dashboard Screen:**
- Show "Updated X minutes ago"
- Auto-refresh when screen gains focus if dirty flag set

---

#### ⏳ Task #15: Audit Logging

**What to log:**
- Notification sent/read/deleted
- Approval approved/rejected
- Escalation triggered
- Device login/logout
- Password reset
- Permission changes

**Backend Schema:**
```prisma
model AuditLog {
  id String @id @default(cuid())
  userId String
  companyId String
  action String
  entityType String // "Notification", "Approval", "Device", etc.
  entityId String?
  oldValue String? // JSON
  newValue String? // JSON
  metadata String? // JSON
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([companyId, createdAt])
}
```

---

## Priority & Timeline

**Quick Wins (Next Session):**
1. ✅ Task #5: Enhanced login - DONE
2. Task #6: Biometric (high impact, ~2-3 hours)
3. Task #8: Failed login protection (1 hour, security critical)

**Medium Effort:**
4. Task #7: Device sessions (2 hours)
5. Task #10: Notification Center (3 hours)

**Larger Effort:**
6. Task #9: Notification engine (4-5 hours, includes backend)
7. Task #11: Approval inbox (3-4 hours, complex workflows)

**Nice to Have:**
8. Task #12-15: Low stock alerts, deep linking, audit logs, dashboard awareness

---

## Testing Checklist

### Sprint 1
- [ ] Create GR from PO - auto-populate fields
- [ ] Create manual GR - all validations work
- [ ] Barcode scanning - products added correctly
- [ ] Dashboard - all 7 KPIs display correctly
- [ ] Images - show in products, GR, fallback to category icon

### Sprint 2
- [ ] Login - company code required
- [ ] Remember me - saves/loads correctly
- [ ] Forgot password - email/token/reset flow works
- [ ] Biometric - prompts after login, works next time
- [ ] Failed login - locks after 5 attempts
- [ ] Device sessions - show, can revoke

### Sprint 3
- [ ] Notifications - receive and display
- [ ] Approvals - show pending items, approve/reject works
- [ ] Low stock - trigger and notify
- [ ] Deep linking - notification opens correct screen
- [ ] Preferences - user can toggle notifications

---

## API Integration Notes

All new endpoints should:
- Use `/api/v1` prefix
- Support multi-tenant (scope to company)
- Include proper error handling
- Log to audit_logs
- Support pagination where applicable
- Return standard envelope: `{ success: boolean, data: T, meta?: any, errors?: array }`

