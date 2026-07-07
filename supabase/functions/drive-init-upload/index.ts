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

async function findOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
  const safe = name.replace(/'/g, "\\'")
  const q = parentId
    ? `name='${safe}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const { files } = await search.json()
  if (files?.length) return files[0].id

  const body: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) body.parents = [parentId]

  const create = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const folder = await create.json()
  if (!folder.id) throw new Error(`Failed to create folder "${name}": ${JSON.stringify(folder)}`)
  return folder.id
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { coachName, sessionDate, sessionName, fileName, contentType, size } = await req.json()
    if (!coachName || !sessionDate || !sessionName || !fileName || !size) {
      return json({ error: 'Missing required fields: coachName, sessionDate, sessionName, fileName, size' }, 400)
    }

    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not set')

    const token  = await getGoogleToken(JSON.parse(saJson))
    const folderId = '11hu2uWPyyZ4mFXaVNwYAjf5fbra5M-ZR'

    const safe      = `${coachName}-${sessionDate}-${sessionName.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)}`
    const ext       = fileName.includes('.') ? fileName.split('.').pop() : 'mp4'
    const driveName = `${safe}.${ext}`

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': contentType || 'video/mp4',
          'X-Upload-Content-Length': String(size),
        },
        body: JSON.stringify({ name: driveName, parents: [folderId] }),
      }
    )

    if (!initRes.ok) {
      const errText = await initRes.text()
      throw new Error(`Drive init failed (${initRes.status}): ${errText}`)
    }

    const uploadUrl = initRes.headers.get('Location')
    if (!uploadUrl) throw new Error('No Location header in Drive response')

    return json({ uploadUrl })
  } catch (e) {
    console.error('drive-init-upload error:', e.message)
    return json({ error: e.message }, 500)
  }
})
