/* eslint-disable @typescript-eslint/no-explicit-any */
import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';
import type { FunctionReference } from 'convex/server';

const http = httpRouter();

function resolveMutation(path: string): FunctionReference<'mutation', 'public'> | null {
  const [moduleName, fnName] = path.split(/[.:]/);
  const mod = (api as any)[moduleName];
  return mod?.[fnName] ?? null;
}

function resolveQuery(path: string): FunctionReference<'query', 'public'> | null {
  const [moduleName, fnName] = path.split(/[.:]/);
  const mod = (api as any)[moduleName];
  return mod?.[fnName] ?? null;
}

http.route({
  path: '/mutation',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { path, args } = body as { path: string; args: Record<string, unknown> };

    const fn = resolveMutation(path);
    if (!fn) {
      return new Response(JSON.stringify({ error: `Function ${path} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const value = await ctx.runMutation(fn, args);
      return new Response(JSON.stringify({ value }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message ?? 'Internal error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),
});

http.route({
  path: '/query',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { path, args } = body as { path: string; args: Record<string, unknown> };

    const fn = resolveQuery(path);
    if (!fn) {
      return new Response(JSON.stringify({ error: `Function ${path} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const value = await ctx.runQuery(fn, args);
      return new Response(JSON.stringify({ value }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message ?? 'Internal error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),
});

export default http;
