'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  SettingsIcon,
  ShieldIcon,
  BellIcon,
  PaletteIcon,
  GlobeIcon,
  ServerIcon,
  SaveIcon,
  SunIcon,
  MoonIcon,
  BuildingIcon,
  PlaneIcon,
  ShipIcon,
  TruckIcon,
  CheckCircleIcon,
  PackageIcon,
  ClockIcon,
  WarehouseIcon,
  XIcon,
} from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────

interface GeneralSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  defaultLanguage: string;
  timezone: string;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  sidebarDefault: 'expanded' | 'collapsed';
  density: 'compact' | 'comfortable';
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  ipWhitelist: string;
}

interface ShippingSettings {
  defaultShippingMethod: 'AIR' | 'SEA' | 'LAND';
  defaultShipmentType: 'PARCEL' | 'LCL' | 'FCL';
  defaultWarehouse: string;
  autoAssignWarehouse: boolean;
  insuranceDefault: boolean;
}

interface SystemInfo {
  version: string;
  databaseStatus: 'connected' | 'disconnected';
  lastBackup: string;
  storageUsed: string;
  storageTotal: string;
}

interface AllSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  shipping: ShippingSettings;
}

const STORAGE_KEY = 'arwa_settings';

// ─── Default Values ──────────────────────────────────────

const defaultSettings: AllSettings = {
  general: {
    companyName: 'ARWA LOGISTICS',
    companyEmail: 'admin@arwalogistics.com',
    companyPhone: '+86 755 8888 9999',
    defaultLanguage: 'en',
    timezone: 'Asia/Shanghai',
  },
  appearance: {
    theme: 'light',
    primaryColor: '#059669',
    sidebarDefault: 'expanded',
    density: 'comfortable',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    notificationSound: false,
    digestFrequency: 'daily',
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    ipWhitelist: '',
  },
  shipping: {
    defaultShippingMethod: 'SEA',
    defaultShipmentType: 'LCL',
    defaultWarehouse: 'warehouse-gz',
    autoAssignWarehouse: true,
    insuranceDefault: false,
  },
};

const systemInfo: SystemInfo = {
  version: '2.4.1',
  databaseStatus: 'connected',
  lastBackup: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  storageUsed: '12.4 GB',
  storageTotal: '50 GB',
};

const warehouses = [
  { id: 'warehouse-gz', name: 'Guangzhou Main Warehouse' },
  { id: 'warehouse-sz', name: 'Shenzhen Distribution Center' },
  { id: 'warehouse-yw', name: 'Yiwu Small Goods Hub' },
  { id: 'warehouse-sh', name: 'Shanghai International Hub' },
  { id: 'warehouse-nb', name: 'Ningbo Port Warehouse' },
];

const timezones = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];

// ─── Helper: Load Settings ──────────────────────────────

function loadSettings(): AllSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        general: { ...defaultSettings.general, ...parsed.general },
        appearance: { ...defaultSettings.appearance, ...parsed.appearance },
        notifications: { ...defaultSettings.notifications, ...parsed.notifications },
        security: { ...defaultSettings.security, ...parsed.security },
        shipping: { ...defaultSettings.shipping, ...parsed.shipping },
      };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

// ─── Section Header ──────────────────────────────────────

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

// ─── Form Row ────────────────────────────────────────────

function FormRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>{children}</div>;
}

