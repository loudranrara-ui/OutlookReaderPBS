import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed')
        return
    }

    try {
        const rawBody = typeof req.body === 'string'
            ? req.body
            : new URLSearchParams(req.body as Record<string, string>).toString()

        const tokenResponse = await fetch('https://login.live.com/oauth20_token.srf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            body: rawBody,
        })

        const data = await tokenResponse.json()
        res.status(tokenResponse.status).json(data)
    } catch {
        res.status(502).json({ error: 'Proxy failed to reach Live OAuth' })
    }
}

