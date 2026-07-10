import { BillingCycle, SubscriptionPlan } from '@prisma/client';
export type PlanId = 'trial' | 'pro' | 'plus';
export type BillingInterval = 'monthly' | 'yearly';
export declare function getTrialDays(): number;
export declare function getTrialNurtureDays(): number;
export declare const TRIAL_DAYS: number;
export declare const PLAN_LIMITS: {
    readonly TRIAL: {
        readonly maxUsers: 2;
        readonly maxWarehouses: 1;
        readonly maxSkus: 100;
    };
    readonly PRO: {
        readonly maxUsers: 10;
        readonly maxWarehouses: 3;
        readonly maxSkus: number | null;
    };
    readonly PLUS: {
        readonly maxUsers: number | null;
        readonly maxWarehouses: number | null;
        readonly maxSkus: number | null;
    };
};
export declare const PLAN_PRICING: {
    readonly pro: {
        readonly monthly: {
            readonly display: 399;
            readonly original: 499;
            readonly paise: 39900;
        };
        readonly yearly: {
            readonly displayPerMonth: 349;
            readonly paiseTotal: number;
        };
    };
    readonly plus: {
        readonly monthly: {
            readonly display: 599;
            readonly original: 699;
            readonly paise: 59900;
        };
        readonly yearly: {
            readonly displayPerMonth: 549;
            readonly paiseTotal: number;
        };
    };
};
export declare function orderAmountPaise(plan: Exclude<PlanId, 'trial'>, interval: BillingInterval): number;
export declare function toSubscriptionPlan(plan: PlanId): SubscriptionPlan;
export declare function toBillingCycle(interval: BillingInterval): BillingCycle;
export declare function subscriptionEndDate(plan: SubscriptionPlan, cycle: BillingCycle, from?: Date): Date;
export declare function trialEndDate(from?: Date): Date;
export declare function subscriptionPlanTier(plan: SubscriptionPlan): number;
export declare function isDowngrade(current: SubscriptionPlan, target: SubscriptionPlan): boolean;
export type PlanFeature = 'reports' | 'purchase_orders' | 'integrations' | 'api' | 'vendor_portal' | 'audit_rbac' | 'rfqs' | 'contracts' | 'sales_orders' | 'sales_quotations' | 'invoices' | 'payments' | 'supplier_portal' | 'backups';
export declare function planAllowsFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean;
