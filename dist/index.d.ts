import type { RuntimeLifecycleEvent, RuntimeLlmGenerationEvent, RuntimeToolEvent } from '@amaster.ai/pi-shared';
export type RuntimeTelemetryEvent = RuntimeLifecycleEvent | RuntimeToolEvent | RuntimeLlmGenerationEvent;
export type TelemetryEnvironment = Record<string, string | undefined>;
export type TelemetryFetch = (input: string, init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
}) => Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
}>;
export type TelemetryRedactor = (event: RuntimeTelemetryEvent) => RuntimeTelemetryEvent | undefined;
export type RuntimeTelemetryOptions = {
    serviceName?: string | undefined;
    serviceVersion?: string | undefined;
    includePayloads?: boolean;
    redactEvent?: TelemetryRedactor | undefined;
};
export { type RuntimeEventExporter, NoopRuntimeEventExporter, CompositeRuntimeEventExporter, } from './exporters.js';
//# sourceMappingURL=index.d.ts.map