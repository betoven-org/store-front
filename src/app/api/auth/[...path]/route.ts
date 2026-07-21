import { neonAuth } from "@brasa/core/auth";

// Lazy init — avoid calling handler() at module top-level (breaks build without env vars)
let _handlers: { GET: (req: Request) => Response | Promise<Response>; POST: (req: Request) => Response | Promise<Response> } | null = null;
function getHandlers() {
  if (!_handlers) _handlers = neonAuth.handler();
  return _handlers;
}

export function GET(req: Request) {
  return getHandlers().GET(req);
}

export function POST(req: Request) {
  return getHandlers().POST(req);
}
