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
    
    emitErrorAlert(error: any) {
        this.io.to('alerts').emit('error-alert', {
            timestamp: new Date(),
            error,
            severity: error.occurrence_count > 50 ? 'high' : 'medium'
        });
    }
    
}
