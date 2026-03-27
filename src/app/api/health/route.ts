import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    keySet: Boolean(process.env.OPENAI_API_KEY),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  })
}
