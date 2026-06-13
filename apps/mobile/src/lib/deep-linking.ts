import { router, type Href } from 'expo-router';

export type DeepLink = {
  screen: Href;
  params?: Record<string, string>;
};

export function getDeepLinkFromNotification(data: Record<string, string>): DeepLink | null {
  const entityType = data.entityType;
  const entityId = data.entityId;
  const type = data.type;

  if (!entityId) {
    // No specific entity, return null
    return null;
  }

  // Map notification types to screens
  const typeScreenMap: Record<string, Href> = {
    // GR notifications
    GR_CREATED: `/goods-receipts/${entityId}`,
    GR_APPROVED: `/goods-receipts/${entityId}`,
    GR_REJECTED: `/goods-receipts/${entityId}`,

    // PO notifications
    PO_APPROVED: `/purchase-orders/${entityId}`,
    PO_REJECTED: `/purchase-orders/${entityId}`,

    // Stock & Product notifications
    LOW_STOCK: `/products/${entityId}`,
    CRITICAL_STOCK: `/products/${entityId}`,

    // Transfer notifications
    TRANSFER_COMPLETED: `/purchase-orders/${entityId}`, // TODO: Create transfer screen

    // RFQ notifications
    RFQ_CREATED: `/purchase-orders/${entityId}`, // TODO: Create RFQ screen
    RFQ_RESPONSE: `/purchase-orders/${entityId}`,

    // Quotation notifications
    QUOTATION_APPROVED: `/purchase-orders/${entityId}`, // TODO: Create quotation screen
    QUOTATION_REJECTED: `/purchase-orders/${entityId}`,

    // Inventory notifications
    INVENTORY_ADJUSTED: `/products/${entityId}`,
  };

  const screen = typeScreenMap[type];
  if (!screen) {
    return null;
  }

  return {
    screen,
    params: { id: entityId },
  };
}

export function navigateToDeepLink(deepLink: DeepLink): void {
  router.push(deepLink.screen);
}

export function handleNotificationDeepLink(data: Record<string, string>): void {
  const deepLink = getDeepLinkFromNotification(data);
  if (deepLink) {
    navigateToDeepLink(deepLink);
  }
}
