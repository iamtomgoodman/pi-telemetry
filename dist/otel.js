import { NoopRuntimeEventExporter, } from './index.js';
import { OtelRuntimeEventExporter } from './langfuse.js';
const DEFAULT_OTEL_FLUSH_AT = 20;
const DEFAULT_OTEL_FLUSH_INTERVAL_MS = 5000;
export { OtelRuntimeEventExporter };
export function createOtelExporter(telemetryConfig, fetchImpl) {
    const config = resolveOtelExporterConfig(telemetryConfig);
    return config.enabled
        ? new OtelRuntimeEventExporter(config, fetchImpl)
        : new NoopRuntimeEventExporter();
}
export function resolveOtelExporterConfig(telemetryConfig) {
    const otel = telemetryConfig.otel;
    const endpoint = otel?.endpoint ?? '';
    return {
        enabled: Boolean(otel?.enabled && endpoint),
        endpoint,
        ...(otel?.headers ? { headers: otel.headers } : {}),
        flushAt: otel?.flushAt ?? DEFAULT_OTEL_FLUSH_AT,
        flushIntervalMs: otel?.flushIntervalMs ?? DEFAULT_OTEL_FLUSH_INTERVAL_MS,
        ...(otel?.errorLabel ? { errorLabel: otel.errorLabel } : {}),
        serviceName: telemetryConfig.serviceName ?? 'pi',
        ...(telemetryConfig.serviceVersion ? { serviceVersion: telemetryConfig.serviceVersion } : {}),
        includePayloads: telemetryConfig.includePayloads ?? true,
    };
}
export function createOtelRuntimeEventExporterFromEnv(env, fetchImpl) {
    const config = resolveOtelConfig(env);
    return config.enabled
        ? new OtelRuntimeEventExporter(config, fetchImpl)
        : new NoopRuntimeEventExporter();
}
export function resolveOtelConfig(env) {
    const sdkDisabled = parseBoolean(env.OTEL_SDK_DISABLED);
    const endpoint = trim(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? env.OTEL_EXPORTER_OTLP_ENDPOINT);
    const headers = parseHeaderList(env.OTEL_EXPORTER_OTLP_TRACES_HEADERS ?? env.OTEL_EXPORTER_OTLP_HEADERS);
    const resourceAttributes = parseHeaderList(env.OTEL_RESOURCE_ATTRIBUTES);
    const serviceName = trim(env.OTEL_SERVICE_NAME ?? resourceAttributes?.['service.name']) ?? 'pi';
    const serviceVersion = trim(env.TELEMETRY_SERVICE_VERSION ?? resourceAttributes?.['service.version']);
    return {
        enabled: Boolean(!sdkDisabled && endpoint),
        endpoint: endpoint ?? '',
        ...(headers ? { headers } : {}),
        flushAt: parsePositiveInteger(env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE, DEFAULT_OTEL_FLUSH_AT),
        flushIntervalMs: parsePositiveInteger(env.OTEL_BSP_SCHEDULE_DELAY, DEFAULT_OTEL_FLUSH_INTERVAL_MS),
        serviceName,
        ...(serviceVersion ? { serviceVersion } : {}),
        includePayloads: parseBooleanWithDefault(env.TELEMETRY_INCLUDE_PAYLOADS, true),
    };
}
function parseHeaderList(value) {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    const headers = {};
    for (const item of trimmed.split(',')) {
        const separator = item.indexOf('=');
        if (separator <= 0) {
            continue;
        }
        const key = decodeURIComponent(item.slice(0, separator).trim());
        const headerValue = decodeURIComponent(item.slice(separator + 1).trim());
        if (key) {
            headers[key] = headerValue;
        }
    }
    return Object.keys(headers).length > 0 ? headers : undefined;
}
function parseBoolean(value) {
    return value === '1' || value === 'true' || value === 'TRUE' || value === 'yes';
}
function parseBooleanWithDefault(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    return parseBoolean(value);
}
function parsePositiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function trim(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
//# sourceMappingURL=otel.js.map