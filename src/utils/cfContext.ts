// Utility to access Cloudflare context stored by Open-Next

interface CfContextType {
  env: Record<string, any>
  ctx: any
  cf: any
}

function getCfContext(): CfContextType | undefined {
  return (globalThis as any)[Symbol.for('__cloudflare-context__')]
}

export function getCfEnv(): Record<string, any> | undefined {
  return getCfContext()?.env
}

export function getCfCtx(): any | undefined {
  return getCfContext()?.ctx
}
