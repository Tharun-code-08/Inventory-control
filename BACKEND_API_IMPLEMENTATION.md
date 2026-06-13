# Backend API Implementation Guide

## Overview
This guide covers the implementation of critical backend API endpoints for:
1. **Device Management**
2. **Notifications**
3. **Approvals**
4. **Audit Logging**
5. **Low Stock Alerts**

---

## DATABASE SCHEMA UPDATES

### Prisma Migration
All new tables have been added to `schema.prisma`:
- `user_devices` - Device registration & session management
- `notification_subscriptions` - Push token storage
- `notifications` - Notification records
- `audit_logs` - Comprehensive audit trail
- `low_stock_alerts` - Low stock tracking

**To apply:**
```bash
cd apps/api
npx prisma migrate dev --name "add_device_notification_audit_tables"
```

---

## 1. DEVICE MANAGEMENT API

### Endpoints

#### Register Device
```
POST /api/v1/auth/devices
Authorization: Bearer {accessToken}

Request Body:
{
  "deviceId": "uuid-generated-by-mobile",
  "deviceName": "Samsung S24",
  "platform": "android",
  "osVersion": "14.0"
}

Response:
{
  "success": true,
  "data": {
    "id": "device-id",
    "deviceId": "uuid",
    "deviceName": "Samsung S24",
    "platform": "android",
    "lastLoginAt": "2024-06-13T10:30:00Z",
    "revokedAt": null
  }
}
```

#### Get Active Devices
```
GET /api/v1/auth/devices
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "device-1",
      "deviceId": "uuid-1",
      "deviceName": "iPhone 15",
      "platform": "ios",
      "osVersion": "17.0",
      "lastLoginAt": "2024-06-13T10:30:00Z",
      "revokedAt": null
    },
    {
      "id": "device-2",
      "deviceId": "uuid-2",
      "deviceName": "Samsung S24",
      "platform": "android",
      "osVersion": "14.0",
      "lastLoginAt": "2024-06-10T15:20:00Z",
      "revokedAt": null
    }
  ]
}
```

#### Revoke Device
```
POST /api/v1/auth/devices/{deviceId}/revoke
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Device revoked successfully"
}
```

#### Logout All Other Devices
```
POST /api/v1/auth/logout-all-others
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Logged out from all other devices"
}
```

---

## 2. NOTIFICATION API

### Endpoints

#### Get Notifications
```
GET /api/v1/notifications?page=1&limit=20&isRead=false
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "notif-1",
      "type": "GR_CREATED",
      "title": "Goods Receipt Created",
      "body": "GR-2024-001 created by John Warehouse",
      "priority": "normal",
      "isRead": false,
      "sentAt": "2024-06-13T10:30:00Z",
      "createdAt": "2024-06-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "unreadCount": 12
  }
}
```

#### Mark as Read
```
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": "notif-1",
    "isRead": true,
    "readAt": "2024-06-13T10:35:00Z"
  }
}
```

#### Mark All as Read
```
PATCH /api/v1/notifications/mark-all-read
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

#### Delete Notification
```
DELETE /api/v1/notifications/{notificationId}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Notification deleted"
}
```

#### Register Push Token
```
POST /api/v1/notifications/subscribe
Authorization: Bearer {accessToken}

Request Body:
{
  "pushToken": "ExponentPushToken[...]",
  "platform": "android",
  "deviceId": "device-uuid"
}

Response:
{
  "success": true,
  "data": {
    "id": "subscription-id",
    "pushToken": "ExponentPushToken[...]",
    "platform": "android",
    "isActive": true
  }
}
```

#### Get Notification Preferences
```
GET /api/v1/notifications/preferences
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": "pref-id",
    "userId": "user-id",
    "preferences": {
      "GR_CREATED": { "enabled": true, "frequency": "real-time" },
      "LOW_STOCK": { "enabled": true, "frequency": "daily" },
      "PO_APPROVED": { "enabled": true, "frequency": "real-time" },
      "SECURITY_LOGIN": { "enabled": true, "frequency": "real-time" }
    }
  }
}
```

#### Update Notification Preferences
```
PUT /api/v1/notifications/preferences
Authorization: Bearer {accessToken}

