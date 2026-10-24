import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog.js';
import { Button } from '../../components/ui/Button.js';
import { api } from '../../lib/api.js';
import { Bell, Droplet, Receipt, UtensilsCrossed, CheckCircle2, Sparkles } from 'lucide-react';
import { ServiceRequestType } from '../../types/index.js';

interface WaiterCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrToken: string;
  sessionToken?: string;
  tableNumber: string;
}

export const WaiterCallModal: React.FC<WaiterCallModalProps> = ({
  isOpen,
  onClose,
  qrToken,
  sessionToken,
  tableNumber,
}) => {
  const [selectedType, setSelectedType] = useState<ServiceRequestType>('call_waiter');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOptions: Array<{ type: ServiceRequestType; label: string; icon: any; desc: string }> = [
    { type: 'call_waiter', label: 'Call Waiter', icon: Bell, desc: 'Request staff to come to your table' },
    { type: 'request_water', label: 'Water Refill', icon: Droplet, desc: 'Fresh drinking water for table' },
    { type: 'request_cutlery', label: 'Extra Cutlery', icon: UtensilsCrossed, desc: 'Forks, spoons, napkins or plates' },
    { type: 'request_bill', label: 'Request Bill', icon: Receipt, desc: 'Request your final bill at the table' },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/public/service-requests', {
        qrToken,
        sessionToken,
        type: selectedType,
        notes: notes.trim() || undefined,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setNotes('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Table Assistance"
      description={`Assistance for ${tableNumber}`}
      maxWidth="md"
      footer={
        !isSuccess && (
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" isLoading={isSubmitting} onClick={handleSubmit}>
              Notify Staff
            </Button>
          </div>
        )
      }
    >
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold font-display text-foreground">Staff Notified!</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            A staff member has been alerted and will arrive at your table momentarily.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {requestOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20'
                      : 'border-border/60 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{opt.desc}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Additional Details (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra napkins, chilled water"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        </div>
      )}
    </Dialog>
  );
};
