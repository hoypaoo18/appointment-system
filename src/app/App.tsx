import { useState, useMemo } from "react";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, CalendarDays, ClipboardList, History as HistoryIcon,
  Settings, LogOut, Bell, Search, Plus, ChevronLeft, ChevronRight,
  Eye, Pencil, RefreshCw, X, CheckCircle2, AlertCircle,
  User, FileText, Check, ArrowLeft, Users, Calendar, XCircle, Activity,
  Mail, Phone, BriefcaseIcon, TrendingUp, BarChart3, CheckCheck, Ban, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "confirmed" | "rescheduled" | "completed" | "cancelled";
type Role = "assistant" | "executive" | "admin";
type AppView = "dashboard" | "appointments" | "new-appointment" | "detail" | "schedule" | "history" | "settings";
type BookStep = "client" | "meeting" | "executive" | "datetime" | "availability" | "review" | "confirmed";
type ActivityAction = "created" | "confirmed" | "rescheduled" | "cancelled" | "completed" | "updated";

interface Executive { id: string; name: string; title: string; initials: string; }
interface Appointment {
  id: string; clientName: string; clientOrg: string; clientEmail: string; clientPhone: string;
  purpose: string; notes: string; executiveId: string;
  date: string; startTime: string; duration: number; status: Status;
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
  cancellationReason?: string; previousDate?: string; previousStartTime?: string;
}
interface AppUser { id: string; name: string; email: string; role: Role; title: string; active: boolean; initials: string; }
interface ActivityEntry {
  id: string; aptId: string; action: ActivityAction;
  user: string; timestamp: string; clientName: string; note?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXECUTIVES: Executive[] = [
  { id: "exec-1", name: "Margaret Chen", title: "Chief Executive Officer", initials: "MC" },
  { id: "exec-2", name: "Robert Hargrove", title: "Chief Financial Officer", initials: "RH" },
  { id: "exec-3", name: "Victoria Santos", title: "Chief Operating Officer", initials: "VS" },
];

const TODAY = "2026-09-08";

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "APT-001", clientName: "James Whitfield", clientOrg: "Global Corp International", clientEmail: "j.whitfield@globalcorp.com", clientPhone: "+1 (555) 201-4400", purpose: "Q3 Financial Review", notes: "Bring the quarterly performance deck. Mr. Whitfield prefers concise presentations.", executiveId: "exec-1", date: TODAY, startTime: "09:00", duration: 60, status: "confirmed", createdAt: "2026-09-01T09:00:00Z", updatedAt: "2026-09-01T09:05:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-002", clientName: "Elena Martinez", clientOrg: "Apex Partners LLC", clientEmail: "e.martinez@apexpartners.com", clientPhone: "+1 (555) 308-7200", purpose: "Budget Proposal Discussion", notes: "Annual budget review for the upcoming fiscal year.", executiveId: "exec-2", date: TODAY, startTime: "11:00", duration: 45, status: "confirmed", createdAt: "2026-09-02T10:00:00Z", updatedAt: "2026-09-02T10:02:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-003", clientName: "David Kim", clientOrg: "TechVentures Asia", clientEmail: "d.kim@techventures.asia", clientPhone: "+1 (555) 445-9100", purpose: "Partnership Agreement Review", notes: "Follow-up from last month's initial meeting. Bring draft agreements.", executiveId: "exec-3", date: TODAY, startTime: "14:30", duration: 30, status: "pending", createdAt: "2026-09-05T14:00:00Z", updatedAt: "2026-09-05T14:00:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-004", clientName: "Sophie Anderson", clientOrg: "Financial Times Media", clientEmail: "s.anderson@ftmedia.com", clientPhone: "+1 (555) 562-3400", purpose: "Media Interview – Q3 Results", notes: "Approved talking points sent to CEO office on Sept 7.", executiveId: "exec-1", date: "2026-09-09", startTime: "10:00", duration: 60, status: "confirmed", createdAt: "2026-09-03T09:30:00Z", updatedAt: "2026-09-03T09:32:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-005", clientName: "Michael Thompson", clientOrg: "Meridian Capital Fund", clientEmail: "m.thompson@meridiancap.com", clientPhone: "+1 (555) 678-0200", purpose: "Investment Strategy Briefing", notes: "Confidential. No external recording.", executiveId: "exec-2", date: "2026-09-10", startTime: "09:30", duration: 90, status: "confirmed", createdAt: "2026-09-01T11:00:00Z", updatedAt: "2026-09-01T11:02:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-006", clientName: "Clara Bennett", clientOrg: "Nexus Group Holdings", clientEmail: "c.bennett@nexusgroup.com", clientPhone: "+1 (555) 731-5600", purpose: "Operations Efficiency Briefing", notes: "Include supply chain restructuring proposal in agenda.", executiveId: "exec-3", date: "2026-09-11", startTime: "15:00", duration: 60, status: "pending", createdAt: "2026-09-06T13:00:00Z", updatedAt: "2026-09-06T13:00:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-007", clientName: "Thomas Reed", clientOrg: "Reed & Associates", clientEmail: "t.reed@reedassoc.com", clientPhone: "+1 (555) 842-1100", purpose: "Board Member Quarterly Meeting", notes: "Recurring quarterly check-in. Board room reserved.", executiveId: "exec-1", date: "2026-09-12", startTime: "11:00", duration: 45, status: "confirmed", createdAt: "2026-08-15T09:00:00Z", updatedAt: "2026-08-15T09:02:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-008", clientName: "Aria Patel", clientOrg: "Patel Ventures", clientEmail: "a.patel@patelventures.com", clientPhone: "+1 (555) 901-3300", purpose: "Investor Relations Update", notes: "Quarterly investor update meeting.", executiveId: "exec-1", date: "2026-09-04", startTime: "10:00", duration: 60, status: "completed", createdAt: "2026-08-20T10:00:00Z", updatedAt: "2026-09-04T11:05:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-009", clientName: "Lucas Rivera", clientOrg: "Rivera Tax Consultants", clientEmail: "l.rivera@riveratax.com", clientPhone: "+1 (555) 023-6700", purpose: "Annual Tax Planning Session", notes: "Year-end tax strategy review.", executiveId: "exec-2", date: "2026-09-02", startTime: "14:00", duration: 90, status: "completed", createdAt: "2026-08-18T14:00:00Z", updatedAt: "2026-09-02T15:35:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-010", clientName: "Grace Tanaka", clientOrg: "Horizon Suppliers Ltd", clientEmail: "g.tanaka@horizonsup.com", clientPhone: "+1 (555) 145-8800", purpose: "Vendor Contract Negotiation", notes: "Price renegotiation for equipment contracts.", executiveId: "exec-3", date: "2026-08-29", startTime: "09:00", duration: 60, status: "cancelled", cancellationReason: "Client unable to attend. To be rescheduled.", createdAt: "2026-08-10T09:00:00Z", updatedAt: "2026-08-28T17:30:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
  { id: "APT-011", clientName: "Nathan Brooks", clientOrg: "Brooks Legal Group", clientEmail: "n.brooks@brookslegal.com", clientPhone: "+1 (555) 267-4400", purpose: "Legal Strategy Consultation", notes: "Regarding ongoing litigation review.", executiveId: "exec-1", date: "2026-09-15", startTime: "13:00", duration: 60, status: "rescheduled", previousDate: "2026-09-10", previousStartTime: "10:00", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-07T09:00:00Z", createdBy: "Sarah Mitchell", updatedBy: "Sarah Mitchell" },
];

const INITIAL_USERS: AppUser[] = [
  { id: "user-1", name: "Sarah Mitchell", email: "sarah.mitchell@meridian.com", role: "assistant", title: "Executive Assistant", active: true, initials: "SM" },
  { id: "user-2", name: "Margaret Chen", email: "margaret.chen@meridian.com", role: "executive", title: "Chief Executive Officer", active: true, initials: "MC" },
  { id: "user-3", name: "Robert Hargrove", email: "robert.hargrove@meridian.com", role: "executive", title: "Chief Financial Officer", active: true, initials: "RH" },
  { id: "user-4", name: "Victoria Santos", email: "victoria.santos@meridian.com", role: "executive", title: "Chief Operating Officer", active: true, initials: "VS" },
  { id: "user-5", name: "James Alderton", email: "j.alderton@meridian.com", role: "admin", title: "System Administrator", active: true, initials: "JA" },
];

const INITIAL_ACTIVITY: ActivityEntry[] = [
  { id: "ACT-001", aptId: "APT-001", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-01T09:00:00Z", clientName: "James Whitfield" },
  { id: "ACT-002", aptId: "APT-001", action: "confirmed",   user: "Sarah Mitchell", timestamp: "2026-09-01T09:05:00Z", clientName: "James Whitfield" },
  { id: "ACT-003", aptId: "APT-002", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-02T10:00:00Z", clientName: "Elena Martinez" },
  { id: "ACT-004", aptId: "APT-002", action: "confirmed",   user: "Sarah Mitchell", timestamp: "2026-09-02T10:02:00Z", clientName: "Elena Martinez" },
  { id: "ACT-005", aptId: "APT-003", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-05T14:00:00Z", clientName: "David Kim" },
  { id: "ACT-006", aptId: "APT-004", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-03T09:30:00Z", clientName: "Sophie Anderson" },
  { id: "ACT-007", aptId: "APT-004", action: "confirmed",   user: "Sarah Mitchell", timestamp: "2026-09-03T09:32:00Z", clientName: "Sophie Anderson" },
  { id: "ACT-008", aptId: "APT-005", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-01T11:00:00Z", clientName: "Michael Thompson" },
  { id: "ACT-009", aptId: "APT-005", action: "confirmed",   user: "Sarah Mitchell", timestamp: "2026-09-01T11:02:00Z", clientName: "Michael Thompson" },
  { id: "ACT-010", aptId: "APT-006", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-06T13:00:00Z", clientName: "Clara Bennett" },
  { id: "ACT-011", aptId: "APT-007", action: "created",     user: "Sarah Mitchell", timestamp: "2026-08-15T09:00:00Z", clientName: "Thomas Reed" },
  { id: "ACT-012", aptId: "APT-007", action: "confirmed",   user: "Sarah Mitchell", timestamp: "2026-08-15T09:02:00Z", clientName: "Thomas Reed" },
  { id: "ACT-013", aptId: "APT-008", action: "created",     user: "Sarah Mitchell", timestamp: "2026-08-20T10:00:00Z", clientName: "Aria Patel" },
  { id: "ACT-014", aptId: "APT-008", action: "completed",   user: "Sarah Mitchell", timestamp: "2026-09-04T11:05:00Z", clientName: "Aria Patel" },
  { id: "ACT-015", aptId: "APT-009", action: "created",     user: "Sarah Mitchell", timestamp: "2026-08-18T14:00:00Z", clientName: "Lucas Rivera" },
  { id: "ACT-016", aptId: "APT-009", action: "completed",   user: "Sarah Mitchell", timestamp: "2026-09-02T15:35:00Z", clientName: "Lucas Rivera" },
  { id: "ACT-017", aptId: "APT-010", action: "created",     user: "Sarah Mitchell", timestamp: "2026-08-10T09:00:00Z", clientName: "Grace Tanaka" },
  { id: "ACT-018", aptId: "APT-010", action: "cancelled",   user: "Sarah Mitchell", timestamp: "2026-08-28T17:30:00Z", clientName: "Grace Tanaka", note: "Client unable to attend." },
  { id: "ACT-019", aptId: "APT-011", action: "created",     user: "Sarah Mitchell", timestamp: "2026-09-01T10:00:00Z", clientName: "Nathan Brooks" },
  { id: "ACT-020", aptId: "APT-011", action: "rescheduled", user: "Sarah Mitchell", timestamp: "2026-09-07T09:00:00Z", clientName: "Nathan Brooks", note: "Moved from Sept 10 to Sept 15" },
];

const CANCEL_REASONS = ["Client requested cancellation","Executive unavailable","Schedule conflict","Meeting no longer needed","Other"];

const NOTIFICATION_DEFAULTS = { confirmations: true, rescheduling: true, cancellations: true, reminders: false, conflicts: true };

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
function fmtDateShort(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(t: string) { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; }
function fmtTs(ts: string) { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
function addMin(t: string, min: number): string { const [h, m] = t.split(":").map(Number); const total = h * 60 + m + min; return `${Math.floor(total / 60) % 24}`.padStart(2, "0") + ":" + `${total % 60}`.padStart(2, "0"); }
function toMin(t: string): number { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function genId(): string { return "APT-" + String(Math.floor(Math.random() * 9000) + 1000); }
function genActId(): string { return "ACT-" + Date.now(); }
function findConflict(apts: Appointment[], execId: string, date: string, startTime: string, duration: number, excludeId?: string): Appointment | null {
  const start = toMin(startTime), end = start + duration;
  for (const a of apts) {
    if (a.executiveId !== execId || a.date !== date) continue;
    if (excludeId && a.id === excludeId) continue;
    if (["cancelled","completed"].includes(a.status)) continue;
    const s = toMin(a.startTime), e = s + a.duration;
    if (!(end <= s || start >= e)) return a;
  }
  return null;
}
function getExec(id: string) { return EXECUTIVES.find(e => e.id === id); }

const STATUS_CFG: Record<Status, { label: string; cls: string; dot: string }> = {
  pending:     { label: "Pending",     cls: "bg-amber-50/80 text-amber-700 border-amber-200/80",       dot: "bg-amber-400" },
  confirmed:   { label: "Confirmed",   cls: "bg-emerald-50/80 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500" },
  rescheduled: { label: "Rescheduled", cls: "bg-blue-50/80 text-blue-700 border-blue-200/80",          dot: "bg-blue-500" },
  completed:   { label: "Completed",   cls: "bg-slate-100/80 text-slate-600 border-slate-300/80",      dot: "bg-slate-400" },
  cancelled:   { label: "Cancelled",   cls: "bg-red-50/80 text-red-700 border-red-200/80",             dot: "bg-red-400" },
};

const ACTIVITY_CFG: Record<ActivityAction, { label: string; Icon: React.FC<{ className?: string }>; cls: string }> = {
  created:     { label: "Appointment Created",     Icon: Plus,          cls: "bg-blue-100/80 text-blue-600 border-blue-200/60" },
  confirmed:   { label: "Appointment Confirmed",   Icon: CheckCircle2,  cls: "bg-emerald-100/80 text-emerald-600 border-emerald-200/60" },
  rescheduled: { label: "Appointment Rescheduled", Icon: RefreshCw,     cls: "bg-indigo-100/80 text-indigo-600 border-indigo-200/60" },
  cancelled:   { label: "Appointment Cancelled",   Icon: XCircle,       cls: "bg-red-100/80 text-red-600 border-red-200/60" },
  completed:   { label: "Appointment Completed",   Icon: CheckCheck,    cls: "bg-slate-100/80 text-slate-600 border-slate-200/60" },
  updated:     { label: "Appointment Updated",     Icon: Pencil,        cls: "bg-amber-100/80 text-amber-600 border-amber-200/60" },
};

const TIME_OPTIONS = Array.from({ length: 20 }, (_, i) => { const total = 8 * 60 + i * 30; return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`; });
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ─── Style tokens ─────────────────────────────────────────────────────────────

const glass = "bg-white/70 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-900/[0.06]";
const glassStrong = "bg-white/80 backdrop-blur-xl border border-white/70 shadow-xl shadow-slate-900/[0.08]";
const glassDark = "bg-slate-900/82 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-slate-900/40";
const inp = "w-full px-3 py-2 text-sm rounded-xl border bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400";
const inpOk = `${inp} border-white/60`;
const inpErr = `${inp} border-red-300/60 bg-red-50/40`;

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border backdrop-blur-sm ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Av({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  return <div className={`flex items-center justify-center rounded-full bg-blue-500/20 text-blue-700 font-semibold flex-shrink-0 border border-blue-300/40 ${sz[size]}`}>{initials}</div>;
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tt inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-slate-900/95 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tt:opacity-100 transition-opacity duration-150 z-50 shadow-lg">{label}</span>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #e8edf8 0%, #f5f7ff 35%, #eef4ff 65%, #f0f9ff 100%)" }} />
      <div className="absolute -top-48 -left-24 w-[560px] h-[560px] rounded-full opacity-50" style={{ background: "radial-gradient(circle, #a5b4fc 0%, transparent 70%)", filter: "blur(72px)" }} />
      <div className="absolute top-1/4 -right-32 w-[480px] h-[480px] rounded-full opacity-35" style={{ background: "radial-gradient(circle, #93c5fd 0%, transparent 70%)", filter: "blur(64px)" }} />
      <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, #c4b5fd 0%, transparent 70%)", filter: "blur(72px)" }} />
      <div className="absolute -bottom-20 right-1/4 w-[360px] h-[360px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, #67e8f9 0%, transparent 70%)", filter: "blur(56px)" }} />
    </div>
  );
}

function FloatingNav({ currentView, onNav, currentUser, onLogout }: { currentView: AppView; onNav: (v: AppView) => void; currentUser: AppUser; onLogout: () => void }) {
  const nav = [
    { id: "dashboard" as AppView, label: "Dashboard", Icon: LayoutDashboard },
    { id: "appointments" as AppView, label: "Appointments", Icon: ClipboardList },
    { id: "schedule" as AppView, label: "Schedule", Icon: CalendarDays },
    { id: "history" as AppView, label: "History", Icon: HistoryIcon },
    { id: "settings" as AppView, label: "Settings", Icon: Settings },
  ];
  const isActive = (v: AppView) => ["detail","new-appointment"].includes(currentView) ? v === "appointments" : currentView === v;
  return (
    <aside className="fixed left-4 top-4 bottom-4 z-40 w-56 hidden md:flex flex-col">
      <div className={`${glassDark} rounded-2xl flex flex-col h-full overflow-hidden`}>
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/30">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">Meridian EAS</div>
              <div className="text-[10px] text-slate-400 leading-tight">Executive Appointment System</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => onNav(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${isActive(id) ? "bg-white/[0.14] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]"}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(id) ? "text-blue-400" : "group-hover:scale-110 transition-transform"}`} />
              {label}
              {isActive(id) && <span className="ml-auto w-1 h-4 bg-blue-400 rounded-full opacity-80" />}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/[0.07] space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <Av initials={currentUser.initials} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ currentView, onNav }: { currentView: AppView; onNav: (v: AppView) => void }) {
  const nav = [
    { id: "dashboard" as AppView, label: "Home", Icon: LayoutDashboard },
    { id: "appointments" as AppView, label: "Appts", Icon: ClipboardList },
    { id: "schedule" as AppView, label: "Schedule", Icon: CalendarDays },
    { id: "history" as AppView, label: "History", Icon: HistoryIcon },
    { id: "settings" as AppView, label: "Settings", Icon: Settings },
  ];
  const isActive = (v: AppView) => ["detail","new-appointment"].includes(currentView) ? v === "appointments" : currentView === v;
  return (
    <nav className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
      <div className={`${glassDark} rounded-2xl px-2 py-2 flex items-center justify-around`}>
        {nav.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onNav(id)} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 ${isActive(id) ? "bg-white/[0.14] text-blue-400" : "text-slate-400 hover:text-slate-200"}`}>
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function FloatingHeader({ title, currentUser, onNewAppointment, canCreate }: { title: string; currentUser: AppUser; onNewAppointment: () => void; canCreate: boolean }) {
  return (
    <div className="sticky top-0 z-30 px-4 pt-4 pb-2">
      <div className={`${glassStrong} rounded-2xl px-5 h-14 flex items-center gap-4`}>
        <h2 className="text-base font-semibold text-slate-900 flex-1 tracking-tight">{title}</h2>
        <div className="flex items-center gap-2.5">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search..." className="pl-8 pr-4 py-1.5 text-sm rounded-xl border border-white/60 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-44 placeholder:text-slate-400" />
          </div>
          <Tip label="Notifications">
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-xl transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </button>
          </Tip>
          {canCreate && (
            <button onClick={onNewAppointment} className="flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0 shadow-md shadow-blue-500/20">
              <Plus className="w-4 h-4" /> New Appointment
            </button>
          )}
          <Av initials={currentUser.initials} />
        </div>
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CancelModal({ apt, onConfirm, onClose }: { apt: Appointment; onConfirm: (id: string, reason: string) => void; onClose: () => void }) {
  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");
  const reason = preset === "Other" ? custom : preset;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      <div className={`relative ${glassStrong} rounded-2xl w-full max-w-md`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-100/80 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-200/50"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Cancel Appointment?</h3>
              <p className="text-sm text-slate-500">This appointment will be moved to history.</p>
            </div>
            <button onClick={onClose} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"><X className="w-4 h-4" /></button>
          </div>
          <div className="bg-white/50 rounded-xl p-4 text-sm space-y-2 mb-5 border border-white/60">
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Appointment</span><span className="font-mono text-xs text-slate-700">{apt.id}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Client</span><span className="font-medium text-slate-900">{apt.clientName}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Date</span><span className="text-slate-900">{fmtDateShort(apt.date)}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Time</span><span className="text-slate-900">{fmtTime(apt.startTime)}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Executive</span><span className="text-slate-900">{getExec(apt.executiveId)?.name}</span></div>
          </div>
          <div className="mb-5 space-y-2.5">
            <label className="block text-sm font-medium text-slate-700">Cancellation Reason <span className="text-slate-400 font-normal">(optional)</span></label>
            <select value={preset} onChange={e => setPreset(e.target.value)} className={inpOk}>
              <option value="">Select a reason...</option>
              {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {preset === "Other" && <textarea className={`${inpOk} resize-none h-20`} placeholder="Describe the reason..." value={custom} onChange={e => setCustom(e.target.value)} />}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Keep Appointment</button>
            <button onClick={() => onConfirm(apt.id, reason)} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500/90 hover:bg-red-600 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/25 active:translate-y-0">Cancel Appointment</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompleteModal({ apt, onConfirm, onClose }: { apt: Appointment; onConfirm: (id: string) => void; onClose: () => void }) {
  const endTime = addMin(apt.startTime, apt.duration);
  const canComplete = apt.date <= TODAY && ["confirmed","rescheduled","pending"].includes(apt.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      <div className={`relative ${glassStrong} rounded-2xl w-full max-w-md`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100/80 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-200/50"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Mark as Completed?</h3>
              <p className="text-sm text-slate-500">This appointment will be moved to appointment history.</p>
            </div>
          </div>
          <div className="bg-white/50 rounded-xl p-4 text-sm space-y-2 mb-5 border border-white/60">
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Client</span><span className="font-medium text-slate-900">{apt.clientName}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Date</span><span className="text-slate-900">{fmtDateShort(apt.date)}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Time</span><span className="text-slate-900">{fmtTime(apt.startTime)} – {fmtTime(endTime)}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Executive</span><span className="text-slate-900">{getExec(apt.executiveId)?.name}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Status</span><StatusBadge status={apt.status} /></div>
          </div>
          {!canComplete && (
            <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> Future appointments cannot be marked as completed.
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Cancel</button>
            <button onClick={() => canComplete && onConfirm(apt.id)} disabled={!canComplete}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${canComplete ? "text-white bg-emerald-500/90 hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 active:translate-y-0" : "text-slate-400 bg-white/40 cursor-not-allowed border border-white/50"}`}>
              Mark as Completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ apt, appointments, onConfirm, onClose }: { apt: Appointment; appointments: Appointment[]; onConfirm: (id: string, date: string, time: string, duration: number) => void; onClose: () => void }) {
  const [newDate, setNewDate] = useState(apt.date);
  const [newTime, setNewTime] = useState(apt.startTime);
  const [duration, setDuration] = useState(apt.duration);
  const [checked, setChecked] = useState(false);
  const [conflict, setConflict] = useState<Appointment | null | false>(null);
  const exec = getExec(apt.executiveId);
  const endTime = addMin(newTime, duration);
  const handleCheck = () => { const c = findConflict(appointments, apt.executiveId, newDate, newTime, duration, apt.id); setConflict(c ?? false); setChecked(true); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      <div className={`relative ${glassStrong} rounded-2xl w-full max-w-lg`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100/80 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-200/50"><RefreshCw className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">Reschedule Appointment</h3>
                <p className="text-xs text-slate-500">{apt.id} · {apt.clientName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-all"><X className="w-4 h-4" /></button>
          </div>
          <div className="mb-5 p-3 bg-white/40 rounded-xl text-xs text-slate-600 border border-white/60">
            <span className="font-medium">Current Schedule:</span> {fmtDateShort(apt.date)} at {fmtTime(apt.startTime)} ({apt.duration} min) with {exec?.name}
          </div>
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Date <span className="text-red-500">*</span></label>
              <input type="date" min={TODAY} value={newDate} onChange={e => { setNewDate(e.target.value); setChecked(false); }} className={inpOk} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                <select value={newTime} onChange={e => { setNewTime(e.target.value); setChecked(false); }} className={inpOk}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
                <select value={duration} onChange={e => { setDuration(parseInt(e.target.value)); setChecked(false); }} className={inpOk}>
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            <p className="text-sm text-slate-500">End time: <span className="font-medium text-slate-900">{fmtTime(endTime)}</span></p>
          </div>
          {checked && (
            <div className={`mb-5 p-3 rounded-xl flex items-start gap-2 text-sm border backdrop-blur-sm ${conflict ? "bg-red-50/80 border-red-200/80 text-red-800" : "bg-emerald-50/80 border-emerald-200/80 text-emerald-800"}`}>
              {conflict
                ? <><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><div><strong>Conflict:</strong> {exec?.name} has an appointment with {conflict.clientName} at {fmtTime(conflict.startTime)}</div></>
                : <><CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /><div><strong>Available:</strong> {exec?.name} is free on {fmtDateShort(newDate)} at {fmtTime(newTime)}</div></>
              }
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Keep Current Schedule</button>
            {(!checked || conflict) ? (
              <button onClick={handleCheck} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">
                <Check className="w-4 h-4" /> Check Availability
              </button>
            ) : (
              <button onClick={() => onConfirm(apt.id, newDate, newTime, duration)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">
                <RefreshCw className="w-4 h-4" /> Confirm Reschedule
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginView({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Background />
      <div className={`relative z-10 ${glassStrong} rounded-3xl p-10 w-full max-w-sm`}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30 border border-blue-400/30">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Meridian EAS</h1>
          <p className="text-sm text-slate-500 mt-1">Executive Appointment System</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); setError("Invalid email or password. Use a demo account below."); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="your@email.com" className={inpOk} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <button type="button" className="text-xs text-blue-600 hover:underline">Forgot password?</button>
            </div>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" className={inpOk} />
          </div>
          {error && <div className="p-3 bg-red-50/80 border border-red-200/70 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
          <button type="submit" className="w-full bg-blue-600/90 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0 shadow-lg shadow-blue-500/20">Sign In</button>
        </form>
        <div className="mt-6 pt-5 border-t border-white/50">
          <button onClick={() => setDemoOpen(o => !o)} className="w-full flex items-center justify-between text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <span>Demo accounts</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${demoOpen ? "rotate-90" : ""}`} />
          </button>
          {demoOpen && (
            <div className="mt-3 space-y-1.5">
              {INITIAL_USERS.map(u => (
                <button key={u.id} onClick={() => onLogin(u)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/50 hover:bg-white/80 border border-white/60 transition-all hover:-translate-y-0.5 text-left">
                  <Av initials={u.initials} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{u.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{u.role} · {u.title}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardView({ appointments, activityLog, onViewDetail, onNewAppointment, onNav, currentUser }: {
  appointments: Appointment[]; activityLog: ActivityEntry[];
  onViewDetail: (id: string) => void; onNewAppointment: () => void; onNav: (v: AppView) => void; currentUser: AppUser;
}) {
  const todayApts = appointments.filter(a => a.date === TODAY && a.status !== "cancelled");
  const recentActivity = [...activityLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
  const todayDisplay = new Date(TODAY + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const kpis = [
    { label: "Total",     value: appointments.length,                                                                                Icon: BarChart3,   cls: "text-slate-700",   bg: "bg-slate-100/80 border-slate-200/60" },
    { label: "Today",     value: todayApts.length,                                                                                  Icon: CalendarDays, cls: "text-blue-700",   bg: "bg-blue-100/80 border-blue-200/60" },
    { label: "Pending",   value: appointments.filter(a => a.status === "pending").length,                                           Icon: AlertCircle,  cls: "text-amber-700",  bg: "bg-amber-100/80 border-amber-200/60" },
    { label: "Upcoming",  value: appointments.filter(a => a.date > TODAY && !["cancelled","completed"].includes(a.status)).length,  Icon: TrendingUp,   cls: "text-indigo-700", bg: "bg-indigo-100/80 border-indigo-200/60" },
    { label: "Completed", value: appointments.filter(a => a.status === "completed").length,                                        Icon: CheckCheck,   cls: "text-emerald-700",bg: "bg-emerald-100/80 border-emerald-200/60" },
    { label: "Cancelled", value: appointments.filter(a => a.status === "cancelled").length,                                        Icon: Ban,          cls: "text-red-700",    bg: "bg-red-100/80 border-red-200/60" },
  ];

  const upcoming = appointments.filter(a => a.date >= TODAY && !["cancelled","completed"].includes(a.status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Good morning, {currentUser.name.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{todayDisplay}</p>
        </div>
        {currentUser.role === "assistant" && (
          <button onClick={onNewAppointment} className="flex items-center gap-2 bg-blue-600/90 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0 shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`${glass} rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border mb-3 ${k.bg}`}>
              <k.Icon className={`w-4 h-4 ${k.cls}`} />
            </div>
            <div className={`text-2xl font-semibold tracking-tight ${k.cls}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Today's Schedule</h3>
            <span className="text-xs text-slate-400 bg-white/50 px-2 py-0.5 rounded-full border border-white/60">{todayApts.length} appt{todayApts.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-white/40">
            {todayApts.length === 0 ? (
              <div className="px-5 py-12 text-center"><CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No appointments scheduled for today.</p></div>
            ) : (
              [...todayApts].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(apt => (
                <div key={apt.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/30 transition-all">
                  <div className="text-right w-20 flex-shrink-0">
                    <div className="text-sm font-medium text-slate-900">{fmtTime(apt.startTime)}</div>
                    <div className="text-xs text-slate-400">{apt.duration}min</div>
                  </div>
                  <div className="w-px h-10 bg-white/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{apt.clientName}</div>
                    <div className="text-xs text-slate-500 truncate">{apt.purpose}</div>
                  </div>
                  <div className="hidden md:block text-xs text-slate-400 truncate max-w-[110px]">{getExec(apt.executiveId)?.name}</div>
                  <StatusBadge status={apt.status} />
                  <Tip label="View"><button onClick={() => onViewDetail(apt.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all"><Eye className="w-4 h-4" /></button></Tip>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/50"><h3 className="font-semibold text-slate-900">Status Summary</h3></div>
          <div className="p-5 space-y-4">
            {(["confirmed","pending","rescheduled","completed","cancelled"] as Status[]).map(s => {
              const count = appointments.filter(a => a.status === s).length;
              const pct = appointments.length > 0 ? (count / appointments.length) * 100 : 0;
              const bar = { confirmed:"bg-emerald-500", pending:"bg-amber-400", rescheduled:"bg-blue-500", completed:"bg-slate-400", cancelled:"bg-red-400" }[s];
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">{STATUS_CFG[s].label}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden border border-white/40">
                    <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${glass} rounded-2xl overflow-hidden`}>
        <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Upcoming Appointments</h3>
          <button onClick={() => onNav("appointments")} className="text-sm text-blue-600 hover:underline transition-colors">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 bg-white/25">
                {["Client / Visitor","Organization","Purpose","Executive","Date","Time","Status",""].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${["Organization","Executive"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {upcoming.map(apt => (
                <tr key={apt.id} className="hover:bg-white/30 transition-all">
                  <td className="px-4 py-3.5 font-medium text-slate-900">{apt.clientName}</td>
                  <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{apt.clientOrg}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate">{apt.purpose}</td>
                  <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{getExec(apt.executiveId)?.name}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(apt.date)}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtTime(apt.startTime)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={apt.status} /></td>
                  <td className="px-4 py-3.5"><Tip label="View"><button onClick={() => onViewDetail(apt.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all"><Eye className="w-3.5 h-3.5" /></button></Tip></td>
                </tr>
              ))}
              {upcoming.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-sm">No upcoming appointments.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${glass} rounded-2xl overflow-hidden`}>
        <div className="px-5 py-4 border-b border-white/50"><h3 className="font-semibold text-slate-900">Recent Activity</h3></div>
        <div className="divide-y divide-white/40">
          {recentActivity.map(entry => {
            const cfg = ACTIVITY_CFG[entry.action];
            const apt = appointments.find(a => a.id === entry.aptId);
            return (
              <div key={entry.id} className="px-5 py-4 flex items-start gap-4 hover:bg-white/25 transition-all">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.cls}`}>
                  <cfg.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{cfg.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{entry.clientName}{apt ? ` — ${apt.purpose}` : ""}{entry.note ? <span className="text-slate-400 ml-1">({entry.note})</span> : null}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-400">{entry.user}</div>
                  <div className="text-xs text-slate-400">{fmtTs(entry.timestamp)}</div>
                </div>
                {apt && <Tip label="View"><button onClick={() => onViewDetail(apt.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all flex-shrink-0"><Eye className="w-3.5 h-3.5" /></button></Tip>}
              </div>
            );
          })}
          {recentActivity.length === 0 && <div className="px-5 py-10 text-center text-slate-400 text-sm">No recent activity.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Appointments List ────────────────────────────────────────────────────────

function AppointmentsView({ appointments, onViewDetail, onEdit, onNewAppointment, onCancel, onComplete, onReschedule, currentUser }: {
  appointments: Appointment[]; onViewDetail: (id: string) => void; onEdit: (id: string) => void;
  onNewAppointment: () => void; onCancel: (id: string) => void; onComplete: (id: string) => void; onReschedule: (id: string) => void; currentUser: AppUser;
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const tabs = [
    { id: "all",         label: "All",         count: () => appointments.length },
    { id: "today",       label: "Today",        count: () => appointments.filter(a => a.date === TODAY).length },
    { id: "upcoming",    label: "Upcoming",     count: () => appointments.filter(a => a.date > TODAY && !["cancelled","completed"].includes(a.status)).length },
    { id: "pending",     label: "Pending",      count: () => appointments.filter(a => a.status === "pending").length },
    { id: "confirmed",   label: "Confirmed",    count: () => appointments.filter(a => a.status === "confirmed").length },
    { id: "rescheduled", label: "Rescheduled",  count: () => appointments.filter(a => a.status === "rescheduled").length },
    { id: "completed",   label: "Completed",    count: () => appointments.filter(a => a.status === "completed").length },
    { id: "cancelled",   label: "Cancelled",    count: () => appointments.filter(a => a.status === "cancelled").length },
  ];
  const filtered = useMemo(() => {
    let r = [...appointments];
    if (tab === "today") r = r.filter(a => a.date === TODAY);
    else if (tab === "upcoming") r = r.filter(a => a.date > TODAY && !["cancelled","completed"].includes(a.status));
    else if (["pending","confirmed","rescheduled","completed","cancelled"].includes(tab)) r = r.filter(a => a.status === tab);
    if (search) { const q = search.toLowerCase(); r = r.filter(a => a.clientName.toLowerCase().includes(q) || a.clientOrg.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)); }
    return r.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [appointments, tab, search]);
  const isAssistant = currentUser.role === "assistant";
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Appointments</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search appointments..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-white/60 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-56 placeholder:text-slate-400" />
          </div>
          {isAssistant && (
            <button onClick={onNewAppointment} className="flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0 shadow-md shadow-blue-500/15">
              <Plus className="w-4 h-4" /> New Appointment
            </button>
          )}
        </div>
      </div>
      <div className={`${glass} rounded-2xl px-4 pt-1 flex gap-0.5 overflow-x-auto`}>
        {tabs.map(t => {
          const count = t.count();
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${tab === t.id ? "border-blue-500 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}{count > 0 && <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${tab === t.id ? "bg-blue-100/80 text-blue-700" : "bg-white/60 text-slate-500"}`}>{count}</span>}
            </button>
          );
        })}
      </div>
      <div className={`${glass} rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 bg-white/25">
                {["ID","Client / Visitor","Organization","Purpose","Executive","Date","Time","Dur.","Status","Actions"].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${["Organization","Executive","Dur."].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filtered.map(apt => {
                const isActive = !["completed","cancelled"].includes(apt.status);
                return (
                  <tr key={apt.id} className="hover:bg-white/30 transition-all">
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{apt.id}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{apt.clientName}</td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{apt.clientOrg}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-[130px] truncate">{apt.purpose}</td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{getExec(apt.executiveId)?.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(apt.date)}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtTime(apt.startTime)}</td>
                    <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{apt.duration}m</td>
                    <td className="px-4 py-3.5"><StatusBadge status={apt.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-0.5">
                        <Tip label="View"><button onClick={() => onViewDetail(apt.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all"><Eye className="w-3.5 h-3.5" /></button></Tip>
                        {isAssistant && isActive && <>
                          <Tip label="Edit"><button onClick={() => onEdit(apt.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button></Tip>
                          <Tip label="Reschedule"><button onClick={() => onReschedule(apt.id)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50/60 rounded-lg transition-all"><RefreshCw className="w-3.5 h-3.5" /></button></Tip>
                          <Tip label="Complete"><button onClick={() => onComplete(apt.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-lg transition-all"><CheckCircle2 className="w-3.5 h-3.5" /></button></Tip>
                          <Tip label="Cancel"><button onClick={() => onCancel(apt.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/60 rounded-lg transition-all"><XCircle className="w-3.5 h-3.5" /></button></Tip>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-5 py-12 text-center"><ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-slate-400 text-sm">No appointments found.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── New Appointment (7-step) ─────────────────────────────────────────────────

interface BookForm {
  clientName: string; clientOrg: string; clientEmail: string; clientPhone: string;
  purpose: string; notes: string; executiveId: string; date: string; startTime: string; duration: string;
}

const STEP_META: { id: BookStep; label: string }[] = [
  { id: "client", label: "Client Info" }, { id: "meeting", label: "Meeting" }, { id: "executive", label: "Executive" },
  { id: "datetime", label: "Date & Time" }, { id: "availability", label: "Availability" }, { id: "review", label: "Review" }, { id: "confirmed", label: "Done" },
];
const FORM_STEPS: BookStep[] = ["client","meeting","executive","datetime","availability","review"];

function NewAppointmentView({ appointments, onSave, onBack, onViewDetail, onNavDashboard, currentUser, editData, preFill }: {
  appointments: Appointment[]; onSave: (apt: Appointment) => void;
  onBack: () => void; onViewDetail: (id: string) => void; onNavDashboard: () => void;
  currentUser: AppUser; editData?: Appointment; preFill?: { date?: string; startTime?: string };
}) {
  const isEdit = !!editData;
  const [step, setStep] = useState<BookStep>("client");
  const [form, setForm] = useState<BookForm>({
    clientName: editData?.clientName ?? "", clientOrg: editData?.clientOrg ?? "",
    clientEmail: editData?.clientEmail ?? "", clientPhone: editData?.clientPhone ?? "",
    purpose: editData?.purpose ?? "", notes: editData?.notes ?? "",
    executiveId: editData?.executiveId ?? "", date: editData?.date ?? preFill?.date ?? "",
    startTime: editData?.startTime ?? preFill?.startTime ?? "", duration: String(editData?.duration ?? 60),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookForm, string>>>({});
  const [avConflict, setAvConflict] = useState<Appointment | null | undefined>(undefined);
  const [savedApt, setSavedApt] = useState<Appointment | null>(null);

  const dur = parseInt(form.duration || "60");
  const endTime = form.startTime ? addMin(form.startTime, dur) : "";
  const selectedExec = EXECUTIVES.find(e => e.id === form.executiveId);
  const stepIdx = FORM_STEPS.indexOf(step);
  const def = (k: keyof BookForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = (fields: (keyof BookForm)[]): boolean => {
    const e: Partial<Record<keyof BookForm, string>> = {};
    if (fields.includes("clientName") && !form.clientName.trim()) e.clientName = "Client name is required";
    if (fields.includes("clientOrg") && !form.clientOrg.trim()) e.clientOrg = "Organization is required";
    if (fields.includes("clientEmail")) { if (!form.clientEmail.trim()) e.clientEmail = "Email is required"; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) e.clientEmail = "Invalid email address"; }
    if (fields.includes("clientPhone") && !form.clientPhone.trim()) e.clientPhone = "Phone number is required";
    if (fields.includes("purpose") && !form.purpose.trim()) e.purpose = "Meeting purpose is required";
    if (fields.includes("executiveId") && !form.executiveId) e.executiveId = "Please select an executive";
    if (fields.includes("date")) { if (!form.date) e.date = "Appointment date is required"; else if (form.date < TODAY) e.date = "Appointment date cannot be in the past"; }
    if (fields.includes("startTime") && !form.startTime) e.startTime = "Start time is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const NEXT: Record<string, { fields: (keyof BookForm)[]; next: BookStep }> = {
    client:    { fields: ["clientName","clientOrg","clientEmail","clientPhone"], next: "meeting" },
    meeting:   { fields: ["purpose"], next: "executive" },
    executive: { fields: ["executiveId"], next: "datetime" },
    datetime:  { fields: ["date","startTime"], next: "availability" },
  };

  const goNext = () => {
    const cfg = NEXT[step];
    if (!cfg || !validate(cfg.fields)) return;
    if (cfg.next === "availability") { const c = findConflict(appointments, form.executiveId, form.date, form.startTime, dur, editData?.id); setAvConflict(c ?? false); }
    setStep(cfg.next);
  };

  const handleSlotClick = (time: string) => {
    const c = findConflict(appointments, form.executiveId, form.date, time, dur, editData?.id);
    if (!c) { setForm(f => ({ ...f, startTime: time })); setAvConflict(false); }
  };

  const handleConfirm = () => {
    const fc = findConflict(appointments, form.executiveId, form.date, form.startTime, dur, editData?.id);
    if (fc) { setAvConflict(fc); setStep("availability"); return; }
    const now = new Date().toISOString();
    const apt: Appointment = {
      id: editData?.id ?? genId(), clientName: form.clientName, clientOrg: form.clientOrg,
      clientEmail: form.clientEmail, clientPhone: form.clientPhone, purpose: form.purpose, notes: form.notes,
      executiveId: form.executiveId, date: form.date, startTime: form.startTime, duration: dur,
      status: editData?.status ?? "confirmed", createdAt: editData?.createdAt ?? now, updatedAt: now,
      createdBy: editData?.createdBy ?? currentUser.name, updatedBy: currentUser.name,
    };
    onSave(apt);
    setSavedApt(apt);
    setStep("confirmed");
  };

  const F = ({ label, err, req = true, children }: { label: string; err?: string; req?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );

  const Card = ({ title, Icon, children }: { title: string; Icon: React.FC<{ className?: string }>; children: React.ReactNode }) => (
    <div className={`${glass} rounded-2xl overflow-hidden`}>
      <div className="px-6 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><Icon className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">{title}</h3></div>
      <div className="p-6">{children}</div>
    </div>
  );

  if (step === "confirmed" && savedApt) return (
    <div className="p-4 md:p-6 flex flex-col items-center text-center max-w-lg mx-auto py-12">
      <div className="w-16 h-16 bg-emerald-100/80 rounded-full flex items-center justify-center mb-4 border border-emerald-200/60 shadow-lg shadow-emerald-200/40">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{isEdit ? "Appointment Updated!" : "Appointment Confirmed!"}</h2>
      <p className="text-sm text-slate-500 mb-8">{isEdit ? "The appointment has been successfully updated." : "The appointment has been successfully created."}</p>
      <div className={`${glass} rounded-2xl p-6 w-full text-left space-y-3 mb-8`}>
        <div className="flex items-center justify-between text-xs mb-2"><span className="font-mono text-slate-400">{savedApt.id}</span><StatusBadge status={savedApt.status} /></div>
        {[["Client", savedApt.clientName],["Organization", savedApt.clientOrg],["Executive", getExec(savedApt.executiveId)?.name],["Date", fmtDateShort(savedApt.date)],["Time", `${fmtTime(savedApt.startTime)} – ${fmtTime(addMin(savedApt.startTime, savedApt.duration))}`],["Duration", `${savedApt.duration} minutes`]].map(([l, v]) => (
          <div key={l} className="flex gap-3 text-sm"><span className="text-slate-500 w-24 flex-shrink-0">{l}</span><span className="font-medium text-slate-900">{v}</span></div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onNavDashboard} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Back to Dashboard</button>
        <button onClick={() => onViewDetail(savedApt.id)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">
          <Eye className="w-4 h-4" /> View Appointment
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 text-slate-500 hover:text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all backdrop-blur-sm"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{isEdit ? "Edit Appointment" : "New Appointment"}</h1>
          <p className="text-sm text-slate-500">{STEP_META.find(s => s.id === step)?.label} · Step {stepIdx + 1} of {FORM_STEPS.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
        {STEP_META.filter(s => s.id !== "confirmed").map((s, i) => {
          const done = i < stepIdx; const active = i === stepIdx;
          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${done ? "bg-emerald-500/90 text-white border-emerald-400/50" : active ? "bg-blue-600/90 text-white border-blue-400/50" : "bg-white/60 text-slate-400 border-white/60"}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${active ? "text-slate-900" : done ? "text-emerald-700" : "text-slate-400"}`}>{s.label}</span>
              {i < STEP_META.length - 2 && <div className="w-5 h-px bg-white/60 mx-0.5" />}
            </div>
          );
        })}
      </div>

      {step === "client" && (
        <div className="space-y-5">
          <Card title="Client / Visitor Information" Icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <F label="Full Name" err={errors.clientName}><input className={errors.clientName ? inpErr : inpOk} placeholder="Client full name" value={form.clientName} onChange={e => { def("clientName", e.target.value); setErrors(p => ({ ...p, clientName: undefined })); }} /></F>
              <F label="Organization" err={errors.clientOrg}><input className={errors.clientOrg ? inpErr : inpOk} placeholder="Company or institution" value={form.clientOrg} onChange={e => { def("clientOrg", e.target.value); setErrors(p => ({ ...p, clientOrg: undefined })); }} /></F>
              <F label="Email Address" err={errors.clientEmail}><input type="email" className={errors.clientEmail ? inpErr : inpOk} placeholder="email@example.com" value={form.clientEmail} onChange={e => { def("clientEmail", e.target.value); setErrors(p => ({ ...p, clientEmail: undefined })); }} /></F>
              <F label="Phone Number" err={errors.clientPhone}><input type="tel" className={errors.clientPhone ? inpErr : inpOk} placeholder="+1 (555) 000-0000" value={form.clientPhone} onChange={e => { def("clientPhone", e.target.value); setErrors(p => ({ ...p, clientPhone: undefined })); }} /></F>
            </div>
          </Card>
          <div className="flex justify-end gap-3">
            <button onClick={onBack} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Cancel</button>
            <button onClick={goNext} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">Continue <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === "meeting" && (
        <div className="space-y-5">
          <Card title="Meeting Details" Icon={FileText}>
            <div className="space-y-5">
              <F label="Meeting Purpose" err={errors.purpose}><input className={errors.purpose ? inpErr : inpOk} placeholder="e.g. Q3 Financial Review, Partnership Discussion" value={form.purpose} onChange={e => { def("purpose", e.target.value); setErrors(p => ({ ...p, purpose: undefined })); }} /></F>
              <F label="Notes & Instructions" req={false}><textarea className={`${inpOk} resize-none h-28`} placeholder="Additional context or special instructions..." value={form.notes} onChange={e => def("notes", e.target.value)} /></F>
            </div>
          </Card>
          <div className="flex justify-between gap-3">
            <button onClick={() => setStep("client")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={goNext} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">Continue <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === "executive" && (
        <div className="space-y-5">
          <Card title="Select Executive" Icon={BriefcaseIcon}>
            <div className="space-y-3">
              {errors.executiveId && <p className="text-xs text-red-600 mb-2">{errors.executiveId}</p>}
              {EXECUTIVES.map(exec => (
                <button key={exec.id} onClick={() => { def("executiveId", exec.id); setErrors(p => ({ ...p, executiveId: undefined })); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left hover:-translate-y-0.5 ${form.executiveId === exec.id ? "bg-blue-50/80 border-blue-300/70 shadow-md shadow-blue-100" : "bg-white/50 border-white/60 hover:bg-white/70 hover:shadow-md"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0 border ${form.executiveId === exec.id ? "bg-blue-600 text-white border-blue-500" : "bg-blue-100/80 text-blue-700 border-blue-200/60"}`}>{exec.initials}</div>
                  <div className="flex-1"><div className={`font-medium text-sm ${form.executiveId === exec.id ? "text-blue-900" : "text-slate-900"}`}>{exec.name}</div><div className={`text-xs ${form.executiveId === exec.id ? "text-blue-600" : "text-slate-500"}`}>{exec.title}</div></div>
                  {form.executiveId === exec.id && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </Card>
          <div className="flex justify-between gap-3">
            <button onClick={() => setStep("meeting")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={goNext} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">Continue <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === "datetime" && (
        <div className="space-y-5">
          <Card title="Date & Time" Icon={CalendarDays}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <F label="Appointment Date" err={errors.date}><input type="date" min={TODAY} className={errors.date ? inpErr : inpOk} value={form.date} onChange={e => { def("date", e.target.value); setErrors(p => ({ ...p, date: undefined })); }} /></F>
              <F label="Duration"><select className={inpOk} value={form.duration} onChange={e => def("duration", e.target.value)}>{DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}</select></F>
              <F label="Start Time" err={errors.startTime}><select className={errors.startTime ? inpErr : inpOk} value={form.startTime} onChange={e => { def("startTime", e.target.value); setErrors(p => ({ ...p, startTime: undefined })); }}><option value="">Select start time...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}</select></F>
              <F label="End Time (calculated)" req={false}><div className={`${inpOk} text-slate-600 pointer-events-none`}>{form.startTime ? fmtTime(addMin(form.startTime, dur)) : "—"}</div></F>
            </div>
          </Card>
          <div className="flex justify-between gap-3">
            <button onClick={() => setStep("executive")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={goNext} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0">Check Availability <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {step === "availability" && (
        <div className="space-y-5">
          <Card title="Availability Check" Icon={Zap}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Executive", selectedExec?.name],["Date", form.date ? fmtDateShort(form.date) : "—"],["Start Time", form.startTime ? fmtTime(form.startTime) : "—"],["End Time", endTime ? fmtTime(endTime) : "—"],["Duration", `${form.duration} minutes`],["Client", form.clientName]].map(([l, v]) => (
                  <div key={l} className="bg-white/40 rounded-xl p-3 border border-white/60"><div className="text-xs text-slate-500 mb-0.5">{l}</div><div className="font-medium text-slate-900 text-xs">{v}</div></div>
                ))}
              </div>
              {avConflict !== undefined && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${avConflict === false ? "bg-emerald-50/80 border-emerald-200/70" : "bg-red-50/80 border-red-200/70"}`}>
                  {avConflict === false
                    ? <><CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" /><div><p className="font-semibold text-emerald-800 text-sm">Available</p><p className="text-emerald-700 text-xs mt-0.5">{selectedExec?.name} is available on {fmtDateShort(form.date)} at {fmtTime(form.startTime)}.</p></div></>
                    : <><AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /><div><p className="font-semibold text-red-800 text-sm">Schedule Conflict Detected</p><p className="text-red-700 text-xs mt-0.5">{selectedExec?.name} already has: {avConflict.clientName} — {avConflict.purpose} at {fmtTime(avConflict.startTime)} ({avConflict.duration} min). Please choose another time.</p></div></>
                  }
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Time Slots — {form.date ? fmtDateShort(form.date) : "Select date first"}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_OPTIONS.map(t => {
                    const c = form.executiveId && form.date ? findConflict(appointments, form.executiveId, form.date, t, dur, editData?.id) : null;
                    const isSel = t === form.startTime;
                    return (
                      <button key={t} onClick={() => handleSlotClick(t)} disabled={!!c} title={c ? `Occupied: ${c.clientName}` : undefined}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-1 ${isSel ? "bg-blue-600 text-white border-blue-500 shadow-md" : c ? "bg-red-50/70 text-red-400 border-red-200/60 cursor-not-allowed opacity-70" : "bg-white/60 text-slate-700 border-white/60 hover:bg-white/80 hover:border-blue-300/60 hover:-translate-y-0.5"}`}>
                        {c ? <XCircle className="w-3 h-3" /> : isSel ? <Check className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {fmtTime(t).replace(" AM","").replace(" PM","")}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">Click an available slot to select it. Red slots have existing appointments.</p>
              </div>
            </div>
          </Card>
          <div className="flex justify-between gap-3">
            <button onClick={() => setStep("datetime")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={() => avConflict === false && setStep("review")} disabled={avConflict !== false}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${avConflict === false ? "bg-blue-600/90 hover:bg-blue-700 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0" : "bg-white/40 text-slate-400 cursor-not-allowed border border-white/50"}`}>
              Continue to Review <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-6 py-4 border-b border-white/40 bg-white/20"><h3 className="font-semibold text-slate-900">Review Appointment</h3><p className="text-sm text-slate-500 mt-0.5">Confirm all details before saving.</p></div>
            <div className="p-6 space-y-5">
              <div className="pb-5 border-b border-white/40">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Client</div>
                <div className="font-semibold text-slate-900 text-base">{form.clientName}</div>
                <div className="text-slate-600">{form.clientOrg}</div>
                <div className="text-slate-500 text-xs mt-1 flex items-center gap-3"><span className="flex items-center gap-1"><Mail className="w-3 h-3" />{form.clientEmail}</span><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{form.clientPhone}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Meeting Purpose</div><div className="font-medium text-slate-900">{form.purpose}</div></div>
                <div><div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Executive</div><div className="font-medium text-slate-900">{selectedExec?.name}</div><div className="text-xs text-slate-500">{selectedExec?.title}</div></div>
                <div><div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Date</div><div className="font-medium text-slate-900">{fmtDate(form.date)}</div></div>
                <div><div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Time</div><div className="font-medium text-slate-900">{fmtTime(form.startTime)} – {fmtTime(endTime)} ({form.duration} min)</div></div>
                {form.notes && <div className="md:col-span-2"><div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</div><div className="text-slate-700 text-sm">{form.notes}</div></div>}
              </div>
              <div className="pt-3 border-t border-white/40 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {selectedExec?.name} is available at this time. Ready to confirm.
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button onClick={() => setStep("availability")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep("client")} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            </div>
            <button onClick={handleConfirm} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-blue-600/90 hover:bg-blue-700 text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0 shadow-md shadow-blue-500/15">
              <Check className="w-4 h-4" /> {isEdit ? "Update Appointment" : "Confirm Appointment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appointment Detail ───────────────────────────────────────────────────────

function AppointmentDetailView({ apt, activityLog, onBack, onEdit, onCancel, onComplete, onReschedule, currentUser }: {
  apt: Appointment; activityLog: ActivityEntry[]; onBack: () => void; onEdit: (id: string) => void;
  onCancel: (id: string) => void; onComplete: (id: string) => void; onReschedule: (id: string) => void; currentUser: AppUser;
}) {
  const exec = getExec(apt.executiveId);
  const isActive = !["completed","cancelled"].includes(apt.status);
  const isAssistant = currentUser.role === "assistant";
  const endTime = addMin(apt.startTime, apt.duration);
  const timeline = activityLog.filter(a => a.aptId === apt.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="py-3 border-b border-white/40 last:border-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-500 hover:text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all backdrop-blur-sm"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-xl font-semibold text-slate-900 tracking-tight">{apt.purpose}</h1><StatusBadge status={apt.status} /></div>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{apt.id}</p>
          </div>
        </div>
        {isAssistant && isActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tip label="Edit"><button onClick={() => onEdit(apt.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all hover:-translate-y-0.5"><Pencil className="w-3.5 h-3.5" /> Edit</button></Tip>
            <Tip label="Reschedule"><button onClick={() => onReschedule(apt.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/60 rounded-xl transition-all hover:-translate-y-0.5"><RefreshCw className="w-3.5 h-3.5" /> Reschedule</button></Tip>
            <Tip label="Mark as Completed"><button onClick={() => onComplete(apt.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-xl transition-all hover:-translate-y-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</button></Tip>
            <Tip label="Cancel Appointment"><button onClick={() => onCancel(apt.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50/70 hover:bg-red-100/80 border border-red-200/60 rounded-xl transition-all hover:-translate-y-0.5"><XCircle className="w-3.5 h-3.5" /> Cancel</button></Tip>
          </div>
        )}
      </div>

      {apt.status === "rescheduled" && apt.previousDate && (
        <div className="mb-5 p-4 bg-blue-50/80 border border-blue-200/70 rounded-2xl text-sm text-blue-800 flex items-start gap-2">
          <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" /> Originally scheduled for <strong>{fmtDateShort(apt.previousDate)}</strong>{apt.previousStartTime ? <> at <strong>{fmtTime(apt.previousStartTime)}</strong></> : null}. Rescheduled to current time.
        </div>
      )}
      {apt.status === "cancelled" && apt.cancellationReason && (
        <div className="mb-5 p-4 bg-red-50/80 border border-red-200/70 rounded-2xl text-sm text-red-800 flex items-start gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <div><strong>Cancellation Reason:</strong> {apt.cancellationReason}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><User className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Client / Visitor</h3></div>
            <dl className="px-5">
              <Row label="Name"><span className="font-medium">{apt.clientName}</span></Row>
              <Row label="Organization">{apt.clientOrg}</Row>
              <Row label="Email"><a href={`mailto:${apt.clientEmail}`} className="text-blue-600 hover:underline flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{apt.clientEmail}</a></Row>
              <Row label="Phone"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{apt.clientPhone}</span></Row>
            </dl>
          </div>
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><FileText className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Meeting Details</h3></div>
            <dl className="px-5">
              <Row label="Purpose"><span className="font-medium">{apt.purpose}</span></Row>
              {apt.notes && <Row label="Notes">{apt.notes}</Row>}
            </dl>
          </div>
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><Activity className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Activity Timeline</h3></div>
            <div className="px-5 py-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No activity recorded.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-white/60" />
                  {timeline.map((entry, i) => {
                    const cfg = ACTIVITY_CFG[entry.action];
                    return (
                      <div key={entry.id} className={`relative flex items-start gap-4 ${i > 0 ? "mt-4" : ""}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border z-10 ${cfg.cls}`}><cfg.Icon className="w-3.5 h-3.5" /></div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="text-sm font-medium text-slate-900">{cfg.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{entry.user} · {fmtTs(entry.timestamp)}</div>
                          {entry.note && <div className="text-xs text-slate-400 mt-0.5 italic">{entry.note}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><CalendarDays className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Schedule</h3></div>
            <dl className="px-5">
              <Row label="Executive"><div><div className="font-medium">{exec?.name}</div><div className="text-xs text-slate-500">{exec?.title}</div></div></Row>
              <Row label="Date">{fmtDate(apt.date)}</Row>
              <Row label="Start Time">{fmtTime(apt.startTime)}</Row>
              <Row label="End Time">{fmtTime(endTime)}</Row>
              <Row label="Duration">{apt.duration} minutes</Row>
            </dl>
          </div>
          <div className={`${glass} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><FileText className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Record</h3></div>
            <dl className="px-5">
              <Row label="Status"><StatusBadge status={apt.status} /></Row>
              <Row label="Created By">{apt.createdBy}</Row>
              <Row label="Created">{new Date(apt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Row>
              <Row label="Updated By">{apt.updatedBy}</Row>
              <Row label="Last Updated">{new Date(apt.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Row>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function ScheduleView({ appointments, onViewDetail, onNewAptFromSlot }: { appointments: Appointment[]; onViewDetail: (id: string) => void; onNewAptFromSlot: (date: string, startTime: string) => void }) {
  const [calView, setCalView] = useState<"day"|"week">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date(TODAY + "T00:00:00"));
  const HOUR_H = 64, START_H = 8, END_H = 18;
  const HOURS = Array.from({ length: END_H - START_H }, (_, i) => i + START_H);
  const weekStart = useMemo(() => { const d = new Date(currentDate); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d; }, [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }), [weekStart]);
  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const displayDays = calView === "week" ? weekDays : [currentDate];
  const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const aptTop = (t: string) => { const [h, m] = t.split(":").map(Number); return ((h - START_H) * 60 + m) / 60 * HOUR_H; };
  const aptH = (dur: number) => Math.max(dur / 60 * HOUR_H, 24);
  const navPrev = () => { const d = new Date(currentDate); d.setDate(d.getDate() - (calView === "day" ? 1 : 7)); setCurrentDate(d); };
  const navNext = () => { const d = new Date(currentDate); d.setDate(d.getDate() + (calView === "day" ? 1 : 7)); setCurrentDate(d); };
  const statusBar: Record<Status, string> = { pending:"border-l-amber-400 bg-amber-50/80 text-amber-900", confirmed:"border-l-emerald-500 bg-emerald-50/80 text-emerald-900", rescheduled:"border-l-blue-500 bg-blue-50/80 text-blue-900", completed:"border-l-slate-400 bg-slate-100/80 text-slate-700", cancelled:"border-l-red-400 bg-red-50/80 text-red-800" };
  const cols = calView === "week" ? "60px repeat(7, 1fr)" : "60px 1fr";
  const headerRange = calView === "week"
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="p-4 md:p-6 flex flex-col gap-4" style={{ minHeight: "calc(100vh - 100px)" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div><h1 className="text-xl font-semibold text-slate-900 tracking-tight">Schedule</h1><p className="text-sm text-slate-500 mt-0.5">{headerRange}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(TODAY + "T00:00:00"))} className="px-3 py-1.5 text-sm font-medium bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all hover:-translate-y-0.5">Today</button>
          <button onClick={navPrev} className="p-2 text-slate-500 hover:bg-white/60 rounded-xl transition-all hover:-translate-y-0.5"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={navNext} className="p-2 text-slate-500 hover:bg-white/60 rounded-xl transition-all hover:-translate-y-0.5"><ChevronRight className="w-4 h-4" /></button>
          <div className={`flex ${glass} rounded-xl overflow-hidden ml-1`}>
            {(["day","week"] as const).map(v => <button key={v} onClick={() => setCalView(v)} className={`px-4 py-1.5 text-sm font-medium transition-all capitalize ${calView === v ? "bg-blue-600/90 text-white" : "text-slate-600 hover:bg-white/60"}`}>{v}</button>)}
          </div>
        </div>
      </div>
      <div className={`flex-1 ${glass} rounded-2xl overflow-auto`} style={{ maxHeight: "calc(100vh - 220px)" }}>
        <div style={{ minWidth: calView === "week" ? 700 : 400 }}>
          <div className="sticky top-0 bg-white/70 backdrop-blur-md z-10 border-b border-white/50" style={{ display: "grid", gridTemplateColumns: cols }}>
            <div className="border-r border-white/40" />
            {displayDays.map((d, i) => {
              const ds = toDateStr(d); const isToday = ds === TODAY;
              return (
                <div key={i} className={`px-2 py-3 text-center border-r border-white/40 last:border-r-0 ${isToday ? "bg-blue-50/60" : ""}`}>
                  <div className="text-xs text-slate-500">{calView === "week" ? dayNames[i] : d.toLocaleDateString("en-US", { weekday: "long" })}</div>
                  <div className={`text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto ${isToday ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "text-slate-900"}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: cols, height: `${HOUR_H * HOURS.length}px` }}>
            <div className="border-r border-white/40">
              {HOURS.map(h => (
                <div key={h} style={{ height: `${HOUR_H}px` }} className="border-b border-white/30 last:border-0 relative">
                  <span className="absolute -top-2.5 left-0 right-0 text-[10px] text-slate-400 px-2 text-right">{h === 12 ? "12 PM" : h > 12 ? `${h-12} PM` : `${h} AM`}</span>
                </div>
              ))}
            </div>
            {displayDays.map((d, di) => {
              const ds = toDateStr(d); const isToday = ds === TODAY;
              const dayApts = appointments.filter(a => a.date === ds && a.status !== "cancelled");
              return (
                <div key={di} className={`relative border-r border-white/40 last:border-r-0 ${isToday ? "bg-blue-50/20" : ""}`}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: `${HOUR_H}px` }}
                      className="border-b border-white/30 last:border-0 cursor-pointer hover:bg-blue-100/20 transition-colors"
                      onClick={() => onNewAptFromSlot(ds, `${h.toString().padStart(2,"0")}:00`)} />
                  ))}
                  {dayApts.map(apt => {
                    const s = toMin(apt.startTime);
                    if (s < START_H * 60 || s >= END_H * 60) return null;
                    const h = aptH(apt.duration);
                    const et = addMin(apt.startTime, apt.duration);
                    return (
                      <button key={apt.id} onClick={e => { e.stopPropagation(); onViewDetail(apt.id); }}
                        className={`absolute left-0.5 right-0.5 rounded-lg border-l-2 overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs backdrop-blur-sm z-10 ${statusBar[apt.status]}`}
                        style={{ top: `${aptTop(apt.startTime)}px`, height: `${h}px` }}>
                        <div className="px-1.5 py-1">
                          <div className="font-semibold truncate leading-tight">{apt.clientName}</div>
                          {h > 36 && <div className="truncate opacity-80 leading-tight">{apt.purpose}</div>}
                          {h > 52 && <div className="opacity-70 leading-tight">{fmtTime(apt.startTime)}–{fmtTime(et)}</div>}
                          {h > 68 && <div className="opacity-60 leading-tight">{getExec(apt.executiveId)?.name}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

function HistoryView({ appointments, onViewDetail }: { appointments: Appointment[]; onViewDetail: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"completed"|"cancelled">("all");
  const [dateFilter, setDateFilter] = useState("");
  const history = useMemo(() => {
    let r = appointments.filter(a => ["completed","cancelled"].includes(a.status));
    if (statusFilter !== "all") r = r.filter(a => a.status === statusFilter);
    if (dateFilter) r = r.filter(a => a.date === dateFilter);
    if (search) { const q = search.toLowerCase(); r = r.filter(a => a.clientName.toLowerCase().includes(q) || a.clientOrg.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)); }
    return r.sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments, search, statusFilter, dateFilter]);
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">History</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search history..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl border border-white/60 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-48 placeholder:text-slate-400" /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all"|"completed"|"cancelled")} className="px-3 py-2 text-sm rounded-xl border border-white/60 bg-white/60 backdrop-blur-sm focus:outline-none"><option value="all">All Status</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-white/60 bg-white/60 backdrop-blur-sm focus:outline-none" />
          {(search || dateFilter || statusFilter !== "all") && <button onClick={() => { setSearch(""); setDateFilter(""); setStatusFilter("all"); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 bg-white/60 hover:bg-white/80 border border-white/60 rounded-xl transition-all">Clear</button>}
        </div>
      </div>
      <div className={`${glass} rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/40 bg-white/25">
                {["ID","Client","Organization","Purpose","Date","Time","Executive","Status",""].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${["Organization","Executive"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {history.map(apt => (
                <tr key={apt.id} className="hover:bg-white/30 transition-all">
                  <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{apt.id}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-900">{apt.clientName}</td>
                  <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{apt.clientOrg}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate">{apt.purpose}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtDateShort(apt.date)}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{fmtTime(apt.startTime)}</td>
                  <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{getExec(apt.executiveId)?.name}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={apt.status} /></td>
                  <td className="px-4 py-3.5"><Tip label="View Details"><button onClick={() => onViewDetail(apt.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all"><Eye className="w-3.5 h-3.5" /></button></Tip></td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center"><HistoryIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-slate-400 text-sm">No records found.</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsView({ currentUser, users, onUpdateUsers }: { currentUser: AppUser; users: AppUser[]; onUpdateUsers: (u: AppUser[]) => void }) {
  const isAdmin = currentUser.role === "admin";
  const [activeTab, setActiveTab] = useState<"profile"|"account"|"notifications"|"preferences">("profile");
  const [notifications, setNotifications] = useState(NOTIFICATION_DEFAULTS);
  const [calDefault, setCalDefault] = useState<"day"|"week">("week");
  const [durationDefault, setDurationDefault] = useState("60");
  const tabs = [{ id: "profile" as const, label: "Profile" },{ id: "account" as const, label: "Account" },{ id: "notifications" as const, label: "Notifications" },{ id: "preferences" as const, label: "Preferences" }];
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
      <div className={`${glass} rounded-2xl px-4 pt-1 flex gap-0.5 overflow-x-auto`}>
        {tabs.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? "border-blue-500 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t.label}</button>)}
      </div>

      {activeTab === "profile" && (
        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><User className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Profile Information</h3></div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Av initials={currentUser.initials} size="lg" />
              <div>
                <div className="font-semibold text-slate-900">{currentUser.name}</div>
                <div className="text-sm text-slate-500">{currentUser.title}</div>
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${currentUser.active ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/70" : "bg-slate-100/80 text-slate-500 border-slate-300/70"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.active ? "bg-emerald-500" : "bg-slate-400"}`} /> {currentUser.active ? "Active" : "Inactive"} · {currentUser.role}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {[{ label: "Display Name", value: currentUser.name },{ label: "Email", value: currentUser.email },{ label: "Title", value: currentUser.title },{ label: "Role", value: currentUser.role }].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{f.label}</label>
                  <div className="px-3 py-2.5 text-sm rounded-xl border border-white/50 bg-white/40 text-slate-700 capitalize">{f.value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => toast.success("Profile saved")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600/90 hover:bg-blue-700 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 shadow-md shadow-blue-500/15">Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><Settings className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Change Password</h3></div>
          <div className="p-6">
            <div className="space-y-4 max-w-sm">
              {["Current Password","New Password","Confirm New Password"].map(label => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input type="password" placeholder="••••••••" className={inpOk} />
                </div>
              ))}
              <button onClick={() => toast.success("Password updated")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600/90 hover:bg-blue-700 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 shadow-md shadow-blue-500/15">Update Password</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><Bell className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Notification Preferences</h3></div>
          <div className="p-6 space-y-3">
            {[
              { key: "confirmations" as const, label: "Appointment Confirmations", desc: "Notify when appointments are confirmed" },
              { key: "rescheduling" as const,  label: "Appointment Rescheduling",  desc: "Notify when appointments are rescheduled" },
              { key: "cancellations" as const, label: "Appointment Cancellations", desc: "Notify when appointments are cancelled" },
              { key: "reminders" as const,     label: "Appointment Reminders",     desc: "Receive reminders before scheduled appointments" },
              { key: "conflicts" as const,     label: "Schedule Conflict Alerts",  desc: "Alert when a scheduling conflict is detected" },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-white/60">
                <div><div className="text-sm font-medium text-slate-900">{n.label}</div><div className="text-xs text-slate-500 mt-0.5">{n.desc}</div></div>
                <Toggle checked={notifications[n.key]} onChange={() => { const next = !notifications[n.key]; setNotifications(p => ({ ...p, [n.key]: next })); toast.success(`${n.label} ${next ? "enabled" : "disabled"}`); }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "preferences" && (
        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/40 flex items-center gap-2 bg-white/20"><Settings className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">Preferences</h3></div>
          <div className="p-6 space-y-5 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default Calendar View</label>
              <div className={`flex ${glass} rounded-xl overflow-hidden`}>
                {(["day","week"] as const).map(v => <button key={v} onClick={() => setCalDefault(v)} className={`flex-1 py-2 text-sm font-medium transition-all capitalize ${calDefault === v ? "bg-blue-600/90 text-white" : "text-slate-600 hover:bg-white/60"}`}>{v}</button>)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default Appointment Duration</label>
              <select value={durationDefault} onChange={e => setDurationDefault(e.target.value)} className={inpOk}>{DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}</select>
            </div>
            <button onClick={() => toast.success("Preferences saved")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600/90 hover:bg-blue-700 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 shadow-md shadow-blue-500/15">Save Preferences</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className={`${glass} rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4 border-b border-white/40 flex items-center justify-between bg-white/20">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">User Management</h3></div>
            <button onClick={() => toast("Add user — coming soon")} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600/90 hover:bg-blue-700 rounded-xl transition-all hover:-translate-y-0.5"><Plus className="w-3.5 h-3.5" /> Add User</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 bg-white/25">
                  {["User","Email","Role","Status","Actions"].map(h => <th key={h} className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === "Email" ? "hidden md:table-cell" : ""}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/30 transition-all">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-2.5"><Av initials={u.initials} /><div><div className="font-medium text-slate-900">{u.name}</div><div className="text-xs text-slate-500">{u.title}</div></div></div></td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3.5 text-slate-600 capitalize">{u.role}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${u.active ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/70" : "bg-slate-100/80 text-slate-500 border-slate-300/70"}`}><span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-slate-400"}`} />{u.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Tip label="Edit User"><button onClick={() => toast("Edit user — coming soon")} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button></Tip>
                        <Tip label={u.active ? "Deactivate" : "Activate"}>
                          <button disabled={u.id === currentUser.id}
                            onClick={() => { onUpdateUsers(users.map(usr => usr.id === u.id ? { ...usr, active: !usr.active } : usr)); toast.success(`${u.name} ${u.active ? "deactivated" : "activated"}`); }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50/60 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {u.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </Tip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const VIEW_TITLES: Record<AppView, string> = {
  dashboard: "Dashboard", appointments: "Appointments", "new-appointment": "New Appointment",
  detail: "Appointment Details", schedule: "Schedule", history: "History", settings: "Settings",
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]);
  const [view, setView] = useState<AppView>("dashboard");
  const [prevView, setPrevView] = useState<AppView>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(INITIAL_ACTIVITY);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [editAptId, setEditAptId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [aptPreFill, setAptPreFill] = useState<{ date?: string; startTime?: string } | undefined>(undefined);

  const canCreate = currentUser.role === "assistant";

  const addActivity = (entry: Omit<ActivityEntry, "id" | "user" | "timestamp">) => {
    setActivityLog(p => [...p, { id: genActId(), user: currentUser.name, timestamp: new Date().toISOString(), ...entry }]);
  };

  const handleViewDetail = (id: string) => { setPrevView(view === "detail" ? prevView : view); setSelectedAptId(id); setView("detail"); };
  const handleEdit = (id: string) => { setEditAptId(id); setAptPreFill(undefined); setPrevView(view); setView("new-appointment"); };
  const handleNewAptFromSlot = (date: string, startTime: string) => { setEditAptId(null); setAptPreFill({ date, startTime }); setView("new-appointment"); };

  const handleSave = (apt: Appointment) => {
    const isEdit = appointments.some(a => a.id === apt.id);
    if (isEdit) {
      setAppointments(p => p.map(a => a.id === apt.id ? apt : a));
      addActivity({ aptId: apt.id, action: "updated", clientName: apt.clientName });
      toast.success("Appointment updated", { description: apt.clientName });
    } else {
      setAppointments(p => [...p, apt]);
      addActivity({ aptId: apt.id, action: "created", clientName: apt.clientName });
      addActivity({ aptId: apt.id, action: "confirmed", clientName: apt.clientName });
      toast.success("Appointment confirmed!", { description: `${apt.clientName} · ${fmtDateShort(apt.date)} at ${fmtTime(apt.startTime)}` });
    }
    setEditAptId(null); setAptPreFill(undefined);
  };

  const handleCancel = (id: string, reason: string) => {
    const apt = appointments.find(a => a.id === id);
    setAppointments(p => p.map(a => a.id === id ? { ...a, status: "cancelled", cancellationReason: reason, updatedAt: new Date().toISOString(), updatedBy: currentUser.name } : a));
    addActivity({ aptId: id, action: "cancelled", clientName: apt?.clientName ?? "", note: reason || undefined });
    toast.success("Appointment cancelled", { description: apt?.clientName });
    setCancelId(null);
  };

  const handleComplete = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setAppointments(p => p.map(a => a.id === id ? { ...a, status: "completed", updatedAt: new Date().toISOString(), updatedBy: currentUser.name } : a));
    addActivity({ aptId: id, action: "completed", clientName: apt?.clientName ?? "" });
    toast.success("Marked as completed", { description: apt?.clientName });
    setCompleteId(null);
    if (view === "detail") setView("history");
  };

  const handleReschedule = (id: string, date: string, time: string, duration: number) => {
    const apt = appointments.find(a => a.id === id);
    setAppointments(p => p.map(a => a.id === id ? { ...a, status: "rescheduled", previousDate: a.date, previousStartTime: a.startTime, date, startTime: time, duration, updatedAt: new Date().toISOString(), updatedBy: currentUser.name } : a));
    addActivity({ aptId: id, action: "rescheduled", clientName: apt?.clientName ?? "", note: `Moved from ${apt ? fmtDateShort(apt.date) : ""} to ${fmtDateShort(date)}` });
    toast.success("Appointment rescheduled", { description: `${apt?.clientName} · ${fmtDateShort(date)} at ${fmtTime(time)}` });
    setRescheduleId(null);
  };

  if (!isLoggedIn) return <LoginView onLogin={u => { setCurrentUser(u); setIsLoggedIn(true); toast.success(`Welcome back, ${u.name.split(" ")[0]}!`); }} />;

  const selectedApt = selectedAptId ? appointments.find(a => a.id === selectedAptId) ?? null : null;
  const editApt = editAptId ? appointments.find(a => a.id === editAptId) : undefined;

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Background />
      <Toaster position="top-right" richColors toastOptions={{ classNames: { toast: "!bg-white/90 !backdrop-blur-xl !border !border-white/60 !shadow-xl !rounded-2xl" } }} />

      {cancelId && appointments.find(a => a.id === cancelId) && <CancelModal apt={appointments.find(a => a.id === cancelId)!} onConfirm={handleCancel} onClose={() => setCancelId(null)} />}
      {completeId && appointments.find(a => a.id === completeId) && <CompleteModal apt={appointments.find(a => a.id === completeId)!} onConfirm={handleComplete} onClose={() => setCompleteId(null)} />}
      {rescheduleId && appointments.find(a => a.id === rescheduleId) && <RescheduleModal apt={appointments.find(a => a.id === rescheduleId)!} appointments={appointments} onConfirm={handleReschedule} onClose={() => setRescheduleId(null)} />}

      <FloatingNav currentView={view} onNav={setView} currentUser={currentUser} onLogout={() => { setIsLoggedIn(false); setView("dashboard"); }} />

      <div className="relative z-10 flex flex-col min-h-screen md:ml-[272px] mr-0 md:mr-2">
        <FloatingHeader title={VIEW_TITLES[view]} currentUser={currentUser} onNewAppointment={() => { setEditAptId(null); setAptPreFill(undefined); setView("new-appointment"); }} canCreate={canCreate} />
        <main className="flex-1 pb-28 md:pb-6">
          {view === "dashboard" && <DashboardView appointments={appointments} activityLog={activityLog} onViewDetail={handleViewDetail} onNewAppointment={() => { setEditAptId(null); setAptPreFill(undefined); setView("new-appointment"); }} onNav={setView} currentUser={currentUser} />}
          {view === "appointments" && <AppointmentsView appointments={appointments} onViewDetail={handleViewDetail} onEdit={handleEdit} onNewAppointment={() => { setEditAptId(null); setAptPreFill(undefined); setView("new-appointment"); }} onCancel={setCancelId} onComplete={setCompleteId} onReschedule={setRescheduleId} currentUser={currentUser} />}
          {view === "new-appointment" && (
            <NewAppointmentView appointments={appointments} onSave={handleSave}
              onBack={() => setView(editAptId ? prevView : "dashboard")}
              onViewDetail={id => { setSelectedAptId(id); setView("detail"); }}
              onNavDashboard={() => setView("dashboard")}
              currentUser={currentUser} editData={editApt} preFill={aptPreFill} />
          )}
          {view === "detail" && (
            selectedApt
              ? <AppointmentDetailView apt={selectedApt} activityLog={activityLog} onBack={() => setView(prevView)} onEdit={handleEdit} onCancel={setCancelId} onComplete={setCompleteId} onReschedule={setRescheduleId} currentUser={currentUser} />
              : <div className="p-6 text-slate-500 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Appointment not found.</div>
          )}
          {view === "schedule" && <ScheduleView appointments={appointments} onViewDetail={handleViewDetail} onNewAptFromSlot={handleNewAptFromSlot} />}
          {view === "history" && <HistoryView appointments={appointments} onViewDetail={handleViewDetail} />}
          {view === "settings" && <SettingsView currentUser={currentUser} users={users} onUpdateUsers={setUsers} />}
        </main>
      </div>

      <MobileBottomNav currentView={view} onNav={setView} />
    </div>
  );
}
