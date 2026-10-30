import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle, TriangleAlert, Info, CircleCheck } from 'lucide-react';
import { cn } from '../../utils/format';
import { scoreBg, scoreColor, toDetScore } from '../../engines/scoring';

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'inverse' | 'inverse-outline';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 disabled:bg-brand-600/50',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/50',
  // For use on the green brand gradient.
  inverse: 'bg-white text-brand-700 hover:bg-brand-50',
  'inverse-outline': 'border border-white/40 text-white hover:bg-white/10',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary', size = 'md', loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant], sizes[size], className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------- Card ----------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950 dark:text-brand-400">{icon}</div>}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------- Badge ----------

type Tone = 'neutral' | 'brand' | 'amber' | 'rose' | 'sky' | 'violet';
const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
};

export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function KindBadge({ kind }: { kind: 'measured' | 'estimate' }) {
  return kind === 'measured'
    ? <Badge tone="sky" title="Calculated directly from the transcript and timer">Measured</Badge>
    : <Badge tone="violet" title="Heuristic estimate from rule-based analysis. Not an official score.">Estimate</Badge>;
}

// ---------- Score displays ----------

/** Shows a 0–100 Practice Score as an estimated DET-style score out of 160. */
export function DetScore({ score, className }: { score: number; className?: string }) {
  return <span className={cn('font-bold tabular-nums', scoreColor(score), className)}>{toDetScore(score)}</span>;
}

export function ScoreRing({ score, size = 120, label = 'Estimated score', stroke = 10 }: { score: number; size?: number; label?: string; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round"
          className={cn('fill-none transition-[stroke-dashoffset] duration-700', score >= 80 ? 'stroke-brand-500' : score >= 60 ? 'stroke-amber-500' : 'stroke-rose-500')}
          strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ height: size }}>
        <span className={cn('font-bold tabular-nums', size >= 100 ? 'text-3xl' : 'text-xl', scoreColor(score))}>{toDetScore(score)}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">/ 160</span>
      </div>
      {label && <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
    </div>
  );
}

export function ProgressBar({ value, className, colorByScore = true }: { value: number; className?: string; colorByScore?: boolean }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', colorByScore ? scoreBg(value) : 'bg-brand-500')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// ---------- Feedback states ----------

export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'error' | 'success'; title?: string; children?: ReactNode; className?: string }) {
  const map = {
    info: { cls: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100', Icon: Info },
    warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100', Icon: TriangleAlert },
    error: { cls: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100', Icon: TriangleAlert },
    success: { cls: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100', Icon: CircleCheck },
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-3 text-sm', map.cls, className)}>
      <map.Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{icon}</div>
      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <LoaderCircle className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

// ---------- Dialog ----------

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel,
}: { open: boolean; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}

// ---------- Form controls ----------

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cn('inline-flex flex-wrap rounded-xl bg-slate-100 p-1 dark:bg-slate-800', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            value === o.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 block h-6 w-11 shrink-0 rounded-full p-0 transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700')}
      >
        <span className={cn('absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </label>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode }) {
  return (
    <Card className="flex items-start gap-4">
      <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950 dark:text-brand-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
