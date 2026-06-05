import { Server } from 'socket.io';

export class RealtimeService {
    private io: Server;
    
    constructor(io: Server) {
        this.io = io;
    }
    
    emitNewLog(log: any) {
        this.io.to('logs').emit('new-log', {
            timestamp: new Date(),
            log
        });
    }
    
    emitMetricsUpdate(metrics: any) {
        this.io.to('metrics').emit('metrics-update', {
            timestamp: new Date(),
            metrics
        });
    }
    
    emitErrorAlert(error: any) {
        this.io.to('alerts').emit('error-alert', {
            timestamp: new Date(),
            error,
            severity: error.occurrence_count > 50 ? 'high' : 'medium'
        });
    }
    
    emitAnomaly(anomaly: any) {
        this.io.to('alerts').emit('anomaly-detected', {
            timestamp: new Date(),
            anomaly
        });
    }
}