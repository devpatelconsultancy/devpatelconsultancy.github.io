import type { Session } from '@supabase/supabase-js';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Pencil,
  FileText,
  Filter,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ClientRecord,
  hasSupabaseConfig,
  RemarkHistory,
  StaffProfile,
  supabase,
  WorkEntry,
} from '../lib/supabase';

type AuthMode = 'login' | 'signup';
type AdminTab = 'today' | 'pending' | 'month' | 'history';
type AdminMode = 'overview' | 'details' | 'clients';
type StatusFilter = WorkEntry['status'] | 'all';
type StaffQuickFilter = 'all' | 'today' | 'pending' | 'completed_month';
type PendingDetailView = 'staff' | 'client';

type EntryForm = {
  work_date: string;
  client_name: string;
  task: string;
  hours: string;
  status: WorkEntry['status'];
  remarks: string;
};

type ClientForm = {
  client_name: string;
  work: string;
  registered_date: string;
  quotation: string;
  status: ClientRecord['status'];
  remarks: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyEntryForm: EntryForm = {
  work_date: today,
  client_name: '',
  task: '',
  hours: '',
  status: 'in_progress',
  remarks: '',
};

const statusLabels: Record<WorkEntry['status'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
};

const clientStatusLabels: Record<ClientRecord['status'], string> = {
  quotation_sent: 'Quotation sent',
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On hold',
  lost: 'Lost',
};

const emptyClientForm: ClientForm = {
  client_name: '',
  work: '',
  registered_date: today,
  quotation: '',
  status: 'quotation_sent',
  remarks: '',
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'today', label: "Today's Work" },
  { id: 'pending', label: 'Pending Work' },
  { id: 'month', label: 'Monthly Summary' },
  { id: 'history', label: 'All History' },
];

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function downloadCsv(entries: WorkEntry[], fileLabel = 'work-report') {
  const header = ['Date', 'Staff', 'Client', 'Task', 'Hours', 'Status', 'Remarks'];
  const rows = entries.map((entry) => [
    entry.work_date,
    entry.profiles?.full_name ?? '',
    entry.client_name,
    entry.task,
    entry.hours,
    statusLabels[entry.status],
    entry.remarks ?? '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileLabel}-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function excelEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadClientsExcel(clients: ClientRecord[], fileLabel = 'clients') {
  const header = [
    'Client Name',
    'Work',
    'Registered Date',
    'Quotation',
    'Status',
    'Remarks',
  ];
  const rows = clients.map((client) => [
    client.client_name,
    client.work,
    client.registered_date,
    client.quotation,
    clientStatusLabels[client.status],
    client.remarks ?? '',
  ]);
  const tableRows = [header, ...rows]
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${excelEscape(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  const workbook = `<html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileLabel}-${today}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function isThisMonth(date: string) {
  return date.startsWith(today.slice(0, 7));
}

function getStaffName(entry: WorkEntry, profiles: StaffProfile[]) {
  return (
    entry.profiles?.full_name ??
    profiles.find((staff) => staff.id === entry.user_id)?.full_name ??
    'Staff'
  );
}

function SetupNotice() {
  return (
    <div className="min-h-screen bg-ivory px-5 py-10 text-ink">
      <div className="mx-auto max-w-2xl rounded-md border border-line bg-white p-6 shadow-card">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">
          Backend setup needed
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          Add your Supabase keys to enable staff login.
        </h1>
        <p className="mt-4 leading-7 text-ink/70">
          Create a `.env.local` file with `VITE_SUPABASE_URL` and
          `VITE_SUPABASE_PUBLISHABLE_KEY`, then restart the dev server.
        </p>
      </div>
    </div>
  );
}

function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
          });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === 'signup') {
      setMessage(
        'Signup complete. If email confirmation is on, confirm your email before logging in.',
      );
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fbfaf7_0%,#edf8f3_100%)] px-5 py-8 text-ink">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section>
          <a
            href="/"
            className="inline-flex items-center font-display text-xl font-extrabold text-forest"
          >
            Dev Patel & Associates
          </a>
          <h1 className="mt-8 max-w-xl font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Staff work records, daily updates and admin reports.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-ink/70">
            Staff can add today&apos;s work and view their own history. Admin can review
            every staff member&apos;s entries, pending work and monthly totals.
          </p>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-soft sm:p-7">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-mint p-1">
            {(['login', 'signup'] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-md px-4 py-3 font-bold transition ${
                  mode === item ? 'bg-white text-forest shadow-card' : 'text-ink/64'
                }`}
              >
                {item === 'login' ? 'Login' : 'Staff signup'}
              </button>
            ))}
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="grid gap-2 font-semibold">
                Full name
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-md border border-line px-4 py-3 font-normal outline-none focus:border-forest"
                />
              </label>
            )}
            <label className="grid gap-2 font-semibold">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-line px-4 py-3 font-normal outline-none focus:border-forest"
              />
            </label>
            <label className="grid gap-2 font-semibold">
              Password
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-line px-4 py-3 font-normal outline-none focus:border-forest"
              />
            </label>
            <button
              disabled={busy}
              className="mt-2 rounded-md bg-forest px-5 py-3 font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login'
                  : 'Create staff account'}
            </button>
            {message && (
              <p className="rounded-md border border-line bg-ivory px-4 py-3 text-sm font-semibold text-ink/72">
                {message}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

function EntryFormCard({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<EntryForm>(emptyEntryForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage('Please login again before saving work.');
      setBusy(false);
      return;
    }

    const hours = Number(form.hours);

    if (hours < 0) {
      setMessage('Hours cannot be negative.');
      setBusy(false);
      return;
    }

    const { error } = await supabase.from('work_entries').insert({
      user_id: user.id,
      work_date: form.work_date,
      client_name: form.client_name,
      task: form.task,
      hours,
      status: form.status,
      remarks: form.remarks || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setForm(emptyEntryForm);
      setMessage('Work entry saved.');
      onSaved();
    }

    setBusy(false);
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-mint text-forest">
          <Plus size={20} />
        </span>
        <h2 className="font-display text-xl font-bold">Add today&apos;s work</h2>
      </div>
      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-bold">
          Date
          <input
            required
            type="date"
            value={form.work_date}
            onChange={(event) => setForm({ ...form, work_date: event.target.value })}
            className="rounded-md border border-line px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Client name
          <input
            required
            value={form.client_name}
            onChange={(event) => setForm({ ...form, client_name: event.target.value })}
            className="rounded-md border border-line px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">
          Task
          <input
            required
            value={form.task}
            onChange={(event) => setForm({ ...form, task: event.target.value })}
            className="rounded-md border border-line px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Hours
          <input
            required
            min="0"
            step="0.25"
            type="number"
            value={form.hours}
            onChange={(event) => setForm({ ...form, hours: event.target.value })}
            className="rounded-md border border-line px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Status
          <select
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as WorkEntry['status'] })
            }
            className="rounded-md border border-line px-4 py-3 font-normal"
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">
          Remarks
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(event) => setForm({ ...form, remarks: event.target.value })}
            className="rounded-md border border-line px-4 py-3 font-normal"
          />
        </label>
        <div className="md:col-span-2">
          <button
            disabled={busy}
            className="rounded-md bg-forest px-5 py-3 font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving...' : 'Save work'}
          </button>
          {message && (
            <p className="mt-3 text-sm font-semibold text-ink/70">{message}</p>
          )}
        </div>
      </form>
    </section>
  );
}

