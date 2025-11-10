export const QueueNames = {
  SensorProcessing: 'sensor-processing',
  ReportGeneration: 'report-generation',
  CharacterState: 'character-state',
  TimeseriesAggregation: 'timeseries-aggregation',
  Notification: 'notification',
  DeviceControl: 'device-control',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

