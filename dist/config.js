import { loadPiSettings } from '@amaster.ai/pi-shared/settings';
const DEFAULTS = {
    serviceName: 'pi-server',
    includePayloads: true,
};
export function resolveConfig(config) {
    return { ...DEFAULTS, ...config };
}
export function loadConfigFromFile(options) {
    return loadPiSettings('pi-telemetry', { ...options });
}
//# sourceMappingURL=config.js.map