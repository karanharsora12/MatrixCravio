import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { ServiceRequest } from '../../types/index.js';
import { Button } from '../../components/ui/Button.js';
import { toast } from '../../components/ui/Toast.js';
import { formatDateTime } from '../../lib/utils.js';
import { Bell, Droplet, UtensilsCrossed, Receipt, CheckCircle, Clock } from 'lucide-react';

export const StaffServiceRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = () => {
    api.get<any>('/service-requests')
      .then((res) => {
        if (res.success) {
          setRequests(res.requests || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRequests();

    const socket = getSocket();
    socket.on('service_request_created', () => {
      fetchRequests();
    });
    socket.on('service_request_updated', () => {
      fetchRequests();
    });

    return () => {
      socket.off('service_request_created');
      socket.off('service_request_updated');
    };
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.put(`/service-requests/${id}/acknowledge`);
      toast.info('Request Acknowledged', 'Staff member assigned to table.');
      fetchRequests();
    } catch (err: any) {
      toast.error('Failed to acknowledge request', err.message);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.put(`/service-requests/${id}/resolve`);
      toast.success('Request Resolved', 'Table service complete.');
      fetchRequests();
    } catch (err: any) {
      toast.error('Failed to resolve request', err.message);
    }
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'call_waiter':
        return <Bell className="h-5 w-5 text-orange-500" />;
      case 'request_water':
        return <Droplet className="h-5 w-5 text-blue-500" />;
      case 'request_cutlery':
        return <UtensilsCrossed className="h-5 w-5 text-purple-500" />;
      case 'request_bill':
        return <Receipt className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">
          Waiter Service Calls
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time table assistance requests submitted by customers from smartphones
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading service requests...</div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-card rounded-3xl border border-border/60">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto opacity-80" />
          <h3 className="text-base font-bold text-foreground">No Pending Service Calls</h3>
          <p className="text-xs text-muted-foreground">All customer assistance calls have been resolved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className={`rounded-2xl border p-5 shadow-sm space-y-4 bg-card transition-all flex flex-col justify-between ${
                req.status === 'pending'
                  ? 'border-orange-500/80 bg-orange-500/5'
                  : 'border-blue-500/80 bg-blue-500/5'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                      {getRequestIcon(req.type)}
                    </div>
                    <div>
                      <span className="font-extrabold text-base font-display text-foreground block">
                        {req.tableNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {req.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                      req.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-300 animate-pulse'
                        : 'bg-blue-500/10 text-blue-600 border-blue-300'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {req.notes && (
                  <p className="text-xs bg-card/80 p-2.5 rounded-xl border border-border/40 text-foreground italic">
                    &quot;{req.notes}&quot;
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(req.createdAt)}
                  </span>
                  {req.assignedStaffName && (
                    <span className="font-semibold text-foreground">Handled by: {req.assignedStaffName}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border/40">
                {req.status === 'pending' ? (
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleAcknowledge(req.id)}
                  >
                    Acknowledge
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleResolve(req.id)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Mark Resolved
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