function SummaryCards({
  entries,
  isAdmin,
  activeFilter = 'all',
  onFilterChange,
}: {
  entries: WorkEntry[];
  isAdmin: boolean;
  activeFilter?: StaffQuickFilter;
  onFilterChange?: (filter: StaffQuickFilter) => void;
}) {
  const summary = useMemo(() => {
    return {
      todayHours: entries
        .filter((entry) => entry.work_date === today)
        .reduce((total, entry) => total + Number(entry.hours), 0),
      completedThisMonth: entries.filter(
        (entry) => isThisMonth(entry.work_date) && entry.status === 'completed',
      ).length,
      pendingCount: entries.filter((entry) => entry.status !== 'completed').length,
      staffCount: new Set(entries.map((entry) => entry.user_id)).size,
    };
  }, [entries]);

  const cards = isAdmin
    ? ([
        {
          label: 'Today hours',
          value: summary.todayHours,
          icon: Clock3,
          filter: 'today',
          cue: undefined,
        },
        {
          label: 'Pending work',
          value: summary.pendingCount,
          icon: FileText,
          filter: 'pending',
          cue: undefined,
        },
        {
          label: 'Staff tracked',
          value: summary.staffCount,
          icon: Users,
          filter: 'all',
          cue: undefined,
        },
      ] satisfies Array<{
        label: string;
        value: number;
        icon: typeof Clock3;
        filter: StaffQuickFilter;
        cue?: string;
      }>)
    : ([
        {
          label: 'Today hours',
          value: summary.todayHours,
          icon: Clock3,
          filter: 'today',
          cue: "View today's entries",
        },
        {
          label: 'Pending tasks',
          value: summary.pendingCount,
          icon: FileText,
          filter: 'pending',
          cue: 'View pending work',
        },
        {
          label: 'Completed this month',
          value: summary.completedThisMonth,
          icon: CheckCircle2,
          filter: 'completed_month',
          cue: 'View completed work',
        },
      ] satisfies Array<{
        label: string;
        value: number;
        icon: typeof Clock3;
        filter: StaffQuickFilter;
        cue?: string;
      }>);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, filter, cue }) => {
        const isActive = activeFilter === filter;
        const nextFilter = isActive ? 'all' : filter;

        return (
          <button
          key={label}
          type="button"
          onClick={() => onFilterChange?.(nextFilter)}
          className={`group rounded-md border bg-white p-5 text-left shadow-card transition ${
            onFilterChange
              ? 'cursor-pointer hover:-translate-y-0.5 hover:border-forest hover:shadow-soft focus-visible:outline-forest'
              : 'cursor-default border-line'
          } ${isActive ? 'border-forest ring-2 ring-forest/15' : 'border-line'}`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-ink/52">
              {label}
            </p>
            <Icon className="text-forest" size={21} />
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</p>
          {onFilterChange && (
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-forest">
              {isActive ? 'Showing below' : cue ?? 'View entries'}
              <span className="ml-2 inline-block transition group-hover:translate-x-1">
                &gt;
              </span>
            </p>
          )}
        </button>
        );
      })}
    </div>
  );
}

