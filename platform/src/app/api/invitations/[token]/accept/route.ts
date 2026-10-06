import { NextRequest } from 'next/server'
import { POST as acceptHandler } from '../route'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  return acceptHandler(req, context)
}
