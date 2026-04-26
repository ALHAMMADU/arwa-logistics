import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server, Socket } from 'socket.io';
import crypto from 'crypto';

const PORT = 3003;

// ─── JWT Verification ──────────────────────────────────────

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const secret = process.env.JWT_SECRET || 'arwa-logistics-jwt-secret-2026';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

// ─── HTTP Request Handler ──────────────────────────────────
// Handles REST endpoints before Socket.io processes the request

function handleHTTPRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url || '/';

  // Health check endpoint
  if (url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: io.sockets.sockets.size,
      service: 'arwa-notification-ws',
      port: PORT,
    }));
    return;
  }

  // REST API for emitting events (backend-to-WebSocket bridge)
  if (url === '/emit' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { event, room, payload } = data;

        if (!event) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'event is required' }));
          return;
        }

        if (room) {
          io.to(room).emit(event, payload);
        } else {
          io.emit(event, payload);
        }

        console.log(`[WS] Emitted "${event}" to ${room || 'broadcast'}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, event, room: room || 'broadcast' }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // All other requests are handled by Socket.io automatically
  // (Socket.io intercepts requests to /socket.io/* paths)
}

// ─── Create HTTP server with our request handler ───────────

const httpServer = createServer(handleHTTPRequest);

// ─── Socket.io Server ──────────────────────────────────────
// Using default path /socket.io/ so it doesn't conflict with
// our REST endpoints (/health, /emit)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Authenticated Socket ──────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

// ─── Authentication Middleware ──────────────────────────────

io.use((socket: AuthenticatedSocket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token as string);
    if (!payload) {
      return next(new Error('Invalid or expired token'));
    }

    socket.userId = payload.id;
    socket.userEmail = payload.email;
    socket.userRole = payload.role;

    // Join user-specific room
    socket.join(`user:${payload.id}`);

    // Join role-specific room
    socket.join(`role:${payload.role}`);

    console.log(`[WS] Client connected: ${payload.email} (${payload.role}) - socket ${socket.id}`);

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// ─── Connection Handler ────────────────────────────────────

io.on('connection', (socket: AuthenticatedSocket) => {
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[WS] Client disconnected: ${socket.userEmail} - ${reason}`);
  });

  // Handle joining specific rooms (e.g., shipment tracking)
  socket.on('join:shipment', (shipmentId: string) => {
    socket.join(`shipment:${shipmentId}`);
    console.log(`[WS] ${socket.userEmail} joined shipment:${shipmentId}`);
  });

  socket.on('leave:shipment', (shipmentId: string) => {
    socket.leave(`shipment:${shipmentId}`);
  });

  // Handle ping for connection keep-alive
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// ─── Start Server ──────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[WS] ARWA Logistics Notification WebSocket server running on port ${PORT}`);
  console.log(`[WS] Socket.io path: /socket.io/ (default)`);
  console.log(`[WS] Frontend connect: io({ path: "/socket.io", query: { XTransformPort: "${PORT}" } })`);
  console.log(`[WS] Health check: http://localhost:${PORT}/health`);
  console.log(`[WS] REST emit API: POST http://localhost:${PORT}/emit`);
});

// ─── Graceful Shutdown ─────────────────────────────────────

process.on('SIGTERM', () => {
  console.log('[WS] Received SIGTERM, shutting down...');
  io.close();
  httpServer.close(() => {
    console.log('[WS] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WS] Received SIGINT, shutting down...');
  io.close();
  httpServer.close(() => {
    console.log('[WS] Server closed');
    process.exit(0);
  });
});

export { io };
