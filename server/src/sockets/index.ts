import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow client connections
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket: Socket) => {
    // Join restaurant staff room
    socket.on('join_restaurant', (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}`);
      }
    });

    // Join kitchen display room
    socket.on('join_kitchen', (restaurantId: string) => {
      if (restaurantId) {
        socket.join(`kitchen:${restaurantId}`);
      }
    });

    // Join table room (waiters or customers at this table)
    socket.on('join_table', ({ restaurantId, tableId }: { restaurantId: string; tableId: string }) => {
      if (restaurantId && tableId) {
        socket.join(`table:${restaurantId}:${tableId}`);
      }
    });

    // Customer joins specific order room to track status
    socket.on('join_order', (orderId: string) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      // socket disconnected
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

// Helpers for emitting real-time events
export const RealtimeEvents = {
  // New order created by customer
  emitNewOrder(restaurantId: string, order: any) {
    if (!io) return;
    io.to(`restaurant:${restaurantId}`).emit('new_order', order);
    io.to(`kitchen:${restaurantId}`).emit('new_order', order);
    if (order.tableId) {
      io.to(`table:${restaurantId}:${order.tableId}`).emit('table_order_update', order);
    }
  },

  // Order status changed (PENDING -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED / CANCELLED)
  emitOrderStatusUpdated(restaurantId: string, order: any) {
    if (!io) return;
    io.to(`restaurant:${restaurantId}`).emit('order_status_updated', order);
    io.to(`kitchen:${restaurantId}`).emit('order_status_updated', order);
    io.to(`order:${order.id}`).emit('order_status_updated', order);
    if (order.tableId) {
      io.to(`table:${restaurantId}:${order.tableId}`).emit('table_order_update', order);
    }
  },

  // Service request (Call Waiter, Water, Bill)
  emitServiceRequest(restaurantId: string, request: any) {
    if (!io) return;
    io.to(`restaurant:${restaurantId}`).emit('service_request_created', request);
  },

  emitServiceRequestResolved(restaurantId: string, request: any) {
    if (!io) return;
    io.to(`restaurant:${restaurantId}`).emit('service_request_updated', request);
  },
};
