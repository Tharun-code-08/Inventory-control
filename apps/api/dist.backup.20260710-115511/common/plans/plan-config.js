"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_PRICING = exports.PLAN_LIMITS = exports.TRIAL_DAYS = void 0;
exports.getTrialDays = getTrialDays;
exports.getTrialNurtureDays = getTrialNurtureDays;
exports.orderAmountPaise = orderAmountPaise;
exports.toSubscriptionPlan = toSubscriptionPlan;
exports.toBillingCycle = toBillingCycle;
exports.subscriptionEndDate = subscriptionEndDate;
exports.trialEndDate = trialEndDate;
exports.subscriptionPlanTier = subscriptionPlanTier;
exports.isDowngrade = isDowngrade;
exports.planAllowsFeature = planAllowsFeature;
const client_1 = require("@prisma/client");
function parsePositiveInt(raw, fallback) {
    if (!raw?.trim())
        return fallback;
    const value = Number(raw.trim());
    if (!Number.isFinite(value) || value < 1)
        return fallback;
    return Math.round(value);
}
function getTrialDays() {
    return parsePositiveInt(process.env.TRIAL_DAYS, 7);
}
function getTrialNurtureDays() {
    return parsePositiveInt(process.env.TRIAL_NURTURE_DAYS, 90);
}
exports.TRIAL_DAYS = getTrialDays();
exports.PLAN_LIMITS = {
    TRIAL: { maxUsers: 2, maxWarehouses: 1, maxSkus: 100 },
    PRO: { maxUsers: 10, maxWarehouses: 3, maxSkus: null },
    PLUS: { maxUsers: null, maxWarehouses: null, maxSkus: null },
};
exports.PLAN_PRICING = {
    pro: {
        monthly: { display: 399, original: 499, paise: 39900 },
        yearly: { displayPerMonth: 349, paiseTotal: 349 * 12 * 100 },
    },
    plus: {
        monthly: { display: 599, original: 699, paise: 59900 },
        yearly: { displayPerMonth: 549, paiseTotal: 549 * 12 * 100 },
    },
};
function orderAmountPaise(plan, interval) {
    const pricing = exports.PLAN_PRICING[plan][interval];
    return 'paiseTotal' in pricing ? pricing.paiseTotal : pricing.paise;
}
function toSubscriptionPlan(plan) {
    if (plan === 'pro')
        return client_1.SubscriptionPlan.PRO;
    if (plan === 'plus')
        return client_1.SubscriptionPlan.PLUS;
    return client_1.SubscriptionPlan.TRIAL;
}
function toBillingCycle(interval) {
    return interval === 'yearly' ? client_1.BillingCycle.YEARLY : client_1.BillingCycle.MONTHLY;
}
function subscriptionEndDate(plan, cycle, from = new Date()) {
    const end = new Date(from);
    if (cycle === client_1.BillingCycle.YEARLY) {
        end.setFullYear(end.getFullYear() + 1);
    }
    else {
        end.setMonth(end.getMonth() + 1);
    }
    return end;
}
function trialEndDate(from = new Date()) {
    const end = new Date(from);
    end.setDate(end.getDate() + getTrialDays());
    return end;
}
function subscriptionPlanTier(plan) {
    if (plan === client_1.SubscriptionPlan.PLUS)
        return 2;
    if (plan === client_1.SubscriptionPlan.PRO)
        return 1;
    return 0;
}
function isDowngrade(current, target) {
    return subscriptionPlanTier(target) < subscriptionPlanTier(current);
}
function planAllowsFeature(plan, feature) {
    if (plan === client_1.SubscriptionPlan.PLUS)
        return true;
    if (plan === client_1.SubscriptionPlan.PRO) {
        return feature !== 'api' && feature !== 'vendor_portal' && feature !== 'audit_rbac';
    }
    return false;
}
//# sourceMappingURL=plan-config.js.map