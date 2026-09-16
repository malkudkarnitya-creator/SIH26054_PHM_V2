export const severityTone = (severity) => ({ LOW: 'green', MEDIUM: 'yellow', HIGH: 'orange', CRITICAL: 'red' }[severity] || 'neutral')
export const faultTone = (fault) => ({ HEALTHY: 'green', COOLING_ISSUE: 'amber', SENSOR_FAULT: 'orange', ENGINE_DEGRADATION: 'red' }[fault] || 'neutral')
export const healthTone = (value) => value < 50 ? 'red' : value < 80 ? 'yellow' : 'green'
