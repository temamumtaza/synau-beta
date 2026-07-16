import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [resource, id, action] = slug;

  // POST /api/mastra/agents/:agentId/generate
  if (resource === 'agents' && action === 'generate') {
    try {
      const agent = mastra.getAgent(id as 'synauAgent');
      const body = await req.json();
      const { messages, threadId, resourceId } = body;

      const memoryOption =
        threadId && resourceId
          ? { memory: { thread: threadId, resource: resourceId } }
          : {};

      const result = await agent.generate(messages, memoryOption);
      return NextResponse.json({ text: result.text, usage: result.usage });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const [resource] = slug;

  // GET /api/mastra/agents
  if (resource === 'agents') {
    return NextResponse.json({
      agents: [{ id: 'synauAgent', name: 'Synau Agent' }],
    });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}
