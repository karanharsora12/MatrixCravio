import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { DiningTable } from '../../types/index.js';
import { Button } from '../../components/ui/Button.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { useConfirm } from '../../components/ui/AlertDialog.js';
import { toast } from '../../components/ui/Toast.js';
import { PrintableQRLabelsModal } from './PrintableQRLabelsModal.js';
import { getTableStatusBadge } from '../../lib/utils.js';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Plus,
  Printer,
  RefreshCw,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../auth/AuthStore.js';

export const TableManagementPage: React.FC = () => {
  const currentRestaurant = useAuthStore((state) => state.currentRestaurant);
  const { confirm } = useConfirm();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [previewTable, setPreviewTable] = useState<DiningTable | null>(null);

  // New Table Form
  const [tableNumber, setTableNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [zone, setZone] = useState('Indoor Dining');
  const [capacity, setCapacity] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTables = () => {
    api.get<any>('/tables')
      .then((res) => {
        if (res.success) {
          setTables(res.tables || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res: any = await api.post('/tables', {
        tableNumber,
        displayName: displayName || `Table ${tableNumber}`,
        zone,
        capacity: Number(capacity),
      });
      if (res.success) {
        setIsCreateOpen(false);
        setTableNumber('');
        setDisplayName('');
        toast.success('Table Created', `Table ${tableNumber} has been added.`);
        fetchTables();
      }
    } catch (err: any) {
      toast.error('Failed to Create Table', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tableId: string, status: string) => {
    try {
      await api.put(`/tables/${tableId}/status`, { status });
      toast.info('Table Status Updated', `Status changed to ${status.toLowerCase()}.`);
      fetchTables();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleRegenerateQR = async (tableId: string, tableNum?: string) => {
    const ok = await confirm({
      title: 'Regenerate Table QR Code?',
      description: `Regenerating this QR code for ${tableNum || 'this table'} will immediately revoke the existing physical QR code. Customers scanning the old code will no longer be able to order.`,
      confirmText: 'Regenerate QR Token',
      cancelText: 'Keep Existing',
      variant: 'warning',
    });

    if (!ok) return;

    try {
      await api.post(`/tables/${tableId}/qr/generate`);
      fetchTables();
      toast.success('New QR Code Generated', 'The cryptographic table token has been refreshed.');
    } catch (err: any) {
      toast.error('Failed to regenerate QR', err.message);
    }
  };

  const zones = ['all', ...Array.from(new Set(tables.map((t) => t.zone)))];

  const filteredTables = selectedZone === 'all' ? tables : tables.filter((t) => t.zone === selectedZone);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Tables & QR Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dining tables, track real-time occupancy, and generate cryptographic QR tokens
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(true)}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print All QR Cards
          </Button>

          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Zone filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
        {zones.map((z) => (
          <button
            key={z}
            onClick={() => setSelectedZone(z)}
            className={`px-3.5 py-1.5 rounded-xl border capitalize whitespace-nowrap transition-all ${
              selectedZone === z
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border/70 hover:bg-muted'
            }`}
          >
            {z === 'all' ? 'All Zones' : z}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading tables...</div>
      ) : filteredTables.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-card rounded-3xl border border-border/60">
          <p className="text-sm font-bold text-foreground">No tables configured in this zone</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((t) => {
            const statusBadge = getTableStatusBadge(t.status);
            const customerUrl = `${window.location.origin}/menu/${t.qrToken || ''}`;

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-black font-display text-foreground block">{t.tableNumber}</span>
                      <span className="text-xs text-muted-foreground font-medium line-clamp-1">{t.displayName}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>Cap: {t.capacity}</span>
                    </span>
                    <span className="text-[11px] font-medium bg-muted/60 px-2 py-0.5 rounded">{t.zone}</span>
                  </div>

                  {/* Active orders indicator if any */}
                  {t.activeOrdersCount && t.activeOrdersCount > 0 ? (
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center justify-between">
                      <span>Active Orders</span>
                      <span>{t.activeOrdersCount} in progress</span>
                    </div>
                  ) : null}

                  {/* QR Token Status */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Cryptographic QR Token
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground truncate block max-w-full">
                      {t.qrToken || 'None'}
                    </span>
                  </div>
                </div>

                {/* Actions: View QR, Regenerate, Status toggle */}
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setPreviewTable(t)}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" />
                      View QR
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title="Regenerate secure token"
                      onClick={() => handleRegenerateQR(t.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-primary"
                      title="Open Customer Menu in new tab"
                      onClick={() => window.open(customerUrl, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Status Dropdown / Quick buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {['available', 'occupied', 'reserved', 'maintenance'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(t.id, st)}
                        className={`text-[10px] font-bold py-1 px-2 rounded-lg border capitalize transition-all ${
                          t.status === st
                            ? 'bg-foreground text-background border-foreground font-black'
                            : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal with Sticky Header, Scrollable Body & Sticky Footer */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Dining Table"
        description="Configure a new table and generate its QR token"
        maxWidth="sm"
        onSubmit={handleCreateTable}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Table
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Table Number / Code"
            required
            placeholder="e.g. T-07 or P-12"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
          />

          <Input
            label="Display Name / Location"
            placeholder="e.g. Window Side Booth 7"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <Select
            label="Dining Zone / Section"
            searchable={false}
            options={[
              { value: 'Indoor Dining', label: 'Indoor Dining' },
              { value: 'Terrace Garden', label: 'Terrace Garden' },
              { value: 'VIP Lounge', label: 'VIP Lounge' },
              { value: 'Bar & Cocktails', label: 'Bar & Cocktails' },
              { value: 'Patio', label: 'Patio' },
            ]}
            value={zone}
            onChange={setZone}
          />

          <Input
            label="Seating Capacity (Guests)"
            type="number"
            min={1}
            max={50}
            required
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
          />
        </div>
      </Dialog>

      {/* Single Table QR Code Preview Modal */}
      <Dialog
        isOpen={!!previewTable}
        onClose={() => setPreviewTable(null)}
        title={previewTable ? `${previewTable.tableNumber} QR Code` : 'QR Code'}
        maxWidth="sm"
        footer={
          previewTable && (
            <Button
              className="w-full"
              onClick={() => window.open(`/menu/${previewTable.qrToken}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open Customer Menu
            </Button>
          )
        }
      >
        {previewTable && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-white rounded-3xl border border-border inline-block shadow-md">
              <QRCodeSVG
                value={`${window.location.origin}/menu/${previewTable.qrToken || ''}`}
                size={200}
                level="H"
                fgColor="#0F172A"
              />
            </div>

            <div>
              <h3 className="font-bold text-base text-foreground">{previewTable.displayName}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                {window.location.origin}/menu/{previewTable.qrToken}
              </p>
            </div>
          </div>
        )}
      </Dialog>

      {/* Printable Sheet Modal */}
      <PrintableQRLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        tables={tables}
        restaurantName={currentRestaurant?.restaurantName || 'Cravio Bistro'}
      />
    </div>
  );
};