function FormField({
  label,
  id,
  children,
  description,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </Label>
      {children}
      {description && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
      )}
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5 min-w-0">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
        <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-emerald-600 shrink-0"
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function AdminSettings() {
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Mark as changed when settings update
  const updateSettings = useCallback((updater: (prev: AllSettings) => AllSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  }, []);

  // Save handler
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setHasChanges(false);
      toast.success('Settings saved successfully', {
        description: 'Your changes have been persisted to local storage.',
      });
    } catch {
      toast.error('Failed to save settings', {
        description: 'Could not write to local storage.',
      });
    }
  };

  // Reset handler
  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.info('Settings reset to defaults', {
      description: 'Click Save to persist the reset.',
    });
  };

  // Storage usage percentage
  const storagePercent = Math.round(
    (parseFloat(systemInfo.storageUsed) / parseFloat(systemInfo.storageTotal)) * 100
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage platform configuration and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge
              variant="outline"
              className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
            >
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── Settings Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="general"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <GlobeIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">General</span>
            <span className="sm:hidden">General</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <PaletteIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Look</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <BellIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <ShieldIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="shipping"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <ShipIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Shipping</span>
            <span className="sm:hidden">Ship</span>
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm px-3 py-2 text-xs sm:text-sm"
          >
            <ServerIcon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ GENERAL SETTINGS ═══════════ */}
        <TabsContent value="general">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<GlobeIcon className="w-5 h-5" />}
                title="General Settings"
                description="Core company information and regional preferences"
              />
            </CardHeader>
            <CardContent className="space-y-6">
              <FormRow>
                <FormField label="Company Name" id="companyName">
                  <Input
                    id="companyName"
                    value={settings.general.companyName}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, companyName: e.target.value },
                      }))
                    }
                    className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </FormField>
                <FormField label="Company Email" id="companyEmail">
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.general.companyEmail}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, companyEmail: e.target.value },
                      }))
                    }
                    className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Company Phone" id="companyPhone">
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={settings.general.companyPhone}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, companyPhone: e.target.value },
                      }))
                    }
                    className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </FormField>
                <FormField label="Default Language" id="defaultLanguage">
                  <Select
                    value={settings.general.defaultLanguage}
                    onValueChange={(value) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, defaultLanguage: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文 (Chinese)</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="fr">Français (French)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Timezone" id="timezone">
                  <Select
                    value={settings.general.timezone}
                    onValueChange={(value) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, timezone: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ APPEARANCE SETTINGS ═══════════ */}
        <TabsContent value="appearance">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<PaletteIcon className="w-5 h-5" />}
                title="Appearance"
                description="Customize the visual style and layout of the dashboard"
              />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
                  Theme
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: 'light' as const,
                      label: 'Light',
                      icon: <SunIcon className="w-5 h-5" />,
                    },
                    {
                      value: 'dark' as const,
                      label: 'Dark',
                      icon: <MoonIcon className="w-5 h-5" />,
                    },
                    {
                      value: 'system' as const,
                      label: 'System',
                      icon: <SettingsIcon className="w-5 h-5" />,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, theme: option.value },
                        }))
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        settings.appearance.theme === option.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {option.icon}
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

              {/* Primary Color */}
              <FormField label="Primary Color" id="primaryColor" description="Used for buttons, links, and accent elements">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={settings.appearance.primaryColor}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, primaryColor: e.target.value },
                      }))
                    }
                    className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                  />
                  <Input
                    value={settings.appearance.primaryColor}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, primaryColor: e.target.value },
                      }))
                    }
                    className="w-32 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm"
                  />
                  <div
                    className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 shrink-0"
                    style={{ backgroundColor: settings.appearance.primaryColor }}
                  />
                </div>
              </FormField>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

              <FormRow>
                <FormField label="Sidebar Default State" id="sidebarDefault">
                  <Select
                    value={settings.appearance.sidebarDefault}
                    onValueChange={(value: 'expanded' | 'collapsed') =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, sidebarDefault: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expanded">Expanded</SelectItem>
                      <SelectItem value="collapsed">Collapsed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Density" id="density">
                  <Select
                    value={settings.appearance.density}
                    onValueChange={(value: 'compact' | 'comfortable') =>
                      updateSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, density: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ NOTIFICATION SETTINGS ═══════════ */}
        <TabsContent value="notifications">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<BellIcon className="w-5 h-5" />}
                title="Notifications"
                description="Control how and when you receive alerts"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <SwitchRow
                label="Email Notifications"
                description="Receive shipment updates and alerts via email"
                checked={settings.notifications.emailNotifications}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, emailNotifications: checked },
                  }))
                }
              />
              <Separator className="bg-slate-100 dark:bg-slate-700" />
              <SwitchRow
                label="Push Notifications"
                description="Receive browser push notifications for real-time updates"
                checked={settings.notifications.pushNotifications}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, pushNotifications: checked },
                  }))
                }
              />
              <Separator className="bg-slate-100 dark:bg-slate-700" />
              <SwitchRow
                label="Notification Sound"
                description="Play a sound when new notifications arrive"
                checked={settings.notifications.notificationSound}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, notificationSound: checked },
                  }))
                }
              />
              <Separator className="bg-slate-100 dark:bg-slate-700" />

              <div className="pt-2">
                <FormField label="Digest Frequency" id="digestFrequency" description="How often you receive summary digests">
                  <Select
                    value={settings.notifications.digestFrequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'never') =>
                      updateSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, digestFrequency: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-64 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ SECURITY SETTINGS ═══════════ */}
        <TabsContent value="security">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<ShieldIcon className="w-5 h-5" />}
                title="Security"
                description="Authentication, session, and password policies"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <SwitchRow
                label="Two-Factor Authentication"
                description="Require 2FA for all admin accounts"
                checked={settings.security.twoFactorAuth}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, twoFactorAuth: checked },
                  }))
                }
              />
              <Separator className="bg-slate-100 dark:bg-slate-700" />

              <div className="pt-4 space-y-4">
                <FormRow>
                  <FormField
                    label="Session Timeout (minutes)"
                    id="sessionTimeout"
                    description="Auto-logout after inactivity"
                  >
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min={5}
                      max={480}
                      value={settings.security.sessionTimeout}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          security: {
                            ...prev.security,
                            sessionTimeout: parseInt(e.target.value) || 30,
                          },
                        }))
                      }
                      className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </FormField>
                  <div />
                </FormRow>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

          <div className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Password Policy
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Configure password requirements for all users
                </p>
              </div>
            </div>

            <div className="space-y-4 pl-2">
              <FormField label="Minimum Password Length" id="passwordMinLength">
                <Input
                  id="passwordMinLength"
                  type="number"
                  min={6}
                  max={32}
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        passwordMinLength: parseInt(e.target.value) || 8,
                      },
                    }))
                  }
                  className="w-full sm:w-32 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </FormField>

              <SwitchRow
                label="Require Uppercase Letters"
                description="Passwords must contain at least one uppercase letter"
                checked={settings.security.passwordRequireUppercase}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, passwordRequireUppercase: checked },
                  }))
                }
              />

              <SwitchRow
                label="Require Numbers"
                description="Passwords must contain at least one number"
                checked={settings.security.passwordRequireNumbers}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    security: { ...prev.security, passwordRequireNumbers: checked },
                  }))
                }
              />
            </div>
          </div>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

              <div className="pt-4">
                <FormField
                  label="IP Whitelist"
                  id="ipWhitelist"
                  description="One IP address or CIDR range per line. Leave empty to allow all."
                >
                  <Textarea
                    id="ipWhitelist"
                    value={settings.security.ipWhitelist}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, ipWhitelist: e.target.value },
                      }))
                    }
                    placeholder={"192.168.1.0/24\n10.0.0.1\n203.0.113.0/28"}
                    rows={4}
                    className="font-mono text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-y"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ SHIPPING DEFAULTS ═══════════ */}
        <TabsContent value="shipping">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<ShipIcon className="w-5 h-5" />}
                title="Shipping Defaults"
                description="Default values for new shipments and warehouse operations"
              />
            </CardHeader>
            <CardContent className="space-y-6">
              <FormRow>
                <FormField label="Default Shipping Method" id="defaultShippingMethod">
                  <Select
                    value={settings.shipping.defaultShippingMethod}
                    onValueChange={(value: 'AIR' | 'SEA' | 'LAND') =>
                      updateSettings((prev) => ({
                        ...prev,
                        shipping: { ...prev.shipping, defaultShippingMethod: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AIR">
                        <div className="flex items-center gap-2">
                          <PlaneIcon className="w-4 h-4 text-sky-500" />
                          <span>AIR</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="SEA">
                        <div className="flex items-center gap-2">
                          <ShipIcon className="w-4 h-4 text-indigo-500" />
                          <span>SEA</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="LAND">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="w-4 h-4 text-amber-500" />
                          <span>LAND</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Default Shipment Type" id="defaultShipmentType">
                  <Select
                    value={settings.shipping.defaultShipmentType}
                    onValueChange={(value: 'PARCEL' | 'LCL' | 'FCL') =>
                      updateSettings((prev) => ({
                        ...prev,
                        shipping: { ...prev.shipping, defaultShipmentType: value },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARCEL">PARCEL — Small packages</SelectItem>
                      <SelectItem value="LCL">LCL — Less than Container Load</SelectItem>
                      <SelectItem value="FCL">FCL — Full Container Load</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>

              <FormField label="Default Warehouse" id="defaultWarehouse">
                <Select
                  value={settings.shipping.defaultWarehouse}
                  onValueChange={(value) =>
                    updateSettings((prev) => ({
                      ...prev,
                      shipping: { ...prev.shipping, defaultWarehouse: value },
                    }))
                  }
                >
                  <SelectTrigger className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-emerald-500" />
                          <span>{wh.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

              <SwitchRow
                label="Auto-Assign Warehouse"
                description="Automatically assign the nearest warehouse to new shipments"
                checked={settings.shipping.autoAssignWarehouse}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    shipping: { ...prev.shipping, autoAssignWarehouse: checked },
                  }))
                }
              />
              <Separator className="bg-slate-100 dark:bg-slate-700" />
              <SwitchRow
                label="Insurance Default"
                description="Enable shipment insurance by default for new bookings"
                checked={settings.shipping.insuranceDefault}
                onCheckedChange={(checked) =>
                  updateSettings((prev) => ({
                    ...prev,
                    shipping: { ...prev.shipping, insuranceDefault: checked },
                  }))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ SYSTEM INFO ═══════════ */}
        <TabsContent value="system">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <SectionHeader
                icon={<ServerIcon className="w-5 h-5" />}
                title="System Information"
                description="Current system status and diagnostics"
              />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Version */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <SettingsIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      System Version
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    v{systemInfo.version}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    ARWA LOGISTICS Platform
                  </p>
                </div>

                {/* Database Status */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <ServerIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Database Status
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {systemInfo.databaseStatus === 'connected' ? 'Connected' : 'Disconnected'}
                    </p>
                    {systemInfo.databaseStatus === 'connected' ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    SQLite via Prisma ORM
                  </p>
                </div>

                {/* Last Backup */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                      <ClockIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Last Backup
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {new Date(systemInfo.lastBackup).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {new Date(systemInfo.lastBackup).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    —{' '}
                    {Math.round((Date.now() - new Date(systemInfo.lastBackup).getTime()) / 3600000)}h
                    ago
                  </p>
                </div>

                {/* Storage Usage */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <PackageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Storage Usage
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {systemInfo.storageUsed}
                    </p>
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      / {systemInfo.storageTotal}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    {storagePercent}% used — {parseFloat(systemInfo.storageTotal) - parseFloat(systemInfo.storageUsed)} GB available
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-700" />

              {/* Environment Details */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Environment Details
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {[
                        { label: 'Runtime', value: 'Next.js 16 (App Router)' },
                        { label: 'Database', value: 'SQLite via Prisma ORM' },
                        { label: 'Node Environment', value: typeof window !== 'undefined' ? 'client' : 'server' },
                        { label: 'API Base', value: '/api' },
                        { label: 'Locale', value: settings.general.defaultLanguage.toUpperCase() },
                        { label: 'Timezone', value: settings.general.timezone.replace(/_/g, ' ') },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 w-40">
                            {row.label}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
