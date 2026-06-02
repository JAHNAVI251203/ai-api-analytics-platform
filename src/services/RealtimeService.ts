import { Server } from 'socket.io';

export class RealtimeService {
    private io: Server;
    
    constructor(io: Server) {
        this.io = io;
    }
    
    // Emit new log event
    emitNewLog(log: any) {
        this.io.to('logs').emit('new-log', {
            timestamp: new Date(),
            log
        });
    }
    
    // Emit metrics update
    emitMetricsUpdate(metrics: any) {
        this.io.to('metrics').emit('metrics-update', {
            timestamp: new Date(),
            metrics
        });
    }
    
    // Emit error alert
    emitErrorAlert(error: any) {
        this.io.to('alerts').emit('error-alert', {
            timestamp: new Date(),
            error,
            severity: error.occurrence_count > 50 ? 'high' : 'medium'
        });
    }
    
    // Emit anomaly detection
    emitAnomaly(anomaly: any) {
        this.io.to('alerts').emit('anomaly-detected', {
            timestamp: new Date(),
            anomaly
        });
    }
}