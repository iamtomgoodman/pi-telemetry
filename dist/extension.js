import { randomUUID } from 'node:crypto';
import { loadConfigFromFile, resolveConfig } from './config.js';
import { CompositeRuntimeEventExporter, NoopRuntimeEventExporter, } from './exporters.js';
import { createLangfuseExporter } from './langfuse.js';
import { createOtelExporter } from './otel.js';
function modelConfigFromCtx(ctx) {
    const model = ctx.model;
    if (!model) {
        return { provider: 'unknown', model: 'unknown' };
    }
    return {
        provider: model.provider ?? 'unknown',
        model: model.id ?? model.name ?? 'unknown',
    };
}
function extractOutput(message) {
    if (!message || typeof message !== 'object')
        return undefined;
    const msg = message;
    if (msg.role !== 'assistant' || !Array.isArray(msg.content))
        return undefined;
    const texts = [];
    for (const block of msg.content) {
        if (block &&
            typeof block === 'object' &&
            'type' in block &&
            block.type === 'text' &&
            'text' in block) {
            texts.push(String(block.text));
        }
    }
    return texts.length > 0 ? texts.join('\n') : undefined;
}
function simplifyContent(content) {
    if (typeof content === 'string')
        return content;
    if (!Array.isArray(content) || content.length === 0)
        return content;
    const allText = content.every((b) => b && typeof b === 'object' && 'type' in b && b.type === 'text');
    if (allText) {
        const texts = content.map((b) => String(b.text));
        return texts.join('\n');
    }
    return content;
}
function toolEventDetails(result) {
    const rawDetails = result && typeof result === 'object' && !Array.isArray(result)
        ? result.details
        : undefined;
    const details = sanitizeToolDetails(rawDetails);
    const output = summarizeToolResultOutput(result, rawDetails);
    if (output !== undefined && details.output === undefined) {
        details.output = output;
    }
    return Object.keys(details).length > 0 ? details : undefined;
}
function sanitizeToolDetails(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    const sanitized = {};
    for (const [key, raw] of Object.entries(value)) {
        if (key === 'fullOutput' || key === 'fullOutputMimeType') {
            continue;
        }
        sanitized[key] = toTelemetryValue(raw);
    }
    return sanitized;
}
function summarizeToolResultOutput(result, details) {
    if (result === undefined || shouldSuppressToolOutput(details)) {
        return undefined;
    }
    if (typeof result === 'string') {
        return summarizeString(result);
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return toTelemetryValue(result);
    }
    const resultRecord = result;
    if (resultRecord.output !== undefined) {
        return toTelemetryValue(resultRecord.output);
    }
    const text = textContentFromToolResult(resultRecord);
    if (text) {
        return summarizeString(text);
    }
    return resultRecord.content !== undefined ? toTelemetryValue(resultRecord.content) : undefined;
}
function textContentFromToolResult(result) {
    if (!Array.isArray(result.content)) {
        return undefined;
    }
    const text = result.content
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => {
        const record = item;
        return typeof record.text === 'string' ? record.text : undefined;
    })
        .filter(Boolean)
        .join('\n');
    return text || undefined;
}
function shouldSuppressToolOutput(details) {
    return Boolean(details &&
        typeof details === 'object' &&
        !Array.isArray(details) &&
        details.outputSuppressed === true);
}
function toTelemetryValue(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return summarizeString(value);
    }
    if (Array.isArray(value)) {
        return value.map(toTelemetryValue).filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, raw]) => [key, toTelemetryValue(raw)]));
    }
    return String(value);
}
function summarizeString(value) {
    return value.length > 500
        ? `${value.slice(0, 500)}... [truncated ${value.length - 500} chars]`
        : value;
}
function mapUsage(usage) {
    const result = {};
    if (typeof usage.input === 'number')
        result.input = usage.input;
    if (typeof usage.output === 'number')
        result.output = usage.output;
    if (typeof usage.cacheRead === 'number')
        result.cacheRead = usage.cacheRead;
    if (typeof usage.cacheWrite === 'number')
        result.cacheWrite = usage.cacheWrite;
    if (typeof usage.totalTokens === 'number')
        result.totalTokens = usage.totalTokens;
    if (usage.cost != null && typeof usage.cost === 'object')
        result.cost = usage.cost;
    return result;
}
export default function telemetryExtension(pi) {
    const inheritedTraceId = process.env.PI_TELEMETRY_TRACE_ID;
    const inheritedSessionId = process.env.PI_TELEMETRY_SESSION_ID;
    const ownerPid = process.env.PI_TELEMETRY_OWNER_PID;
    const isSubagent = Boolean(inheritedTraceId && ownerPid && ownerPid !== String(process.pid));
    let exporter = new NoopRuntimeEventExporter();
    const localSessionId = randomUUID();
    const sessionId = isSubagent && inheritedSessionId ? inheritedSessionId : localSessionId;
    let currentTraceId = isSubagent ? inheritedTraceId : undefined;
    let traceStartTime;
    let tracePublished = false;
    let llmGenerationCounter = 0;
    let pendingInput;
    let lastModelConfig = { provider: 'unknown', model: 'unknown' };
    pi.on('session_start', async (_event, ctx) => {
        const config = resolveConfig(loadConfigFromFile({ cwd: ctx.cwd }));
        const langfuse = createLangfuseExporter(config);
        const otel = createOtelExporter(config);
        const active = [langfuse, otel].filter((e) => !(e instanceof NoopRuntimeEventExporter));
        if (active.length > 1) {
            exporter = new CompositeRuntimeEventExporter(active);
        }
        else if (active.length === 1) {
            exporter = active[0];
        }
    });
    pi.on('input', async (event) => {
        pendingInput = event.text;
        if (!isSubagent) {
            currentTraceId = randomUUID().replace(/-/g, '');
            process.env.PI_TELEMETRY_TRACE_ID = currentTraceId;
            process.env.PI_TELEMETRY_SESSION_ID = sessionId;
            process.env.PI_TELEMETRY_OWNER_PID = String(process.pid);
        }
        traceStartTime = undefined;
        tracePublished = false;
        llmGenerationCounter = 0;
    });
    pi.on('turn_start', async (event) => {
        if (!currentTraceId) {
            currentTraceId = randomUUID().replace(/-/g, '');
            llmGenerationCounter = 0;
            tracePublished = false;
        }
        if (!traceStartTime) {
            traceStartTime = event.timestamp;
        }
        if (!tracePublished) {
            tracePublished = true;
            if (isSubagent) {
                await exporter.publish({
                    id: randomUUID(),
                    traceId: currentTraceId,
                    type: 'subagent_started',
                    sessionId,
                    childSessionId: localSessionId,
                    createdAt: new Date(event.timestamp).toISOString(),
                    ...(pendingInput !== undefined ? { details: { input: pendingInput } } : {}),
                });
            }
            else {
                await exporter.publish({
                    id: randomUUID(),
                    traceId: currentTraceId,
                    type: 'chat_turn_started',
                    sessionId,
                    createdAt: new Date(event.timestamp).toISOString(),
                    ...(pendingInput !== undefined ? { details: { input: pendingInput } } : {}),
                });
            }
            pendingInput = undefined;
        }
    });
    pi.on('turn_end', async (event) => {
        if (!currentTraceId)
            return;
        const now = Date.now();
        const durationMs = traceStartTime ? now - traceStartTime : undefined;
        const output = extractOutput(event.message);
        if (isSubagent) {
            await exporter.publish({
                id: randomUUID(),
                traceId: currentTraceId,
                type: 'subagent_completed',
                sessionId,
                childSessionId: localSessionId,
                createdAt: new Date(now).toISOString(),
                ...(durationMs !== undefined ? { durationMs } : {}),
                ...(output !== undefined ? { details: { output } } : {}),
            });
        }
        else {
            await exporter.publish({
                id: randomUUID(),
                traceId: currentTraceId,
                type: 'chat_turn_completed',
                sessionId,
                createdAt: new Date(now).toISOString(),
                ...(durationMs !== undefined ? { durationMs } : {}),
                ...(output !== undefined ? { details: { output } } : {}),
            });
        }
    });
    pi.on('tool_execution_start', async (event) => {
        if (!currentTraceId)
            return;
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            sessionId: localSessionId,
            conversationId: localSessionId,
            ...(isSubagent ? { childSessionId: localSessionId } : {}),
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            status: 'started',
            createdAt: new Date().toISOString(),
            args: event.args,
        });
    });
    pi.on('tool_execution_end', async (event) => {
        if (!currentTraceId)
            return;
        const details = toolEventDetails(event.result);
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            sessionId: localSessionId,
            conversationId: localSessionId,
            ...(isSubagent ? { childSessionId: localSessionId } : {}),
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            status: event.isError ? 'failed' : 'completed',
            createdAt: new Date().toISOString(),
            ...(details ? { details } : {}),
            ...(event.isError
                ? { error: typeof event.result === 'string' ? event.result : JSON.stringify(event.result) }
                : {}),
        });
    });
    pi.on('before_provider_request', async (event, ctx) => {
        if (!currentTraceId)
            return;
        llmGenerationCounter++;
        lastModelConfig = modelConfigFromCtx(ctx);
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            sessionId: localSessionId,
            conversationId: localSessionId,
            ...(isSubagent ? { childSessionId: localSessionId } : {}),
            llmGenerationId: `gen-${llmGenerationCounter}`,
            status: 'started',
            createdAt: new Date().toISOString(),
            model: lastModelConfig,
            input: event.payload,
        });
    });
    pi.on('after_provider_response', async (event, ctx) => {
        if (!currentTraceId)
            return;
        if (event.status < 400)
            return;
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            sessionId: localSessionId,
            conversationId: localSessionId,
            ...(isSubagent ? { childSessionId: localSessionId } : {}),
            llmGenerationId: `gen-${llmGenerationCounter}`,
            status: 'failed',
            createdAt: new Date().toISOString(),
            model: modelConfigFromCtx(ctx),
            error: `HTTP ${event.status}`,
        });
    });
    pi.on('message_end', async (event) => {
        if (!currentTraceId)
            return;
        const msg = event.message;
        if (msg.role !== 'assistant')
            return;
        const content = simplifyContent(msg.content) ?? extractOutput(event.message);
        const usage = msg.usage;
        const mapped = usage ? mapUsage(usage) : undefined;
        const output = {};
        if (content !== undefined)
            output.content = content;
        if (usage !== undefined)
            output.usage = usage;
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            sessionId: localSessionId,
            conversationId: localSessionId,
            ...(isSubagent ? { childSessionId: localSessionId } : {}),
            llmGenerationId: `gen-${llmGenerationCounter}`,
            status: 'completed',
            createdAt: new Date().toISOString(),
            model: lastModelConfig,
            ...(Object.keys(output).length > 0 ? { output } : {}),
            ...(mapped ? { usage: mapped } : {}),
            ...(typeof msg.responseId === 'string' ? { responseId: msg.responseId } : {}),
            ...(typeof msg.stopReason === 'string' ? { stopReason: msg.stopReason } : {}),
        });
    });
    pi.on('model_select', async (event) => {
        if (!currentTraceId)
            return;
        const evt = event;
        const model = evt.model;
        const previousModel = evt.previousModel;
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            type: 'chat_turn_steered',
            sessionId,
            createdAt: new Date().toISOString(),
            details: {
                eventType: 'model_switch',
                from: previousModel
                    ? {
                        provider: String(previousModel.provider ?? 'unknown'),
                        model: String(previousModel.id ?? 'unknown'),
                    }
                    : null,
                to: model
                    ? { provider: String(model.provider ?? 'unknown'), model: String(model.id ?? 'unknown') }
                    : null,
                source: String(evt.source ?? 'unknown'),
            },
        });
    });
    pi.on('session_compact', async (event) => {
        if (!currentTraceId)
            return;
        const evt = event;
        await exporter.publish({
            id: randomUUID(),
            traceId: currentTraceId,
            type: 'chat_turn_steered',
            sessionId,
            createdAt: new Date().toISOString(),
            details: {
                eventType: 'session_compact',
                fromExtension: evt.fromExtension ?? false,
            },
        });
    });
    pi.on('session_shutdown', async () => {
        await exporter.flush?.();
        await exporter.close?.();
    });
}
//# sourceMappingURL=extension.js.map