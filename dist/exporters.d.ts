import type { RuntimeTelemetryEvent } from './index.js';
export interface RuntimeEventExporter {
    publish(event: RuntimeTelemetryEvent): Promise<void>;
    flush?(): Promise<void>;
    close?(): Promise<void>;
}
export declare class NoopRuntimeEventExporter implements RuntimeEventExporter {
    publish(_event: RuntimeTelemetryEvent): Promise<void>;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export declare class CompositeRuntimeEventExporter implements RuntimeEventExporter {
    private readonly exporters;
    constructor(exporters: RuntimeEventExporter[]);
    publish(event: RuntimeTelemetryEvent): Promise<void>;
    flush(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=exporters.d.ts.map