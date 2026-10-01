import { promises as dns } from 'dns';
import net from 'net';

const configuredHosts = (value = process.env.WEBHOOK_ALLOWED_HOSTS) => (value || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
const allowedHost = (hostname: string, hosts = configuredHosts()) => hosts.some(host =>
    host.startsWith('*.') ? hostname === host.slice(2) || hostname.endsWith(`.${host.slice(2)}`) : hostname === host);
const privateAddress = (address: string) => {
    if (net.isIP(address) === 4) return /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.)/.test(address);
    return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:');
};

export const isAllowedWebhookUrl = (value: unknown, allowedHostsValue = process.env.WEBHOOK_ALLOWED_HOSTS) => {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && (!url.port || url.port === '443') && !url.username && !url.password && allowedHost(url.hostname.toLowerCase(), configuredHosts(allowedHostsValue));
    } catch { return false; }
};

export const isPublicWebhookHost = async (value: string) => {
    const url = new URL(value);
    const records = await dns.lookup(url.hostname, { all: true });
    return records.length > 0 && records.every(record => !privateAddress(record.address));
};
