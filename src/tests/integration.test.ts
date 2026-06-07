import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

async function testAPI() {
    const logResponse = await axios.post(`${BASE_URL}/logs`, {
        endpoint: '/test',
        method: 'GET',
        status_code: 200,
        response_time: 50
    });
    console.log('✅ Log ingestion:', logResponse.data);
    
    const metricsResponse = await axios.get(`${BASE_URL}/metrics`);
    console.log('✅ Metrics:', metricsResponse.data);
    
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard`);
    console.log('✅ Dashboard:', dashboardResponse.data);
    
    const aiResponse = await axios.get(`${BASE_URL}/ai/analyze-errors`);
    console.log('✅ AI Analysis:', aiResponse.data);
}

testAPI();