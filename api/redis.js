const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

async function redisCommand(command, ...args) {
    const key = args[0];
    
    try {
        if (command === 'get') {
            const response = await fetch(`${REDIS_URL}/get/${key}`, {
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.result ? JSON.parse(data.result) : null;
        }
        
        if (command === 'set') {
            const value = args[1];
            const response = await fetch(`${REDIS_URL}/set/${key}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
                body: JSON.stringify(value)
            });
            return response.ok;
        }
        
        if (command === 'del') {
            const response = await fetch(`${REDIS_URL}/del/${key}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
            });
            return response.ok;
        }
        
        if (command === 'keys') {
            const pattern = key;
            const response = await fetch(`${REDIS_URL}/keys/${pattern}`, {
                headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.result || [];
        }
    } catch (error) {
        console.error('Redis error:', error);
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, key, value } = req.body;

    try {
        let result;

        if (action === 'get') {
            result = await redisCommand('get', key);
        } else if (action === 'set') {
            result = await redisCommand('set', key, value);
        } else if (action === 'del') {
            result = await redisCommand('del', key);
        } else if (action === 'keys') {
            result = await redisCommand('keys', key);
        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
