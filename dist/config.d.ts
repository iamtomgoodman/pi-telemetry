import { type PiSettingsOptions } from '@amaster.ai/pi-shared/settings';
export interface LangfuseConfig {
    enabled?: boolean;
    publicKey?: string;
    secretKey?: string;
    baseUrl?: string;
    flushAt?: number;
    flushIntervalMs?: number;
}
export interface OtelConfig {
    enabled?: boolean;
    endpoint?: string;
    headers?: Record<string, string>;
    flushAt?: number;
    flushIntervalMs?: number;
    errorLabel?: string;
}
export interface TelemetryConfig {
    serviceName?: string;
    serviceVersion?: string;
    includePayloads?: boolean;
    langfuse?: LangfuseConfig;
    otel?: OtelConfig;
}
export declare function resolveConfig(config?: TelemetryConfig): TelemetryConfig;
export declare function loadConfigFromFile(options?: PiSettingsOptions): TelemetryConfig;
//# sourceMappingURL=config.d.ts.map