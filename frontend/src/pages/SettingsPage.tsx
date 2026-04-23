import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("thresholds");

  return (
    <div className="space-y-4">
      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {[
          { id: "thresholds", label: "Risk Thresholds" },
          { id: "roles", label: "User Roles" },
          { id: "api", label: "API Configuration" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-colors",
              activeTab === tab.id
                ? "bg-cyan-400/15 text-cyan-200 border border-cyan-400/20"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "thresholds" && <ThresholdSettings />}
      {activeTab === "roles" && <RoleSettings />}
      {activeTab === "api" && <ApiSettings />}
    </div>
  );
}

function ThresholdSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SettingGroup
        title="Temperature Thresholds"
        description="Thermal breach and warning levels"
        settings={[
          { label: "High Risk Score", value: ">= 0.80", editable: true },
          { label: "Prediction Escalation", value: "< 20 min", editable: true },
          { label: "Tarmac Dwell Watch", value: "> 12 min", editable: true },
          { label: "Ground Delay Alert", value: "> 15 min", editable: true },
        ]}
      />
      <SettingGroup
        title="Exposure Limits"
        description="Maximum exposure time per phase"
        settings={[
          { label: "Tarmac Max", value: "45 min", editable: true },
          { label: "Ground Delay Max", value: "30 min", editable: true },
          { label: "Flight Max", value: "120 min", editable: true },
          { label: "Total Exposure Max", value: "180 min", editable: true },
        ]}
      />
      <SettingGroup
        title="Auto-Actions"
        description="Automated response triggers"
        settings={[
          { label: "Auto-assign Critical", value: "Enabled", editable: true },
          { label: "Escalation Delay", value: "5 min", editable: true },
          { label: "Supervisor Notify", value: "HIGH only", editable: true },
          { label: "Workflow Auto-start", value: "Enabled", editable: true },
        ]}
      />
    </div>
  );
}

function RoleSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SettingGroup
        title="Role Definitions"
        description="Active user roles and permissions"
        settings={[
          { label: "Handler", value: "Execute tasks, update status", editable: false },
          { label: "Supervisor", value: "Assign, escalate, review", editable: false },
          { label: "Ops Control", value: "Full system access", editable: false },
          { label: "Auditor", value: "Read-only, reports", editable: false },
        ]}
      />
      <SettingGroup
        title="Permission Matrix"
        description="Feature access by role"
        settings={[
          { label: "Realtime Action Routing", value: "Handler+", editable: true },
          { label: "Audit Trail Retention", value: "90 days", editable: true },
          { label: "Alert Acknowledgment", value: "Handler+", editable: true },
          { label: "Config Changes", value: "Ops Control only", editable: true },
        ]}
      />
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SettingGroup
        title="Connection Status"
        description="Live feed and ingestion status"
        settings={[
          { label: "Socket.IO Feed", value: "Connected", editable: false },
          { label: "MQTT Ingestion", value: "Online", editable: false },
          { label: "Offline Queue", value: "Enabled", editable: false },
          { label: "API Version", value: "v2.4.1", editable: false },
        ]}
      />
      <SettingGroup
        title="Endpoints"
        description="Configured API endpoints"
        settings={[
          { label: "Control Center", value: "/api/control-center", editable: true },
          { label: "Telemetry Stream", value: "/api/telemetry", editable: true },
          { label: "Actions API", value: "/api/actions", editable: true },
          { label: "Platform Health", value: "/api/platform", editable: true },
        ]}
      />
      <SettingGroup
        title="Sync Settings"
        description="Offline and synchronization config"
        settings={[
          { label: "Auto-sync Interval", value: "30s", editable: true },
          { label: "Max Queue Size", value: "100 items", editable: true },
          { label: "Retry Attempts", value: "3", editable: true },
          { label: "Conflict Resolution", value: "Server wins", editable: true },
        ]}
      />
    </div>
  );
}

function SettingGroup({
  title,
  description,
  settings,
}: {
  title: string;
  description: string;
  settings: { label: string; value: string; editable: boolean }[];
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {settings.map((setting) => (
          <div
            key={setting.label}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              setting.editable
                ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.05] cursor-pointer"
                : "border-white/5 bg-white/[0.02]"
            )}
          >
            <span className="text-sm text-slate-300">{setting.label}</span>
            <span className={cn(
              "text-sm",
              setting.value === "Enabled" || setting.value === "Connected" || setting.value === "Online"
                ? "text-emerald-400"
                : "text-slate-400"
            )}>
              {setting.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
