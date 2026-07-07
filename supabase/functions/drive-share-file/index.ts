import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function getGoogleToken(sa: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const header = b64url({ alg: 'RS256', typ: 'JWT' })
  const claim  = b64url({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })

  const pem = sa.private_key.replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${header}.${claim}.${sigB64}`,
  })
  const { access_token, error } = await res.json()
  if (!access_token) throw new Error(`Token exchange failed: ${error || 'unknown'}`)
  return access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { fileId } = await req.json()
    if (!fileId) return json({ error: 'Missing fileId' }, 400)

    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not set')

    const token = await getGoogleToken(JSON.parse(saJson))

    const permRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      }
    )
    if (!permRes.ok) {
      const errText = await permRes.text()
      throw new Error(`Failed to set permissions (${permRes.status}): ${errText}`)
    }

    return json({ shareUrl: `https://drive.google.com/file/d/${fileId}/view` })
  } catch (e) {
    console.error('drive-share-file error:', e.message)
    return json({ error: e.message }, 500)
  }
})
