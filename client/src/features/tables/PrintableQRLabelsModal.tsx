import React from 'react';
import { Dialog } from '../../components/ui/Dialog.js';
import { Button } from '../../components/ui/Button.js';
import { DiningTable } from '../../types/index.js';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, QrCode } from 'lucide-react';

interface PrintableQRLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: DiningTable[];
  restaurantName: string;
}

export const PrintableQRLabelsModal: React.FC<PrintableQRLabelsModalProps> = ({
  isOpen,
  onClose,
  tables,
  restaurantName,
}) => {
  const origin = window.location.origin;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Printable QR Table Tent Cards"
      description="Commercial QR labels ready for acrylic stands or table cards"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        <div className="flex justify-end print:hidden">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print All Table Tent Cards
          </Button>
        </div>

        {/* Printable Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 print:gap-8">
          {tables.map((t) => {
            const customerUrl = `${origin}/menu/${t.qrToken || 'crv_tok_table_01_window'}`;

            return (
              <div
                key={t.id}
                className="border-2 border-border/80 rounded-3xl p-6 bg-card text-center flex flex-col items-center justify-between shadow-sm relative overflow-hidden break-inside-avoid print:border-black print:shadow-none"
              >
                {/* Brand Header */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary font-display">
                    Matrix Cravio
                  </span>
                  <h3 className="text-base font-extrabold font-display leading-tight text-foreground">
                    {restaurantName}
                  </h3>
                  <div className="inline-block px-3 py-1 bg-muted rounded-full text-xs font-bold text-foreground mt-1">
                    {t.tableNumber} • {t.displayName}
                  </div>
                </div>

                {/* QR Code Graphic */}
                <div className="my-5 p-4 rounded-2xl bg-white border border-border/50 shadow-inner inline-block">
                  <QRCodeSVG
                    value={customerUrl}
                    size={160}
                    level="H"
                    includeMargin={false}
                    fgColor="#0F172A"
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-foreground">Scan with phone camera</p>
                  <p className="text-[11px] text-muted-foreground">Browse menu • Customize • Place order</p>
                  <p className="text-[9px] font-mono text-muted-foreground/80 mt-1 truncate max-w-[220px]">
                    {customerUrl}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