Request Body:
{
  "preferences": {
    "GR_CREATED": { "enabled": true, "frequency": "real-time" },
    "LOW_STOCK": { "enabled": false, "frequency": "off" },
    "PO_APPROVED": { "enabled": true, "frequency": "daily" }
  }
}

Response:
{
  "success": true,
  "data": { /* updated preferences */ }
}
```

---

## 3. APPROVAL API

### Endpoints

#### Get Pending Approvals
```
GET /api/v1/approvals?status=pending&type=GR
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "approval-1",
      "type": "GR",
      "entityId": "gr-id-123",
      "entityNumber": "GR-2024-001",
      "description": "Goods Receipt from Supplier ABC",
      "requestedBy": {
        "id": "user-1",
        "name": "John Warehouse"
      },
      "requestedAt": "2024-06-13T08:00:00Z",
      "pendingFor": "2 days",
      "amount": 5000,
      "status": "pending",
      "escalationLevel": 0
    }
  ],
  "meta": {
    "total": 12,
    "pending": 12,
    "escalated": 2
  }
}
```

#### Get Approval Details
```
GET /api/v1/approvals/{approvalId}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": "approval-1",
    "type": "GR",
    "entityNumber": "GR-2024-001",
    "description": "Goods Receipt from Supplier ABC",
    "amount": 5000,
    "requestedBy": { /* user details */ },
    "currentApprover": { /* user details */ },
    "approvalSteps": [
      {
        "step": 1,
        "approver": { /* user */ },
        "status": "pending",
        "approvedAt": null
      }
    ],
    "comments": [
      {
        "id": "comment-1",
        "userId": "user-2",
        "comment": "Verify quantity before approving",
        "createdAt": "2024-06-13T09:00:00Z"
      }
    ]
  }
}
```

#### Approve
```
POST /api/v1/approvals/{approvalId}/approve
Authorization: Bearer {accessToken}

Request Body:
{
  "comment": "Approved - quantities verified"
}

Response:
{
  "success": true,
  "data": {
    "id": "approval-1",
    "status": "approved",
    "approvedAt": "2024-06-13T10:30:00Z"
  }
}
```

#### Reject
```
POST /api/v1/approvals/{approvalId}/reject
Authorization: Bearer {accessToken}

Request Body:
{
  "reason": "Quantity mismatch - needs correction"
}

Response:
{
  "success": true,
  "data": {
    "id": "approval-1",
    "status": "rejected",
    "rejectedAt": "2024-06-13T10:30:00Z",
    "rejectionReason": "Quantity mismatch - needs correction"
  }
}
```

#### Add Comment
```
POST /api/v1/approvals/{approvalId}/comments
Authorization: Bearer {accessToken}

Request Body:
{
  "comment": "Please verify supplier details"
}

Response:
{
  "success": true,
  "data": {
    "id": "comment-new",
    "comment": "Please verify supplier details",
    "createdBy": "user-name",
    "createdAt": "2024-06-13T10:30:00Z"
  }
}
```

---

## 4. AUDIT LOG API

### Endpoints

#### Get Audit Logs
```
GET /api/v1/audit-logs?action=LOGIN&startDate=2024-06-01&endDate=2024-06-13
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "audit-1",
      "action": "LOGIN_SUCCESS",
      "entityType": "User",
      "userId": "user-1",
      "userName": "john.doe@company.com",
      "ipAddress": "192.168.1.100",
      "metadata": {
        "deviceName": "iPhone 15",
        "platform": "ios"
      },
      "createdAt": "2024-06-13T10:30:00Z"
    },
    {
      "id": "audit-2",
      "action": "CREATE_PRODUCT",
      "entityType": "Product",
      "entityId": "prod-123",
      "oldValue": null,
      "newValue": {
        "productCode": "PROD-001",
        "description": "Laptop"
      },
      "userId": "user-2",
      "createdAt": "2024-06-13T09:15:00Z"
    }
  ],
  "meta": {
    "total": 1245,
    "page": 1,
    "limit": 20
  }
}
```

#### Export Audit Logs
```
GET /api/v1/audit-logs/export?format=csv&startDate=2024-06-01
Authorization: Bearer {accessToken}