function EntriesTable({
  entries,
  isAdmin,
  title,
  staffProfiles = [],
  canEditEntry = () => false,
  onStatusChange,
  onRemarksChange,
}: {
  entries: WorkEntry[];
  isAdmin: boolean;
  title: string;
  staffProfiles?: StaffProfile[];
  canEditEntry?: (entry: WorkEntry) => boolean;
  onStatusChange?: (entryId: string, status: WorkEntry['status']) => void;
  onRemarksChange?: (entryId: string, remarks: string) => Promise<void>;
}) {
  const [editingRemarks, setEditingRemarks] = useState<Record<string, string>>({});
  const [savingRemarkId, setSavingRemarkId] = useState<string | null>(null);

  async function handleSaveRemarks(entry: WorkEntry) {
    if (!onRemarksChange) {
      return;
    }

    const nextRemarks = editingRemarks[entry.id] ?? entry.remarks ?? '';
    setSavingRemarkId(entry.id);
    await onRemarksChange(entry.id, nextRemarks);
    setSavingRemarkId(null);
    setEditingRemarks((current) => {
      const next = { ...current };
      delete next[entry.id];
      return next;
    });
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Date</th>
              {isAdmin && <th className="px-5 py-3">Staff</th>}
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Task</th>
              <th className="px-5 py-3">Hours</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => {
              const canEdit = canEditEntry(entry);

              return (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {formatDate(entry.work_date)}
                </td>
                {isAdmin && (
                  <td className="whitespace-nowrap px-5 py-4">
                    {getStaffName(entry, staffProfiles)}
                  </td>
                )}
                <td className="px-5 py-4">{entry.client_name}</td>
                <td className="min-w-64 px-5 py-4">{entry.task}</td>
                <td className="px-5 py-4">{entry.hours}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  {onStatusChange && canEdit ? (
                    <select
                      value={entry.status}
                      onChange={(event) =>
                        onStatusChange(
                          entry.id,
                          event.target.value as WorkEntry['status'],
                        )
                      }
                      className="rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-forest"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
                      {statusLabels[entry.status]}
                    </span>
                  )}
                </td>
                <td className="min-w-72 px-5 py-4 text-ink/68">
                  {onRemarksChange && canEdit ? (
                    <div className="grid gap-2">
                      <textarea
                        rows={2}
                        value={editingRemarks[entry.id] ?? entry.remarks ?? ''}
                        onChange={(event) =>
                          setEditingRemarks((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-forest"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRemarks(entry)}
                        disabled={
                          savingRemarkId === entry.id ||
                          (editingRemarks[entry.id] ?? entry.remarks ?? '') ===
                            (entry.remarks ?? '')
                        }
                        className="justify-self-start rounded-md border border-line px-3 py-2 text-xs font-bold text-forest transition hover:border-forest disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingRemarkId === entry.id ? 'Saving...' : 'Save remarks'}
                      </button>
                    </div>
                  ) : (
                    entry.remarks
                  )}
                </td>
              </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td
                  className="px-5 py-8 text-center text-ink/60"
                  colSpan={isAdmin ? 7 : 6}
                >
                  No work entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminSummaryCards({
  entries,
  profiles,
  onReportedClick,
  onNotReportedClick,
  onPendingClick,
  onCompletedClick,
  reportedExpanded = false,
  notReportedExpanded = false,
  pendingExpanded = false,
  completedExpanded = false,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
  onReportedClick?: () => void;
  onNotReportedClick?: () => void;
  onPendingClick?: () => void;
  onCompletedClick?: () => void;
  reportedExpanded?: boolean;
  notReportedExpanded?: boolean;
  pendingExpanded?: boolean;
  completedExpanded?: boolean;
}) {
  const staffProfiles = profiles.filter((item) => item.role === 'staff');
  const todaysEntries = entries.filter((entry) => entry.work_date === today);
  const reportedToday = new Set(todaysEntries.map((entry) => entry.user_id));
  const todayHours = todaysEntries.reduce(
    (total, entry) => total + Number(entry.hours),
    0,
  );
  const pendingCount = entries.filter((entry) => entry.status !== 'completed').length;
  const completedToday = todaysEntries.filter(
    (entry) => entry.status === 'completed',
  ).length;

  const cards = [
    {
      label: 'Reported today',
      value: reportedToday.size,
      icon: UserCheck,
      onClick: onReportedClick,
      active: reportedExpanded,
      cue: reportedExpanded ? 'Hide tracker' : 'View tracker',
    },
    {
      label: 'Not reported',
      value: Math.max(staffProfiles.length - reportedToday.size, 0),
      icon: UserX,
      onClick: onNotReportedClick,
      active: notReportedExpanded,
      cue: notReportedExpanded ? 'Hide list' : 'View staff',
    },
    { label: 'Today hours', value: todayHours, icon: Clock3 },
    {
      label: 'Pending work',
      value: pendingCount,
      icon: ListChecks,
      onClick: onPendingClick,
      active: pendingExpanded,
      cue: pendingExpanded ? 'Hide work' : 'View work',
    },
    {
      label: 'Completed today',
      value: completedToday,
      icon: CheckCircle2,
      onClick: onCompletedClick,
      active: completedExpanded,
      cue: completedExpanded ? 'Hide details' : 'View details',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, onClick, active, cue }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={`group rounded-md border bg-white p-5 text-left shadow-card transition ${
            onClick
              ? 'cursor-pointer hover:-translate-y-0.5 hover:border-forest hover:shadow-soft focus-visible:outline-forest'
              : 'cursor-default border-line'
          } ${active ? 'border-forest ring-2 ring-forest/15' : 'border-line'}`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/52">
              {label}
            </p>
            <Icon className="text-forest" size={21} />
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</p>
          {onClick && (
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-forest">
              {cue}
              <span className="ml-2 inline-block transition group-hover:translate-x-1">
                &gt;
              </span>
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

function StaffTracker({
  entries,
  profiles,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
}) {
  const staffProfiles = profiles.filter((item) => item.role === 'staff');
  const rows = staffProfiles.map((staff) => {
    const staffEntries = entries.filter((entry) => entry.user_id === staff.id);
    const todaysEntries = staffEntries.filter((entry) => entry.work_date === today);
    const todayHours = todaysEntries.reduce(
      (total, entry) => total + Number(entry.hours),
      0,
    );
    const pendingCount = staffEntries.filter(
      (entry) => entry.status !== 'completed',
    ).length;
    const lastEntry = staffEntries[0];

    return {
      staff,
      submittedToday: todaysEntries.length > 0,
      todayHours,
      pendingCount,
      lastDate: lastEntry?.work_date,
    };
  });

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Staff tracker</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Today status</th>
              <th className="px-5 py-3">Today hours</th>
              <th className="px-5 py-3">Pending</th>
              <th className="px-5 py-3">Last entry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.staff.id}>
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {row.staff.full_name}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      row.submittedToday
                        ? 'bg-mint text-forest'
                        : 'bg-[#fff4e6] text-[#9a5b00]'
                    }`}
                  >
                    {row.submittedToday ? 'Submitted' : 'Not submitted'}
                  </span>
                </td>
                <td className="px-5 py-4">{row.todayHours}</td>
                <td className="px-5 py-4">{row.pendingCount}</td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/66">
                  {row.lastDate ? formatDate(row.lastDate) : 'No entries'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={5}>
                  No staff profiles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotReportedStaff({
  entries,
  profiles,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
}) {
  const reportedToday = new Set(
    entries.filter((entry) => entry.work_date === today).map((entry) => entry.user_id),
  );
  const rows = profiles
    .filter((staff) => staff.role === 'staff' && !reportedToday.has(staff.id))
    .map((staff) => {
      const lastEntry = entries.find((entry) => entry.user_id === staff.id);

      return {
        staff,
        lastDate: lastEntry?.work_date,
        pendingCount: entries.filter(
          (entry) => entry.user_id === staff.id && entry.status !== 'completed',
        ).length,
      };
    });

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Staff not reported today</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Last submitted</th>
              <th className="px-5 py-3">Pending tasks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.staff.id}>
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {row.staff.full_name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-ink/66">
                  {row.lastDate ? formatDate(row.lastDate) : 'No entries yet'}
                </td>
                <td className="px-5 py-4">{row.pendingCount}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={3}>
                  Every staff member has reported today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonthlySummary({
  entries,
  profiles,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
}) {
  const staffProfiles = profiles.filter((item) => item.role === 'staff');
  const monthEntries = entries.filter((entry) => isThisMonth(entry.work_date));

  const rows = staffProfiles.map((staff) => {
    const staffEntries = monthEntries.filter((entry) => entry.user_id === staff.id);
    return {
      staff,
      entries: staffEntries.length,
      hours: staffEntries.reduce((total, entry) => total + Number(entry.hours), 0),
      completed: staffEntries.filter((entry) => entry.status === 'completed').length,
      pending: staffEntries.filter((entry) => entry.status !== 'completed').length,
    };
  });

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Monthly summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Entries</th>
              <th className="px-5 py-3">Hours</th>
              <th className="px-5 py-3">Completed</th>
              <th className="px-5 py-3">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.staff.id}>
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {row.staff.full_name}
                </td>
                <td className="px-5 py-4">{row.entries}</td>
                <td className="px-5 py-4">{row.hours}</td>
                <td className="px-5 py-4">{row.completed}</td>
                <td className="px-5 py-4">{row.pending}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={5}>
                  No staff profiles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StaffSummaryTable({
  entries,
  profiles,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
}) {
  const rows = profiles
    .filter((staff) => staff.role === 'staff')
    .map((staff) => {
      const staffEntries = entries.filter((entry) => entry.user_id === staff.id);
      const completed = staffEntries.filter(
        (entry) => entry.status === 'completed',
      ).length;
      const pending = staffEntries.filter((entry) => entry.status === 'pending').length;
      const inProgress = staffEntries.filter(
        (entry) => entry.status === 'in_progress',
      ).length;
      const totalHours = staffEntries.reduce(
        (total, entry) => total + Number(entry.hours),
        0,
      );
      const clientsHandled = new Set(
        staffEntries.map((entry) => entry.client_name.trim()).filter(Boolean),
      ).size;
      const lastSubmittedDate = staffEntries
        .map((entry) => entry.work_date)
        .sort()
        .at(-1);

      return {
        staff,
        entries: staffEntries.length,
        totalHours,
        completed,
        pending,
        inProgress,
        lastSubmittedDate,
        averageHours:
          staffEntries.length > 0
            ? Number((totalHours / staffEntries.length).toFixed(2))
            : 0,
        clientsHandled,
        submittedToday: staffEntries.some((entry) => entry.work_date === today),
      };
    })
    .filter((row) => row.entries > 0)
    .sort((a, b) => b.totalHours - a.totalHours);

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Staff summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Entries</th>
              <th className="px-5 py-3">Hours</th>
              <th className="px-5 py-3">Completed</th>
              <th className="px-5 py-3">Pending</th>
              <th className="px-5 py-3">In progress</th>
              <th className="px-5 py-3">Last submitted</th>
              <th className="px-5 py-3">Avg hours</th>
              <th className="px-5 py-3">Clients</th>
              <th className="px-5 py-3">Today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.staff.id}>
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {row.staff.full_name}
                </td>
                <td className="px-5 py-4">{row.entries}</td>
                <td className="px-5 py-4">{row.totalHours}</td>
                <td className="px-5 py-4">{row.completed}</td>
                <td className="px-5 py-4">{row.pending}</td>
                <td className="px-5 py-4">{row.inProgress}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  {row.lastSubmittedDate ? formatDate(row.lastSubmittedDate) : '-'}
                </td>
                <td className="px-5 py-4">{row.averageHours}</td>
                <td className="px-5 py-4">{row.clientsHandled}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      row.submittedToday
                        ? 'bg-mint text-forest'
                        : 'bg-[#fff4e6] text-[#9a5b00]'
                    }`}
                  >
                    {row.submittedToday ? 'Submitted' : 'Not submitted'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={10}>
                  No staff activity matches the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RemarkHistoryPanel({
  histories,
  profiles,
}: {
  histories: RemarkHistory[];
  profiles: StaffProfile[];
}) {
  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Remark update history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Changed at</th>
              <th className="px-5 py-3">Updated by</th>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Client</th>
              <th className="px-5 py-3">Task</th>
              <th className="px-5 py-3">Old remark</th>
              <th className="px-5 py-3">New remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {histories.map((history) => {
              const workStaff = profiles.find(
                (staff) => staff.id === history.work_entries?.user_id,
              );

              return (
                <tr key={history.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">
                    {new Intl.DateTimeFormat('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(history.changed_at))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {history.profiles?.full_name ?? 'User'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {workStaff?.full_name ?? 'Staff'}
                  </td>
                  <td className="px-5 py-4">
                    {history.work_entries?.client_name ?? '-'}
                  </td>
                  <td className="min-w-64 px-5 py-4">
                    {history.work_entries?.task ?? '-'}
                  </td>
                  <td className="min-w-56 px-5 py-4 text-ink/58">
                    {history.old_remarks || '-'}
                  </td>
                  <td className="min-w-56 px-5 py-4 text-ink">
                    {history.new_remarks || '-'}
                  </td>
                </tr>
              );
            })}
            {histories.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={7}>
                  No remark changes recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClientsPanel({
  clients,
  setupError,
  onClientSaved,
}: {
  clients: ClientRecord[];
  setupError: string;
  onClientSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<ClientForm>(emptyClientForm);
  const [showForm, setShowForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function resetForm() {
    setForm(emptyClientForm);
    setEditingClientId(null);
  }

  function startAddClient() {
    setMessage('');
    resetForm();
    setShowForm((current) => !current);
  }

  function startEditClient(client: ClientRecord) {
    setMessage('');
    setForm({
      client_name: client.client_name,
      work: client.work,
      registered_date: client.registered_date,
      quotation: client.quotation,
      status: client.status,
      remarks: client.remarks ?? '',
    });
    setEditingClientId(client.id);
    setShowForm(true);
  }

  async function handleDeleteClient(client: ClientRecord) {
    const confirmed = window.confirm(
      `Delete client "${client.client_name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingClientId(client.id);
    setMessage('');

    const { error } = await supabase.from('clients').delete().eq('id', client.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Client deleted.');
      window.setTimeout(() => setMessage(''), 3000);
      await onClientSaved();
    }

    setDeletingClientId(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage('Please login again before adding a client.');
      setBusy(false);
      return;
    }

    const clientPayload = {
      client_name: form.client_name.trim(),
      work: form.work.trim(),
      registered_date: form.registered_date,
      quotation: form.quotation.trim(),
      status: form.status,
      remarks: form.remarks.trim() || null,
    };

    const { error } = editingClientId
      ? await supabase.from('clients').update(clientPayload).eq('id', editingClientId)
      : await supabase.from('clients').insert({
          ...clientPayload,
          created_by: user.id,
        });

    if (error) {
      setMessage(error.message);
    } else {
      const wasEditing = Boolean(editingClientId);
      resetForm();
      setMessage(wasEditing ? 'Client updated.' : 'Client added.');
      setShowForm(false);
      window.setTimeout(() => setMessage(''), 3000);
      await onClientSaved();
    }

    setBusy(false);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-line bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-mint text-forest">
              <Plus size={20} />
            </span>
            <h2 className="font-display text-xl font-bold">Clients</h2>
          </div>
          <button
            type="button"
            onClick={startAddClient}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 font-bold text-white transition hover:bg-teal"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Hide form' : 'Add client'}
          </button>
        </div>
        {showForm && (
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <p className="md:col-span-2 text-sm font-bold text-forest">
              {editingClientId ? 'Editing client' : 'New client'}
            </p>
            <label className="grid gap-2 text-sm font-bold">
              Client name
              <input
                required
                value={form.client_name}
                onChange={(event) =>
                  setForm({ ...form, client_name: event.target.value })
                }
                className="rounded-md border border-line px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Registered date
              <input
                required
                type="date"
                value={form.registered_date}
                onChange={(event) =>
                  setForm({ ...form, registered_date: event.target.value })
                }
                className="rounded-md border border-line px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              Work
              <input
                required
                value={form.work}
                onChange={(event) => setForm({ ...form, work: event.target.value })}
                className="rounded-md border border-line px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Quotation
              <input
                required
                value={form.quotation}
                onChange={(event) => setForm({ ...form, quotation: event.target.value })}
                className="rounded-md border border-line px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ClientRecord['status'],
                  })
                }
                className="rounded-md border border-line px-4 py-3 font-normal"
              >
                {Object.entries(clientStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              Remarks
              <textarea
                rows={3}
                value={form.remarks}
                onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                className="rounded-md border border-line px-4 py-3 font-normal"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button
                disabled={busy}
                className="rounded-md bg-forest px-5 py-3 font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Saving...' : editingClientId ? 'Update client' : 'Save client'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage('');
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-md border border-line px-5 py-3 font-bold text-ink transition hover:border-forest"
              >
                Cancel
              </button>
              {message && (
                <p className="text-sm font-semibold text-ink/70">{message}</p>
              )}
            </div>
          </form>
        )}
        {!showForm && message && (
          <p className="mt-3 text-sm font-semibold text-ink/70">{message}</p>
        )}
      </section>

      {setupError && (
        <p className="rounded-md border border-line bg-white p-4 font-semibold text-ink/70">
          The Clients database table is not set up yet. Run
          `supabase-clients-setup.sql` in Supabase SQL Editor, then refresh this
          dashboard.
        </p>
      )}

      <section className="rounded-md border border-line bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold">Client entries</h2>
          <button
            type="button"
            onClick={() => downloadClientsExcel(clients)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-3 font-bold text-forest transition hover:border-forest"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
              <tr>
                <th className="px-5 py-3">Client name</th>
                <th className="px-5 py-3">Work</th>
                <th className="px-5 py-3">Registered date</th>
                <th className="px-5 py-3">Quotation</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Remarks</th>
                <th className="w-28 px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((client) => (
                <tr key={client.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">
                    {client.client_name}
                  </td>
                  <td className="min-w-64 px-5 py-4">{client.work}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {formatDate(client.registered_date)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">{client.quotation}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
                      {clientStatusLabels[client.status]}
                    </span>
                  </td>
                  <td className="min-w-72 px-5 py-4 text-ink/68">
                    {client.remarks || '-'}
                  </td>
                  <td className="w-28 whitespace-nowrap px-5 py-4">
                    <div className="inline-flex overflow-hidden rounded-md border border-line bg-white align-middle shadow-sm">
                      <button
                        type="button"
                        onClick={() => startEditClient(client)}
                        disabled={busy || deletingClientId === client.id}
                        aria-label={`Edit ${client.client_name}`}
                        title="Edit client"
                        className="grid size-9 place-items-center text-forest transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client)}
                        disabled={busy || deletingClientId === client.id}
                        aria-label={`Delete ${client.client_name}`}
                        title={
                          deletingClientId === client.id
                            ? 'Deleting client'
                            : 'Delete client'
                        }
                        className="grid size-9 place-items-center border-l border-line text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingClientId === client.id ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-ink/60" colSpan={7}>
                    No clients added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminWorkspace({
  entries,
  profiles,
  remarkHistories,
  onStatusChange,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
  remarkHistories: RemarkHistory[];
  onStatusChange: (entryId: string, status: WorkEntry['status']) => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('today');
  const [staffFilter, setStaffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingDetailView, setPendingDetailView] = useState<PendingDetailView | null>(
    null,
  );

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      const tabMatch =
        activeTab === 'today'
          ? entry.work_date === today
          : activeTab === 'pending'
            ? entry.status !== 'completed'
            : activeTab === 'month'
              ? isThisMonth(entry.work_date)
              : true;
      const staffMatch = staffFilter === 'all' || entry.user_id === staffFilter;
      const statusMatch = statusFilter === 'all' || entry.status === statusFilter;
      const fromMatch = !dateFrom || entry.work_date >= dateFrom;
      const toMatch = !dateTo || entry.work_date <= dateTo;
      const haystack = [
        getStaffName(entry, profiles),
        entry.client_name,
        entry.task,
        entry.remarks ?? '',
      ]
        .join(' ')
        .toLowerCase();
      const searchMatch =
        !searchTerm || haystack.includes(searchTerm.trim().toLowerCase());

      return (
        tabMatch &&
        staffMatch &&
        statusMatch &&
        fromMatch &&
        toMatch &&
        searchMatch
      );
    });
  }, [activeTab, dateFrom, dateTo, entries, profiles, searchTerm, staffFilter, statusFilter]);

  const reportTitle =
    adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'Work report';

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-line bg-white p-4 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-forest text-white'
                    : 'border border-line bg-white text-ink/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(visibleEntries, activeTab)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-3 font-bold text-forest transition hover:border-forest"
          >
            <Download size={18} />
            Export current view
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-bold">
            <span className="inline-flex items-center gap-2">
              <Users size={16} />
              Staff
            </span>
            <select
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
              className="rounded-md border border-line px-3 py-3 font-normal"
            >
              <option value="all">All staff</option>
              {profiles
                .filter((item) => item.role === 'staff')
                .map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span className="inline-flex items-center gap-2">
              <Filter size={16} />
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-md border border-line px-3 py-3 font-normal"
            >
              <option value="all">All status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-md border border-line px-3 py-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-md border border-line px-3 py-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span className="inline-flex items-center gap-2">
              <Search size={16} />
              Search
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Client, task, remarks"
              className="rounded-md border border-line px-3 py-3 font-normal"
            />
          </label>
        </div>
      </section>

      {activeTab === 'month' ? (
        <>
          <MonthlySummary entries={entries} profiles={profiles} />
          <RemarkHistoryPanel histories={remarkHistories} profiles={profiles} />
        </>
      ) : (
        <>
          {activeTab === 'pending' && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { value: 'staff' as const, label: 'Pending by staff', icon: Users },
                { value: 'client' as const, label: 'Pending by client', icon: FileText },
              ].map(({ value, label, icon: Icon }) => {
                const isActive = pendingDetailView === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPendingDetailView((current) =>
                        current === value ? null : value,
                      )
                    }
                    className={`group rounded-md border bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-forest hover:shadow-soft ${
                      isActive ? 'border-forest ring-2 ring-forest/15' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-ink/52">
                        {label}
                      </p>
                      <Icon className="text-forest" size={21} />
                    </div>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-forest">
                      {isActive ? 'Hide details' : 'View details'}
                      <span className="ml-2 inline-block transition group-hover:translate-x-1">
                        &gt;
                      </span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {activeTab === 'pending' && pendingDetailView && (
            <PendingWorkSummary
              entries={visibleEntries}
              profiles={profiles}
              view={pendingDetailView}
            />
          )}
          <EntriesTable
            title={reportTitle}
            entries={visibleEntries}
            isAdmin
            staffProfiles={profiles}
            canEditEntry={() => true}
            onStatusChange={onStatusChange}
          />
          <RemarkHistoryPanel histories={remarkHistories} profiles={profiles} />
        </>
      )}
    </div>
  );
}

function PendingWorkSummary({
  entries,
  profiles,
  view,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
  view: PendingDetailView;
}) {
  const pendingEntries = entries.filter((entry) => entry.status !== 'completed');
  const staffRows = profiles
    .filter((staff) => staff.role === 'staff')
    .map((staff) => {
      const staffPending = pendingEntries.filter((entry) => entry.user_id === staff.id);
      const pendingDates = staffPending.map((entry) => entry.work_date).sort();
      const clients = Array.from(
        new Set(staffPending.map((entry) => entry.client_name.trim()).filter(Boolean)),
      );
      const pendingHours = staffPending.reduce(
        (total, entry) => total + Number(entry.hours),
        0,
      );

      return {
        staff,
        pendingEntries: staffPending,
        pendingCount: staffPending.length,
        pendingHours,
        pendingFrom: pendingDates[0],
        clients,
        zeroHourCount: staffPending.filter((entry) => Number(entry.hours) === 0).length,
      };
    })
    .filter((row) => row.pendingCount > 0)
    .sort((a, b) => {
      if (!a.pendingFrom || !b.pendingFrom) {
        return b.pendingCount - a.pendingCount;
      }

      return a.pendingFrom.localeCompare(b.pendingFrom);
    });
  const clientRows = Array.from(
    pendingEntries.reduce((clientMap, entry) => {
      const clientName = entry.client_name.trim() || 'Unnamed client';
      const current = clientMap.get(clientName) ?? [];
      current.push(entry);
      clientMap.set(clientName, current);
      return clientMap;
    }, new Map<string, WorkEntry[]>()),
  )
    .map(([clientName, clientEntries]) => {
      const pendingDates = clientEntries.map((entry) => entry.work_date).sort();
      const staffNames = Array.from(
        new Set(clientEntries.map((entry) => getStaffName(entry, profiles))),
      );
      const pendingHours = clientEntries.reduce(
        (total, entry) => total + Number(entry.hours),
        0,
      );

      return {
        clientName,
        clientEntries,
        pendingCount: clientEntries.length,
        pendingFrom: pendingDates[0],
        pendingHours,
        staffNames,
        zeroHourCount: clientEntries.filter((entry) => Number(entry.hours) === 0)
          .length,
      };
    })
    .sort((a, b) => {
      if (!a.pendingFrom || !b.pendingFrom) {
        return b.pendingCount - a.pendingCount;
      }

      return a.pendingFrom.localeCompare(b.pendingFrom);
    });

  return (
    <div className="grid gap-6">
      {view === 'staff' && (
      <section className="rounded-md border border-line bg-white shadow-card">
        <div className="border-b border-line p-5">
          <h2 className="font-display text-xl font-bold">Pending work by staff</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
              <tr>
                <th className="px-5 py-3">Staff</th>
                <th className="px-5 py-3">Tasks</th>
                <th className="px-5 py-3">From</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Clients</th>
                <th className="px-5 py-3">Oldest item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {staffRows.map((row) => {
                const oldestEntry = row.pendingEntries
                  .slice()
                  .sort((a, b) => a.work_date.localeCompare(b.work_date))[0];

                return (
                  <tr key={row.staff.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {row.staff.full_name}
                    </td>
                    <td className="px-5 py-4">{row.pendingCount}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {row.pendingFrom ? formatDate(row.pendingFrom) : '-'}
                    </td>
                    <td className="px-5 py-4">{row.pendingHours}</td>
                    <td className="min-w-44 px-5 py-4 text-ink/70">
                      {row.clients.length > 0 ? row.clients.join(', ') : '-'}
                    </td>
                    <td className="min-w-64 px-5 py-4">
                      {oldestEntry ? (
                        <div>
                          <p className="font-semibold text-ink">
                            {oldestEntry.client_name}
                          </p>
                          <p className="mt-1 text-ink/68">{oldestEntry.task}</p>
                          {row.zeroHourCount > 0 && (
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-forest">
                              {row.zeroHourCount} zero-hour pending
                            </p>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
              {staffRows.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-ink/60" colSpan={6}>
                    No pending work by staff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {view === 'client' && (
      <section className="rounded-md border border-line bg-white shadow-card">
        <div className="border-b border-line p-5">
          <h2 className="font-display text-xl font-bold">Pending work by client</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
              <tr>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Tasks</th>
                <th className="px-5 py-3">From</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Staff</th>
                <th className="px-5 py-3">Oldest item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clientRows.map((row) => {
                const oldestEntry = row.clientEntries
                  .slice()
                  .sort((a, b) => a.work_date.localeCompare(b.work_date))[0];

                return (
                  <tr key={row.clientName} className="align-top">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {row.clientName}
                    </td>
                    <td className="px-5 py-4">{row.pendingCount}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {row.pendingFrom ? formatDate(row.pendingFrom) : '-'}
                    </td>
                    <td className="px-5 py-4">{row.pendingHours}</td>
                    <td className="min-w-44 px-5 py-4 text-ink/70">
                      {row.staffNames.join(', ')}
                    </td>
                    <td className="min-w-64 px-5 py-4">
                      {oldestEntry ? (
                        <div>
                          <p className="font-semibold text-ink">
                            {getStaffName(oldestEntry, profiles)}
                          </p>
                          <p className="mt-1 text-ink/68">{oldestEntry.task}</p>
                          {row.zeroHourCount > 0 && (
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-forest">
                              {row.zeroHourCount} zero-hour pending
                            </p>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
              {clientRows.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-ink/60" colSpan={6}>
                    No pending work by client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}

function CompletedTodaySummary({
  entries,
  profiles,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
}) {
  const completedEntries = entries.filter(
    (entry) => entry.work_date === today && entry.status === 'completed',
  );
  const rows = profiles
    .filter((staff) => staff.role === 'staff')
    .map((staff) => {
      const staffCompleted = completedEntries.filter(
        (entry) => entry.user_id === staff.id,
      );
      const clients = Array.from(
        new Set(staffCompleted.map((entry) => entry.client_name.trim()).filter(Boolean)),
      );
      const totalHours = staffCompleted.reduce(
        (total, entry) => total + Number(entry.hours),
        0,
      );

      return {
        staff,
        completedEntries: staffCompleted,
        completedCount: staffCompleted.length,
        totalHours,
        clients,
      };
    })
    .filter((row) => row.completedCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount);

  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl font-bold">Completed today by staff</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-mint text-xs uppercase tracking-[0.12em] text-ink/58">
            <tr>
              <th className="px-5 py-3">Staff</th>
              <th className="px-5 py-3">Completed tasks</th>
              <th className="px-5 py-3">Hours</th>
              <th className="px-5 py-3">Clients</th>
              <th className="px-5 py-3">Completed items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.staff.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {row.staff.full_name}
                </td>
                <td className="px-5 py-4">{row.completedCount}</td>
                <td className="px-5 py-4">{row.totalHours}</td>
                <td className="min-w-48 px-5 py-4 text-ink/70">
                  {row.clients.length > 0 ? row.clients.join(', ') : '-'}
                </td>
                <td className="min-w-80 px-5 py-4">
                  <div className="grid gap-3">
                    {row.completedEntries.slice(0, 4).map((entry) => (
                      <div key={entry.id}>
                        <p className="font-semibold text-ink">{entry.client_name}</p>
                        <p className="mt-1 text-ink/68">{entry.task}</p>
                        {entry.remarks && (
                          <p className="mt-1 text-xs font-semibold text-ink/52">
                            {entry.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                    {row.completedEntries.length > 4 && (
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">
                        +{row.completedEntries.length - 4} more completed items
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink/60" colSpan={5}>
                  No completed work recorded for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminOverview({
  entries,
  profiles,
  onStatusChange,
}: {
  entries: WorkEntry[];
  profiles: StaffProfile[];
  onStatusChange: (entryId: string, status: WorkEntry['status']) => void;
}) {
  const [showStaffTracker, setShowStaffTracker] = useState(false);
  const [showNotReported, setShowNotReported] = useState(false);
  const [showPendingWork, setShowPendingWork] = useState(false);
  const [showCompletedSummary, setShowCompletedSummary] = useState(false);
  const todaysEntries = entries.filter((entry) => entry.work_date === today);
  const pendingEntries = entries.filter((entry) => entry.status !== 'completed');

  return (
    <div className="grid gap-6">
      <AdminSummaryCards
        entries={entries}
        profiles={profiles}
        reportedExpanded={showStaffTracker}
        notReportedExpanded={showNotReported}
        pendingExpanded={showPendingWork}
        completedExpanded={showCompletedSummary}
        onReportedClick={() => setShowStaffTracker((current) => !current)}
        onNotReportedClick={() => setShowNotReported((current) => !current)}
        onPendingClick={() => setShowPendingWork((current) => !current)}
        onCompletedClick={() => setShowCompletedSummary((current) => !current)}
      />
      {showCompletedSummary && (
        <CompletedTodaySummary entries={entries} profiles={profiles} />
      )}
      {showStaffTracker && <StaffTracker entries={entries} profiles={profiles} />}
      {showNotReported && <NotReportedStaff entries={entries} profiles={profiles} />}
      {showPendingWork && (
        <EntriesTable
          title="All pending work"
          entries={pendingEntries}
          isAdmin
          staffProfiles={profiles}
          canEditEntry={() => true}
          onStatusChange={onStatusChange}
        />
      )}
      <div className="grid gap-6">
        <EntriesTable
          title="Today's work"
          entries={todaysEntries}
          isAdmin
          staffProfiles={profiles}
          canEditEntry={() => true}
          onStatusChange={onStatusChange}
        />
        <EntriesTable
          title="Pending follow-up"
          entries={pendingEntries.slice(0, 8)}
          isAdmin
          staffProfiles={profiles}
          canEditEntry={() => true}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  );
}

function Dashboard({ session, profile }: { session: Session; profile: StaffProfile }) {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [remarkHistories, setRemarkHistories] = useState<RemarkHistory[]>([]);
  const [adminMode, setAdminMode] = useState<AdminMode>('overview');
  const [staffQuickFilter, setStaffQuickFilter] = useState<StaffQuickFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientSetupError, setClientSetupError] = useState('');
  const isAdmin = profile.role === 'admin';

  const staffVisibleEntries = useMemo(() => {
    if (staffQuickFilter === 'today') {
      return entries.filter((entry) => entry.work_date === today);
    }

    if (staffQuickFilter === 'pending') {
      return entries.filter((entry) => entry.status !== 'completed');
    }

    if (staffQuickFilter === 'completed_month') {
      return entries.filter(
        (entry) => isThisMonth(entry.work_date) && entry.status === 'completed',
      );
    }

    return entries;
  }, [entries, staffQuickFilter]);

  const staffHistoryTitle =
    staffQuickFilter === 'today'
      ? "Today's entries"
      : staffQuickFilter === 'pending'
        ? 'Pending tasks'
        : staffQuickFilter === 'completed_month'
          ? 'Completed this month'
          : 'Your work history';

  async function loadClients() {
    if (!isAdmin) {
      return;
    }

    const { data, error: clientsQueryError } = await supabase
      .from('clients')
      .select('*')
      .order('registered_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (clientsQueryError) {
      setClientSetupError(clientsQueryError.message);
      setClients([]);
    } else {
      setClientSetupError('');
      setClients((data ?? []) as ClientRecord[]);
    }
  }

  async function loadEntries() {
    setLoading(true);
    setError('');

    let entriesQuery = supabase
      .from('work_entries')
      .select('*, profiles(full_name)')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      entriesQuery = entriesQuery.eq('user_id', session.user.id);
    }

    const { data: entryData, error: queryError } = await entriesQuery;

    if (queryError) {
      setError(queryError.message);
    } else {
      setEntries((entryData ?? []) as WorkEntry[]);
    }

    if (isAdmin) {
      const { data: profileData, error: profileQueryError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (profileQueryError) {
        setError((current) =>
          current ? `${current} ${profileQueryError.message}` : profileQueryError.message,
        );
      } else {
        setProfiles((profileData ?? []) as StaffProfile[]);
      }

      const { data: historyData, error: historyQueryError } = await supabase
        .from('remark_history')
        .select('*, profiles(full_name), work_entries(client_name, task, work_date, user_id)')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (historyQueryError) {
        setError((current) =>
          current ? `${current} ${historyQueryError.message}` : historyQueryError.message,
        );
      } else {
        setRemarkHistories((historyData ?? []) as RemarkHistory[]);
      }

      await loadClients();
    }

    setLoading(false);
  }

  async function handleStatusChange(entryId: string, status: WorkEntry['status']) {
    const previousEntries = entries;
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, status } : entry)),
    );

    let updateQuery = supabase
      .from('work_entries')
      .update({ status })
      .eq('id', entryId);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', session.user.id);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      setEntries(previousEntries);
      setError(updateError.message);
    }
  }

  async function handleRemarksChange(entryId: string, remarks: string) {
    const normalizedRemarks = remarks.trim() || null;
    const previousEntries = entries;

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, remarks: normalizedRemarks } : entry,
      ),
    );

    let updateQuery = supabase
      .from('work_entries')
      .update({ remarks: normalizedRemarks })
      .eq('id', entryId);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', session.user.id);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      setEntries(previousEntries);
      setError(updateError.message);
    } else if (isAdmin) {
      loadEntries();
    }
  }

  useEffect(() => {
    loadEntries();
  }, [session.user.id]);

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-gold">
              {isAdmin ? 'Admin dashboard' : 'Staff dashboard'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold">
              Welcome, {profile.full_name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadEntries}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 font-bold text-ink"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-3 font-bold text-white"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:px-8">
        {isAdmin ? (
          <div className="flex flex-wrap gap-2 rounded-md border border-line bg-white p-2 shadow-card">
            {[
              ['overview', 'Overview'],
              ['details', 'Detailed reports'],
              ['clients', 'Clients'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAdminMode(value as AdminMode)}
                className={`rounded-md px-4 py-3 font-bold transition ${
                  adminMode === value
                    ? 'bg-forest text-white'
                    : 'bg-white text-ink/68 hover:bg-mint'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <SummaryCards
              entries={entries}
              isAdmin={isAdmin}
              activeFilter={staffQuickFilter}
              onFilterChange={setStaffQuickFilter}
            />
            <EntryFormCard onSaved={loadEntries} />
          </>
        )}
        {error && (
          <p className="rounded-md border border-line bg-white p-4 font-semibold text-ink/70">
            {error}
          </p>
        )}
        {loading ? (
          <p className="rounded-md border border-line bg-white p-5 font-semibold text-ink/70">
            Loading work entries...
          </p>
        ) : isAdmin && adminMode === 'overview' ? (
          <AdminOverview
            entries={entries}
            profiles={profiles}
            onStatusChange={handleStatusChange}
          />
        ) : isAdmin && adminMode === 'clients' ? (
          <ClientsPanel
            clients={clients}
            setupError={clientSetupError}
            onClientSaved={loadClients}
          />
        ) : isAdmin ? (
          <AdminWorkspace
            entries={entries}
            profiles={profiles}
            remarkHistories={remarkHistories}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <EntriesTable
            title={staffHistoryTitle}
            entries={staffVisibleEntries}
            isAdmin={false}
            canEditEntry={(entry) => entry.user_id === session.user.id}
            onStatusChange={handleStatusChange}
            onRemarksChange={handleRemarksChange}
          />
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setProfile(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileError('');
      return;
    }

    const activeSession = session;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError('');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeSession.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as StaffProfile);
        setProfileLoading(false);
        return;
      }

      if (error) {
        setProfileError(error.message);
        setProfileLoading(false);
        return;
      }

      const fallbackName =
        activeSession.user.user_metadata.full_name ??
        activeSession.user.email?.split('@')[0] ??
        'Staff';

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: activeSession.user.id,
          full_name: fallbackName,
          role: 'staff',
        })
        .select('*')
        .single();

      if (createError) {
        setProfileError(createError.message);
      } else {
        setProfile(createdProfile as StaffProfile);
      }

      setProfileLoading(false);
    }

    loadProfile();
  }, [session]);

  async function handleRetryProfile() {
    if (!session) {
      return;
    }

    setProfileLoading(true);
    setProfileError('');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
    } else if (data) {
      setProfile(data as StaffProfile);
    } else {
      setProfileError('No profile row exists yet for this account.');
    }

    setProfileLoading(false);
  }

  if (!hasSupabaseConfig) {
    return <SetupNotice />;
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ivory font-bold text-ink">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthPanel />;
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-ivory px-5 text-center text-ink">
        <div className="max-w-md rounded-md border border-line bg-white p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold">Setting up profile</h1>
          <p className="mt-3 leading-7 text-ink/70">
            {profileLoading
              ? 'Creating or loading the staff profile...'
              : 'The staff profile could not be loaded yet.'}
          </p>
          {profileError && (
            <p className="mt-4 rounded-md bg-mint p-3 text-sm font-semibold text-forest">
              {profileError}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRetryProfile}
              className="rounded-md border border-line px-4 py-3 font-bold text-ink"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="rounded-md bg-forest px-4 py-3 font-bold text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard session={session} profile={profile} />;
}
