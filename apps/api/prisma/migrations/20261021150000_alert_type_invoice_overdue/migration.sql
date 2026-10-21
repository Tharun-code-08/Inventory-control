-- Dunning escalations to staff now create a real in-app notification.
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'INVOICE_OVERDUE';