Response: CSV file download
```

---

## 5. LOW STOCK ALERT API

### Background Job: Check Low Stock
```
Runs every 1 hour via BullMQ worker

Logic:
1. For each product in each shop
2. Get current stock level
3. Compare against minStockLevel and reorderPoint
4. If below threshold:
   - Create LowStockAlert record
   - Send notification to inventory managers
   - Create approval for RFQ if enabled
```

### Endpoints

#### Get Low Stock Alerts
```
GET /api/v1/low-stock-alerts?alertLevel=CRITICAL&resolved=false
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "alert-1",
      "productCode": "LAPTOP-001",
      "productName": "Dell Laptop",
      "currentStock": 2,
      "minStock": 10,
      "reorderPoint": 20,
      "alertLevel": "CRITICAL",
      "shop": "Main Warehouse",
      "notified": true,
      "notifiedAt": "2024-06-13T10:00:00Z",
      "resolved": false,
      "createdAt": "2024-06-13T09:30:00Z"
    }
  ],
  "meta": {
    "total": 23,
    "critical": 5,
    "warning": 18
  }
}
```

#### Resolve Alert
```
POST /api/v1/low-stock-alerts/{alertId}/resolve
Authorization: Bearer {accessToken}

Request Body:
{
  "action": "created_rfq",
  "reference": "rfq-id-123"
}

Response:
{
  "success": true,
  "data": {
    "id": "alert-1",
    "resolved": true,
    "resolvedAt": "2024-06-13T10:30:00Z"
  }
}
```

---

## NestJS SERVICE IMPLEMENTATIONS

### Device Service Example
```typescript
// apps/api/src/modules/auth/services/device.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDeviceDto } from '../dto/create-device.dto';

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  async registerDevice(
    userId: string,
    companyId: string,
    dto: CreateDeviceDto,
  ) {
    return this.prisma.userDevice.create({
      data: {
        userId,
        companyId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        platform: dto.platform,
        osVersion: dto.osVersion,
      },
    });
  }

  async getActiveDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { lastLoginAt: 'desc' },
    });
  }

  async revokeDevice(deviceId: string) {
    return this.prisma.userDevice.update({
      where: { deviceId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllOtherDevices(userId: string, currentDeviceId: string) {
    return this.prisma.userDevice.updateMany({
      where: {
        userId,
        deviceId: { not: currentDeviceId },
      },
      data: { revokedAt: new Date() },
    });
  }
}
```

### Notification Service Example
```typescript
// apps/api/src/modules/notifications/services/notification.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationService,
    private auditService: AuditLogService,
  ) {}

  async sendNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
        sentAt: new Date(),
      },
    });

    // Get user's push subscriptions
    const subscriptions = await this.prisma.notificationSubscription.findMany({
      where: { userId, isActive: true },
    });

    // Send push notifications
    for (const sub of subscriptions) {
      await this.pushService.sendPush(sub.pushToken, {
        title,
        body,
        data: { notificationId: notification.id, ...data },
      });
    }

    // Log to audit trail
    await this.auditService.log({
      action: 'NOTIFICATION_SENT',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { type, recipient: userId },
    });

    return notification;
  }

  async markAsRead(notificationId: string) {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Log read action
    await this.auditService.log({
      action: 'NOTIFICATION_READ',
      entityType: 'Notification',
      entityId: notificationId,
    });

    return notification;
  }
}
```

### Low Stock Alert Worker Example
```typescript
// apps/api/src/workers/low-stock-alert.worker.ts

