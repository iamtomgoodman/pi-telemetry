import type { TelemetryConfig } from './config.js';
import { type RuntimeEventExporter, type TelemetryEnvironment, type TelemetryFetch } from './index.js';
import { type OtelExporterConfig, OtelRuntimeEventExporter } from './langfuse.js';
export { type OtelExporterConfig, OtelRuntimeEventExporter, type TelemetryFetch };
export declare function createOtelExporter(telemetryConfig: TelemetryConfig, fetchImpl?: TelemetryFetch): RuntimeEventExporter;
export declare function resolveOtelExporterConfig(telemetryConfig: TelemetryConfig): OtelExporterConfig;
export declare function createOtelRuntimeEventExporterFromEnv(env: TelemetryEnvironment, fetchImpl?: TelemetryFetch): RuntimeEventExporter;
export declare function resolveOtelConfig(env: TelemetryEnvironment): OtelExporterConfig;
//# sourceMappingURL=otel.d.ts.map