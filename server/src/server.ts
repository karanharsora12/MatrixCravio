import http from 'http';
import { createApp } from './app.js';
import { initializeSocket } from './sockets/index.js';
import { config } from './config/index.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Only listen directly if not in Vercel serverless environment
if (!process.env.VERCEL) {
  server.listen(config.port, () => {
    console.log(`🚀 Matrix Cravio Server running on http://localhost:${config.port}`);
    console.log(`📡 Socket.IO real-time engine ready`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

export default app;
export { app, server, io };
