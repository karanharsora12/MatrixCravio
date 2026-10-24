import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { ImageUpload } from '../../components/ui/ImageUpload.js';
import { Restaurant, RestaurantSettings } from '../../types/index.js';
import { Settings, Store, Clock, Percent, ShieldCheck, Users, Save } from 'lucide-react';
import { useAuthStore } from '../auth/AuthStore.js';

export const SettingsPage: React.FC = () => {
  const currentRestaurant = useAuthStore((state) => state.currentRestaurant);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [taxPercentage, setTaxPercentage] = useState('5.00');
  const [serviceChargePercentage, setServiceChargePercentage] = useState('5.00');
  const [openingTime, setOpeningTime] = useState('11:00');
  const [closingTime, setClosingTime] = useState('23:30');
  const [allowOrdering, setAllowOrdering] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);

  // Settings
  const [enableSound, setEnableSound] = useState(true);
  const [enableCancellation, setEnableCancellation] = useState(true);
  const [cancellationSeconds, setCancellationSeconds] = useState(120);
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('');
  const [receiptFooterText, setReceiptFooterText] = useState('');

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<any>('/restaurants/current'),
      api.get<any>('/restaurants/staff').catch(() => ({ success: true, staff: [] })),
    ])
      .then(([restRes, staffRes]) => {
        if (restRes.success && restRes.restaurant) {
          const r = restRes.restaurant;
          const s = restRes.settings;
          setRestaurant(r);
          setSettings(s);

          setName(r.name || '');
          setTagline(r.tagline || '');
          setLogoUrl(r.logoUrl || '');
          setPhone(r.phone || '');
          setEmail(r.email || '');
          setAddress(r.address || '');
          setCity(r.city || '');
          setCurrencySymbol(r.currencySymbol || '₹');
          setTaxPercentage(r.taxPercentage || '5.00');
          setServiceChargePercentage(r.serviceChargePercentage || '0.00');
          setOpeningTime(r.openingTime || '11:00');
          setClosingTime(r.closingTime || '23:30');
          setAllowOrdering(Boolean(r.allowOrdering));
          setAutoAcceptOrders(Boolean(r.autoAcceptOrders));

          if (s) {
            setEnableSound(Boolean(s.enableSoundNotifications));
            setEnableCancellation(Boolean(s.enableCustomerCancellation));
            setCancellationSeconds(s.customerCancellationWindowSeconds || 120);
            setTaxRegistrationNumber(s.taxRegistrationNumber || '');
            setReceiptFooterText(s.receiptFooterText || '');
          }
        }
        if (staffRes.success) {
          setStaff(staffRes.staff || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/restaurants/current', {
        name,
        tagline,
        logoUrl,
        phone,
        email,
        address,
        city,
        currencySymbol,
        taxPercentage,
        serviceChargePercentage,
        openingTime,
        closingTime,
        allowOrdering,
        autoAcceptOrders,
      });

      await api.put('/restaurants/settings', {
        enableSoundNotifications: enableSound,
        enableCustomerCancellation: enableCancellation,
        customerCancellationWindowSeconds: Number(cancellationSeconds),
        taxRegistrationNumber,
        receiptFooterText,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">Restaurant Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure branding, financial taxation policies, operating hours, and staff access
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Restaurant Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span>Restaurant Profile & Brand</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Restaurant Name" required value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Brand Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>

            <ImageUpload
              label="Restaurant Brand Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              helperText="Upload official logo or restaurant mark for menu banner and receipts"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Contact Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Contact Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Street Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours & Ordering Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Operating Hours & Order Control</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Opening Time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
              <Input label="Closing Time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOrdering}
                  onChange={(e) => setAllowOrdering(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Allow Customer QR Ordering</span>
                  <span className="text-[11px] text-muted-foreground">
                    When unchecked, guests can only view the menu and cannot place orders
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAcceptOrders}
                  onChange={(e) => setAutoAcceptOrders(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">Auto-Accept Orders to Kitchen</span>
                  <span className="text-[11px] text-muted-foreground">
                    Skip staff approval stage and route orders directly to the Kitchen KDS in ACCEPTED state
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Taxes & Financial Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-emerald-500" />
              <span>Taxes & Service Charges</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Currency Symbol"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
              <Input
                label="Tax Percentage (GST %)"
                type="number"
                step="0.01"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
              />
              <Input
                label="Service Charge %"
                type="number"
                step="0.01"
                value={serviceChargePercentage}
                onChange={(e) => setServiceChargePercentage(e.target.value)}
              />
            </div>

            <Input
              label="GSTIN / Tax Registration Number"
              placeholder="e.g. 07AAAAA0000A1Z5"
              value={taxRegistrationNumber}
              onChange={(e) => setTaxRegistrationNumber(e.target.value)}
            />

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Receipt Footer Greeting Note
              </label>
              <input
                type="text"
                value={receiptFooterText}
                onChange={(e) => setReceiptFooterText(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-input text-xs bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Staff Team Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>Staff Team Members ({staff.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/40">
              {staff.map((s) => (
                <div key={s.id} className="py-2.5 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-foreground block">{s.fullName}</span>
                    <span className="text-[11px] text-muted-foreground">{s.email}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize font-bold text-[10px]">
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              ✓ Settings saved successfully!
            </span>
          )}
          <Button type="submit" isLoading={isSaving} className="gap-2 font-bold px-6">
            <Save className="h-4 w-4" />
            Save Restaurant Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
