export class NoopRuntimeEventExporter {
    async publish(_event) { }
    async flush() { }
    async close() { }
}
export class CompositeRuntimeEventExporter {
    exporters;
    constructor(exporters) {
        this.exporters = exporters;
    }
    async publish(event) {
        await Promise.allSettled(this.exporters.map((exporter) => exporter.publish(event)));
    }
    async flush() {
        await Promise.allSettled(this.exporters.map((exporter) => exporter.flush?.()));
    }
    async close() {
        await this.flush();
        await Promise.allSettled(this.exporters.map((exporter) => exporter.close?.()));
    }
}
//# sourceMappingURL=exporters.js.map