import { Worker, Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';

export const createLowStockAlertWorker = (
  redis: Redis,
  prisma: PrismaService,
  notificationService: NotificationService,
) => {
  const queue = new Queue('low-stock-alerts', { connection: redis });

  const worker = new Worker(
    'low-stock-alerts',
    async () => {
      // Get all active products
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { plants: true },
      });

      for (const product of products) {
        for (const plant of product.plants) {
          // Get current stock
          const summary = await prisma.stockSummary.findUnique({
            where: {
              productId_shopId: {
                productId: product.id,
                shopId: plant.shopId,
              },
            },
          });

          if (!summary) continue;

          const currentStock = summary.availableStock;

          // Check alert levels
          let alertLevel = null;
          if (currentStock === 0) {
            alertLevel = 'EMERGENCY';
          } else if (currentStock < plant.reorderPoint) {
            alertLevel = 'CRITICAL';
          } else if (currentStock < plant.minStockLevel) {
            alertLevel = 'WARNING';
          }

          if (alertLevel) {
            // Create or update alert
            const alert = await prisma.lowStockAlert.upsert({
              where: {
                productId_shopId: {
                  productId: product.id,
                  shopId: plant.shopId,
                },
              },
              create: {
                companyId: plant.companyId,
                productId: product.id,
                shopId: plant.shopId,
                currentStock,
                minStock: plant.minStockLevel,
                reorderPoint: plant.reorderPoint,
                alertLevel,
                notified: false,
              },
              update: {
                currentStock,
                alertLevel,
                resolvedAt: null,
                resolved: false,
              },
            });

            // Send notification if not already notified
            if (!alert.notified) {
              const managerUsers = await prisma.user.findMany({
                where: {
                  shopId: plant.shopId,
                  role: { name: { in: ['INVENTORY_MANAGER', 'ADMIN'] } },
                },
              });

              for (const manager of managerUsers) {
                await notificationService.sendNotification(
                  manager.id,
                  'LOW_STOCK',
                  `Low Stock Alert: ${product.productCode}`,
                  `${product.productCode} is at ${currentStock} units (min: ${plant.minStockLevel})`,
                  {
                    productId: product.id,
                    shopId: plant.shopId,
                    alertLevel,
                  },
                );
              }

              await prisma.lowStockAlert.update({
                where: { id: alert.id },
                data: {
                  notified: true,
                  notifiedAt: new Date(),
                },
              });
            }
          }
        }
      }
    },
    { connection: redis },
  );

  // Run every hour
  queue.add(
    'check-low-stock',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Every hour
    },
  );

  return { queue, worker };
};
```

---

## FIREBASE SETUP (FCM & APNS)

### Firebase Cloud Messaging (FCM) - Android

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Create new project for your app

2. **Download Service Account Key**
   - Settings → Service Accounts
   - Generate new private key
   - Save as `firebase-key.json`

3. **Add to Backend**
   ```bash
   npm install firebase-admin
   ```

4. **Initialize in NestJS**
   ```typescript
   // apps/api/src/modules/notifications/firebase.module.ts
   import * as admin from 'firebase-admin';

   const serviceAccount = require('./firebase-key.json');

   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount),
   });

   export const messaging = admin.messaging();
   ```

5. **Send Push from Backend**
   ```typescript
   async sendAndroidPush(token: string, payload: any) {
     return messaging.send({
       token,
       notification: {
         title: payload.title,
         body: payload.body,
       },
       data: payload.data,
       android: {
         priority: 'high',
       },
     });
   }
   ```

### Apple Push Notification Service (APNS) - iOS

1. **Generate APNs Certificate**
   - Apple Developer Account
   - Certificates, Identifiers & Profiles
   - Create APNs Certificate (Production)
   - Download .cer file

2. **Convert to .p8 (Token-based)**
   - Preferred method (more reliable)
   - Keys → Create new key
   - Enable Apple Push Notifications
   - Download .p8 file

3. **Add to Backend**
   ```bash
   npm install apn
   ```

4. **Initialize in NestJS**
   ```typescript
   import apn from 'apn';

   const apnProvider = new apn.Provider({
     token: {
       key: fs.readFileSync('./apn-key.p8'),
       keyId: 'YOUR_KEY_ID',
       teamId: 'YOUR_TEAM_ID',
     },
     production: true,
   });

   export const apnService = apnProvider;
   ```

5. **Send iOS Push**
   ```typescript
   async sendIOSPush(token: string, payload: any) {
     const notification = new apn.Notification({
       alert: {
         title: payload.title,
         body: payload.body,
       },
       sound: 'default',
       badge: 1,
       payload: payload.data,
     });

     await apnService.send(notification, token);
   }
   ```

---

## PERFORMANCE OPTIMIZATION

### Database Indexes
All new tables have been indexed for performance:
- `userDevices` indexed on userId
- `notificationSubscriptions` indexed on userId & platform
- `notifications` indexed on userId and createdAt
- `auditLogs` indexed on companyId, action, and userId
- `lowStockAlerts` indexed on alertLevel and resolved status

### Caching Strategy
```typescript
// Cache audit logs for 5 minutes
@Cacheable({
  key: 'audit-logs:{{userId}}:{{action}}',
  ttl: 300,
})
async getAuditLogs(userId: string, action: string) {
  // ...
}

