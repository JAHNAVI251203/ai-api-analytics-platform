async function loadTest() {
    const endpoints = ['/api/users', '/api/posts', '/api/comments'];
    const methods = ['GET', 'POST', 'PUT'];
    const statusCodes = [200, 201, 400, 404, 500];
    
    console.log('Starting load test: 100 requests/second for 60 seconds');
    
    const interval = setInterval(async () => {
        for (let i = 0; i < 100; i++) {
            fetch('http://localhost:3000/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
                    method: methods[Math.floor(Math.random() * methods.length)],
                    status_code: statusCodes[Math.floor(Math.random() * statusCodes.length)],
                    response_time: Math.floor(Math.random() * 500)
                })
            });
        }
    }, 1000);
    
    setTimeout(() => {
        clearInterval(interval);
        console.log('Load test complete!');
    }, 60000);
}

loadTest();