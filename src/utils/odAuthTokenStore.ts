// Add import for Cloudflare context
import { getCfEnv } from './cfContext'

// Add helper to get the OneDrive KV namespace
function getOdKv() {
  const env = getCfEnv()
  if (!env) {
    throw new Error('Cloudflare environment not available. Make sure setCfEnv is called in the worker.')
  }
  const kv = env.ONEDRIVE_CF_INDEX_KV
  if (!kv) {
    throw new Error('ONEDRIVE_CF_INDEX_KV binding not found.')
  }
  return kv
}

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  const kv = getOdKv()
  const accessToken = await kv.get('access_token')
  const refreshToken = await kv.get('refresh_token')

  return {
    accessToken,
    refreshToken,
  }
}

export async function storeOdAuthTokens({
  accessToken,
  accessTokenExpiry,
  refreshToken,
}: {
  accessToken: string
  accessTokenExpiry: number
  refreshToken: string
}): Promise<void> {
  const kv = getOdKv()
  await kv.put('access_token', accessToken, { expirationTtl: accessTokenExpiry })
  await kv.put('refresh_token', refreshToken)
}