// Cache active devices for 1 hour
@Cacheable({
  key: 'user-devices:{{userId}}',
  ttl: 3600,
})
async getActiveDevices(userId: string) {
  // ...
}
```

### Pagination
All list endpoints support pagination:
```
GET /api/v1/notifications?page=1&limit=20
GET /api/v1/audit-logs?page=1&limit=50
GET /api/v1/approvals?page=1&limit=30
```

---

## OFFLINE SYNC STRATEGY

### Client-Side (Mobile)
```typescript
// apps/mobile/src/lib/offline-sync.ts

import { openDB } from 'idb';

class OfflineSyncManager {
  private db: IDBDatabase;

  async queueAction(action: {
    type: 'create' | 'update' | 'delete';
    endpoint: string;
    data: any;
    timestamp: number;
  }) {
    const tx = this.db.transaction('sync_queue', 'readwrite');
    await tx.store.add(action);
  }

  async syncPending() {
    const tx = this.db.transaction('sync_queue', 'readonly');
    const actions = await tx.store.getAll();

    for (const action of actions) {
      try {
        if (action.type === 'create') {
          await api.post(action.endpoint, action.data);
        } else if (action.type === 'update') {
          await api.put(action.endpoint, action.data);
        }
        // Remove from queue on success
        await this.db
          .transaction('sync_queue', 'readwrite')
          .store.delete(action.timestamp);
      } catch (err) {
        // Will retry later
        console.error('Sync failed:', err);
      }
    }
  }
}

// Listen for network changes
window.addEventListener('online', () => {
  offlineSyncManager.syncPending();
});
```

### Server-Side Validation
```typescript
// Ensure no duplicate submissions
@Post('/goods-receipts')
async createGoodsReceipt(
  @Body() dto: CreateGRDto,
) {
  const idempotencyKey = dto.idempotencyKey;

  // Check if already processed
  const existing = await this.prisma.idempotencyLog.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    return existing.result;
  }

  // Process new request
  const result = await this.service.createGR(dto);

  // Log idempotency
  await this.prisma.idempotencyLog.create({
    data: {
      key: idempotencyKey,
      result,
    },
  });

  return result;
}
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Create Prisma migration
- [ ] Implement Device Service & Controller
- [ ] Implement Notification Service & Controller
- [ ] Implement Approval Service & Controller
- [ ] Implement Audit Logging Service & Controller
- [ ] Set up Firebase FCM
- [ ] Set up Apple APNs
- [ ] Create Low Stock Alert Worker
- [ ] Add database indexes
- [ ] Implement caching layer
- [ ] Test all endpoints
- [ ] Performance test under load
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Production deployment

---

## NEXT STEPS

1. **Create migration** - Run Prisma migrate to add new tables
2. **Implement endpoints** - Start with Device Management (most critical)
3. **Configure Firebase** - Set up FCM and APNs for push notifications
4. **Add workers** - Implement low stock alert worker
5. **Test thoroughly** - Unit tests, integration tests, load tests
6. **Deploy** - Stage → QA → Production

This implementation will give your mobile app:
✅ Enterprise-grade device management
✅ Real-time push notifications
✅ Comprehensive audit trail
✅ Automated low stock alerts
✅ Offline sync capability
✅ Performance optimization
