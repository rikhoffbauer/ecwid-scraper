import type { ReactNode } from "react";

export function Icon({ name }: { name: "catalogue" | "intelligence" | "activity" | "sources" | "settings" | "assistant" | "details" | "search" | "share" | "sync" | "close" }) {
  const paths: Record<typeof name, ReactNode> = {
    catalogue: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></>,
    intelligence: <><path d="M4 18V9"/><path d="M10 18V5"/><path d="M16 18v-7"/><path d="M3 18h18"/></>,
    activity: <path d="M3 12h4l2-7 5 14 3-7h4"/>,
    sources: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 9m5-9-3 9M8 6h8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1-2-4-2 1a8 8 0 0 0-2-1l-.3-2h-5l-.3 2a8 8 0 0 0-2 1l-2-1-2 4 2 1a7 7 0 0 0 0 2l-2 1 2 4 2-1a8 8 0 0 0 2 1l.3 2h5l.3-2a8 8 0 0 0 2-1l2 1 2-4-2-1a7 7 0 0 0 .1-1Z"/></>,
    assistant: <><path d="M6 5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4 3v-3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"/><path d="M8 11h8m-8 3h5"/></>,
    details: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    share: <><rect x="3" y="5" width="18" height="13" rx="2"/><path d="m9 21 3-3 3 3"/></>,
    sync: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 0 0-15-2M4 17h5v5"/><path d="M4 17a9 9 0 0 0 15 2"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function RailButton(props: { label: string; active?: boolean; onClick: () => void; icon: Parameters<typeof Icon>[0]["name"] }) {
  return <button className={`rail-button ${props.active ? "active" : ""}`} title={props.label} aria-label={props.label} onClick={props.onClick}><Icon name={props.icon} /></button>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><h3>{title}</h3><p>{children}</p></div>;
}

export function formatRelativeTime(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
