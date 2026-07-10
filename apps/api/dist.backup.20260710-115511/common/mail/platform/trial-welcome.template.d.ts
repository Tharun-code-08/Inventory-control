export type TrialWelcomeContext = {
    companyName: string;
    trialDays: number;
    trialEndsAt: string;
    loginUrl: string;
    upgradeUrl: string;
    unsubscribeUrl?: string;
};
export declare function trialWelcomeSubject(ctx: TrialWelcomeContext): string;
export declare function trialWelcomeText(ctx: TrialWelcomeContext): string;
export declare function trialWelcomeHtml(ctx: TrialWelcomeContext): string;
