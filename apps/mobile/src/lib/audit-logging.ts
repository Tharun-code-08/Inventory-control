export type AuditLogAction =
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_DELETED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_ESCALATED'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_REVOKED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET'
  | 'LOGOUT'
  | 'BIOMETRIC_ENABLED'
  | 'BIOMETRIC_DISABLED';

export type AuditLog = {
  action: AuditLogAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, string>;
};

/**
 * Audit logging is handled server-side (the API records auth, device and
 * document actions itself). There is no client-writable audit endpoint, so this
 * is intentionally a no-op kept for call-site compatibility.
 */
export async function logAuditAction(_log: AuditLog): Promise<void> {
  // no-op
}

// Convenience functions for common audit log actions
export async function logNotificationRead(notificationId: string): Promise<void> {
  return logAuditAction({
    action: 'NOTIFICATION_READ',
    entityType: 'Notification',
    entityId: notificationId,
  });
}

export async function logNotificationDeleted(notificationId: string): Promise<void> {
  return logAuditAction({
    action: 'NOTIFICATION_DELETED',
    entityType: 'Notification',
    entityId: notificationId,
  });
}

export async function logApprovalAction(
  approvalId: string,
  action: 'APPROVAL_APPROVED' | 'APPROVAL_REJECTED'
): Promise<void> {
  return logAuditAction({
    action,
    entityType: 'Approval',
    entityId: approvalId,
  });
}

export async function logDeviceRegistered(deviceId: string, deviceName: string): Promise<void> {
  return logAuditAction({
    action: 'DEVICE_REGISTERED',
    entityType: 'Device',
    entityId: deviceId,
    metadata: { deviceName },
  });
}

export async function logDeviceRevoked(deviceId: string): Promise<void> {
  return logAuditAction({
    action: 'DEVICE_REVOKED',
    entityType: 'Device',
    entityId: deviceId,
  });
}

export async function logLoginSuccess(email: string): Promise<void> {
  return logAuditAction({
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    metadata: { email },
  });
}

export async function logLoginFailed(email: string, reason?: string): Promise<void> {
  return logAuditAction({
    action: 'LOGIN_FAILED',
    entityType: 'User',
    metadata: { email, reason: reason || 'Unknown' },
  });
}

export async function logPasswordReset(email: string): Promise<void> {
  return logAuditAction({
    action: 'PASSWORD_RESET',
    entityType: 'User',
    metadata: { email },
  });
}

export async function logBiometricEnabled(): Promise<void> {
  return logAuditAction({
    action: 'BIOMETRIC_ENABLED',
    entityType: 'Security',
  });
}

export async function logBiometricDisabled(): Promise<void> {
  return logAuditAction({
    action: 'BIOMETRIC_DISABLED',
    entityType: 'Security',
  });
}
