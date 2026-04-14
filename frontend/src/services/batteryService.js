import API from './api';

export const getAllBatteries    = ()         => API.get('/batteries');
export const getBatteryById     = (id)       => API.get(`/batteries/${id}`);
export const updateBatteryStatus = (id, data) => API.put(`/batteries/${id}/status`, data);
export const getBatteryTelemetry = (id)      => API.get(`/batteries/${id}/telemetry`);
export const getTelemetryLogs    = (batteryId) => API.get(`/telemetry/${batteryId}`);
export const ingestTelemetry     = (data)    => API.post('/telemetry', data);
