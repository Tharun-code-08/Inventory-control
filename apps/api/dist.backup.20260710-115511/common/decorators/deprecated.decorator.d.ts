export declare const DEPRECATED_KEY = "http:deprecated";
export type DeprecatedMeta = {
    sunsetAt: string;
    link?: string;
    note?: string;
};
export declare function Deprecated(meta: DeprecatedMeta): ClassDecorator & MethodDecorator;
