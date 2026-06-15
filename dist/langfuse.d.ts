import type { TelemetryConfig } from './config.js';
import { type RuntimeEventExporter, type RuntimeTelemetryEvent, type RuntimeTelemetryOptions, type TelemetryEnvironment, type TelemetryFetch } from './index.js';
export type LangfuseExporterConfig = {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
    baseUrl: string;
    flushAt: number;
    flushIntervalMs: number;
} & RuntimeTelemetryOptions;
export type OtelExporterConfig = {
    enabled: boolean;
    endpoint: string;
    headers?: Record<string, string>;
    flushAt: number;
    flushIntervalMs: number;
    errorLabel?: string;
} & RuntimeTelemetryOptions;
export type LangfuseFetch = TelemetryFetch;
export interface LangfuseSdkClient {
    trace(body?: Record<string, unknown>): LangfuseSdkTraceClient;
    flushAsync(): Promise<void>;
    shutdownAsync(): Promise<void>;
}
export interface LangfuseSdkTraceClient {
    update(body: Record<string, unknown>): unknown;
    span(body: Record<string, unknown>): LangfuseSdkSpanClient;
    generation(body: Record<string, unknown>): LangfuseSdkGenerationClient;
}
export interface LangfuseSdkSpanClient {
    update(body: Record<string, unknown>): unknown;
    span(body: Record<string, unknown>): LangfuseSdkSpanClient;
    generation(body: Record<string, unknown>): LangfuseSdkGenerationClient;
}
export interface LangfuseSdkGenerationClient {
    update(body: Record<string, unknown>): unknown;
}
export declare class LangfuseSdkRuntimeEventExporter implements RuntimeEventExporter {
    private readonly config;
    private readonly client;
    private readonly traces;
    private readonly spans;
    private readonly generations;
    constructor(config: LangfuseExporterConfig, client?: LangfuseSdkClient);
    publish(event: RuntimeTelemetryEvent): Promise<void>;
    flush(): Promise<void>;
    close(): Promise<void>;
    private publishLifecycleEvent;
    private publishToolEvent;
    private publishLlmGenerationEvent;
    private getOrCreateSdkTrace;
    private getSdkSpanParent;
    private getSdkEventParent;
    private getSdkSubagentParent;
    private closeSdkSubagentBatchSpans;
    private ensureSdkRootSpan;
}
export declare class OtelRuntimeEventExporter implements RuntimeEventExporter {
    private readonly config;
    private readonly endpoint;
    private readonly fetchImpl;
    private readonly pendingStarts;
    private readonly queue;
    private flushTimer;
    private flushing;
    constructor(config: OtelExporterConfig, fetchImpl?: LangfuseFetch);
    publish(event: RuntimeTelemetryEvent): Promise<void>;
    flush(): Promise<void>;
    close(): Promise<void>;
    private scheduleFlush;
    private sendSpans;
}
export declare function createRuntimeEventExporterFromEnv(env: TelemetryEnvironment): RuntimeEventExporter;
export declare function createLangfuseExporter(telemetryConfig: TelemetryConfig): RuntimeEventExporter;
export declare function resolveLangfuseExporterConfig(telemetryConfig: TelemetryConfig): LangfuseExporterConfig;
export declare function resolveLangfuseConfig(env: TelemetryEnvironment): LangfuseExporterConfig;
//# sourceMappingURL=langfuse.d.ts.map