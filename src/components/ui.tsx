import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-300",
  accent: "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300",
  subtle: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed",
    buttonVariants[variant],
    extra,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-200", className)}>
      <div
        className="h-full rounded-full bg-indigo-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-center">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && <div className="mb-2 text-sm text-zinc-500">{breadcrumb}</div>}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
