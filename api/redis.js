export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const REDIS_URL = process.env.KV_REST_API_URL;
    const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!REDIS_URL || !REDIS_TOKEN) {
        return res.status(500).json({ error: 'Redis credentials not configured' });
    }

    const { action, key, value } = req.body;

    try {
        if (action === 'get') {
            const response = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`
                }
            });
            const data = await response.json();
            
            if (data.result) {
                try {
                    const parsed = JSON.parse(data.result);
                    return res.status(200).json({ success: true, result: parsed });
                } catch (e) {
                    return res.status(200).json({ success: true, result: data.result });
                }
            }
            return res.status(200).json({ success: true, result: null });
        }
        
        if (action === 'set') {
            const valueStr = JSON.stringify(value);
            const response = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: valueStr
            });
            
            return res.status(200).json({ success: true, result: true });
        }
        
        if (action === 'del') {
            const response = await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`
                }
            });
            
            return res.status(200).json({ success: true, result: true });
        }
        
        if (action === 'keys') {
            // 使用 SCAN 命令替代 KEYS（更有效率且更可靠）
            const pattern = key || '*';
            const response = await fetch(`${REDIS_URL}/scan/0?match=${pattern}&count=100`, {
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`
                }
            });
            
            const data = await response.json();
            
            // SCAN 返回格式: [cursor, [keys]]
            if (data.result && Array.isArray(data.result) && data.result.length > 1) {
                const keys = data.result[1] || [];
                return res.status(200).json({ success: true, result: keys });
            }
            
            // 備用：直接使用 KEYS 命令
            const keysResponse = await fetch(`${REDIS_URL}/keys/${pattern}`, {
                headers: { 
                    Authorization: `Bearer ${REDIS_TOKEN}`
                }
            });
            
            const keysData = await keysResponse.json();
            const keysList = Array.isArray(keysData.result) ? keysData.result : [];
            return res.status(200).json({ success: true, result: keysList });
        }
        
        return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
