import type { Session } from '@supabase/supabase-js';
import {
  CalendarDays,
  Clock3,
  Download,
  FileText,
  LogOut,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, StaffProfile, supabase, WorkEntry } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

type EntryForm = {
  work_date: string;
  client_name: string;
  task: string;
  hours: string;
  status: WorkEntry['status'];
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

function downloadCsv(entries: WorkEntry[]) {
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
  link.download = `work-report-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

    const { error } = await supabase.from('work_entries').insert({
      user_id: user.id,
      work_date: form.work_date,
      client_name: form.client_name,
      task: form.task,
      hours: Number(form.hours),
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
            min="0.25"
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
}: {
  entries: WorkEntry[];
  isAdmin: boolean;
}) {
  const summary = useMemo(() => {
    const month = today.slice(0, 7);
    return {
      todayCount: entries.filter((entry) => entry.work_date === today).length,
      monthHours: entries
        .filter((entry) => entry.work_date.startsWith(month))
        .reduce((total, entry) => total + Number(entry.hours), 0),
      pendingCount: entries.filter((entry) => entry.status !== 'completed').length,
      staffCount: new Set(entries.map((entry) => entry.user_id)).size,
    };
  }, [entries]);

  const cards = [
    ['Today', summary.todayCount, CalendarDays],
    ['This month hours', summary.monthHours, Clock3],
    ['Pending work', summary.pendingCount, FileText],
    [
      isAdmin ? 'Staff tracked' : 'Your entries',
      isAdmin ? summary.staffCount : entries.length,
      Users,
    ],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon]) => (
        <div
          key={label}
          className="rounded-md border border-line bg-white p-5 shadow-card"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-ink/52">
              {label}
            </p>
            <Icon className="text-forest" size={21} />
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}

function EntriesTable({
  entries,
  isAdmin,
}: {
  entries: WorkEntry[];
  isAdmin: boolean;
}) {
  return (
    <section className="rounded-md border border-line bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-bold">
          {isAdmin ? 'All staff work history' : 'Your work history'}
        </h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => downloadCsv(entries)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2 font-bold text-forest transition hover:border-forest"
          >
            <Download size={18} />
            Export CSV
          </button>
        )}
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
            {entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-4 font-semibold">
                  {formatDate(entry.work_date)}
                </td>
                {isAdmin && (
                  <td className="whitespace-nowrap px-5 py-4">
                    {entry.profiles?.full_name ?? 'Staff'}
                  </td>
                )}
                <td className="px-5 py-4">{entry.client_name}</td>
                <td className="min-w-64 px-5 py-4">{entry.task}</td>
                <td className="px-5 py-4">{entry.hours}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
                    {statusLabels[entry.status]}
                  </span>
                </td>
                <td className="min-w-56 px-5 py-4 text-ink/68">{entry.remarks}</td>
              </tr>
            ))}
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

function Dashboard({ session, profile }: { session: Session; profile: StaffProfile }) {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = profile.role === 'admin';

  async function loadEntries() {
    setLoading(true);
    setError('');

    const { data, error: queryError } = await supabase
      .from('work_entries')
      .select('*, profiles(full_name)')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setEntries((data ?? []) as WorkEntry[]);
    }

    setLoading(false);
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
        <SummaryCards entries={entries} isAdmin={isAdmin} />
        {!isAdmin && <EntryFormCard onSaved={loadEntries} />}
        {error && (
          <p className="rounded-md border border-line bg-white p-4 font-semibold text-ink/70">
            {error}
          </p>
        )}
        {loading ? (
          <p className="rounded-md border border-line bg-white p-5 font-semibold text-ink/70">
            Loading work entries...
          </p>
        ) : (
          <EntriesTable entries={entries} isAdmin={isAdmin} />
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
