import { Request } from 'express';

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'user';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRequestType = 'call_waiter' | 'request_water' | 'request_cutlery' | 'request_bill' | 'cleaning';

export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'resolved';

export interface AuthUserPayload {
  userId: string;
  email: string;
  fullName: string;
  systemRole: string;
  restaurantId?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
