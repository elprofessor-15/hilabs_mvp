"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity, CalendarClock, ChartNoAxesCombined, ClipboardCheck, Command, Database,
  HeartPulse, LayoutDashboard, ListChecks, Search, ShieldCheck, Sparkles, Stethoscope, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BACKGROUND_CASES, HERO_CASES } from "@/data/seed";
import { SCENARIO_LABEL } from "@/config/workbench";
import { getQueueMetrics } from "@/lib/engines";
import { useWorkbenchStore } from "@/lib/store";

const navigation = [
  { href: "/queue", label: "Work Queue", icon: LayoutDashboard },
  { href: "/member/P1", label: "Member 360", icon: HeartPulse },
  { href: "/outreach/P1", label: "Outreach", icon: Activity },
  { href: "/documentation/P1", label: "Documentation", icon: ClipboardCheck },
  { href: "/impact", label: "Impact", icon: ChartNoAxesCombined },
  { href: "/data", label: "Data & Sources", icon: Database },
  { href: "/scope", label: "Scope", icon: ShieldCheck },
];

const tourSteps = [
  { title: "1. Start with the work queue", route: "/queue", member: "P1", body: "Deadlines stay visible. A transparent score, evidence and next action help Maria decide whom to work on." },
  { title: "2. Review one member picture", route: "/member/P1", member: "P1", body: "Event time and received time stay separate. Conflicts are surfaced for nurse review, not silently resolved." },
  { title: "3. Use a different outreach route", route: "/outreach/P3", member: "P3", body: "After repeated failed attempts, use a documented partner route rather than repeating an unverified call." },
  { title: "4. Review the safety workflow", route: "/member/P4", member: "P4", body: "An unreviewed safety screening item is escalated for licensed clinician review. The prototype does not assess risk." },
];
const queueMetrics = getQueueMetrics([...HERO_CASES, ...BACKGROUND_CASES]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [clean, setClean] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    const handleStorageError = () => setStorageWarning(true);
    window.addEventListener("workbench:storage-error", handleStorageError);
    void useWorkbenchStore.persist.rehydrate();
    return () => window.removeEventListener("workbench:storage-error", handleStorageError);
  }, []);

  useEffect(() => {
    setClean(new URLSearchParams(window.location.search).get("clean") === "1");
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setTourOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pathname]);

  const filteredMembers = useMemo(() => HERO_CASES.filter((member) => `${member.name} ${member.id} ${member.program}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const tour = tourSteps[tourIndex];

  function goToTourStep(index: number) {
    const next = tourSteps[index];
    if (!next) return;
    setTourIndex(index);
    router.push(next.route);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/queue" className="brand-lockup" aria-label="HiLabs Care Workbench home">
          <div className="brand-mark"><Stethoscope size={18} color="white" /></div>
          <div><div className="brand-name">HiLabs Care</div><div className="brand-caption">Workbench</div></div>
        </Link>
        <div className="nav-label">Case management</div>
        <nav className="nav-list">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-label={label} aria-current={active ? "page" : undefined} title={label}>
                <Icon size={16} aria-hidden="true" /><span>{label}</span>
                {label === "Work Queue" && <span className="nav-count">{queueMetrics.dueToday}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="nurse-card">
            <div className="avatar">MC</div>
            <div><div className="nurse-name">Maria Chen, RN</div><div className="nurse-role">Case manager</div></div>
          </div>
        </div>
      </aside>
      <div className="shell-content">
        <header className="topbar">
          <div className="clock-label"><CalendarClock size={15} /><span>{SCENARIO_LABEL}</span></div>
          <button className="topbar-search" onClick={() => setSearchOpen(true)} aria-label="Search members, open command palette">
            <Search size={15} /><span className="search-placeholder">Search members or open a view</span><kbd className="kbd">⌘ K</kbd>
          </button>
          <span className="caseload-chip"><ListChecks size={14} /><span>{queueMetrics.totalCases} active · {queueMetrics.newAlerts} new</span></span>
          <button className="topbar-action" onClick={() => { setTourIndex(0); setTourOpen(true); }} aria-label="Start guided walkthrough">
            <Sparkles size={14} /><span>Walkthrough</span>
          </button>
        </header>
        {!clean && <div className="synthetic-banner"><ShieldCheck size={12} /> Synthetic data. No real PHI.</div>}
        {storageWarning && <div className="synthetic-banner storage-warning" role="alert">Session storage is unavailable. Changes remain in this tab and may not survive a reload.</div>}
        {children}
      </div>

      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog" aria-describedby="search-description" onOpenAutoFocus={(event) => event.preventDefault()}>
            <div className="section-header">
              <div><Dialog.Title className="dialog-title">Find a member or view</Dialog.Title><Dialog.Description id="search-description" className="dialog-description">Search the five detailed synthetic patient records.</Dialog.Description></div>
              <Dialog.Close asChild><button className="icon-button" aria-label="Close search"><X size={16} /></button></Dialog.Close>
            </div>
            <label className="field">
              <span className="field-label">Search</span>
              <input autoFocus className="input" placeholder="Name, member ID or program" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="section-spacer">
              {filteredMembers.length ? filteredMembers.map((member) => (
                <Link key={member.id} href={`/member/${member.id}`} className="fact-row" onClick={() => setSearchOpen(false)}>
                  <div><div className="member-name">{member.name}</div><div className="member-meta">{member.id} · {member.program}</div></div>
                  <Search size={14} />
                </Link>
              )) : <div className="empty-state">No detailed synthetic member matches that search.</div>}
            </div>
            <div className="section-spacer">
              <div className="field-label">Views</div>
              <Link href="/queue" className="fact-row" onClick={() => setSearchOpen(false)}><span>Work queue</span><Command size={13} /></Link>
              <Link href="/data" className="fact-row" onClick={() => setSearchOpen(false)}><span>Data and sources</span><Database size={13} /></Link>
              <Link href="/gallery" className="fact-row" onClick={() => setSearchOpen(false)}><span>Component gallery</span><Sparkles size={13} /></Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={tourOpen} onOpenChange={setTourOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog" aria-describedby="tour-description">
            <div className="section-header">
              <div><div className="eyebrow">Guided walkthrough · {tourIndex + 1} of {tourSteps.length}</div><Dialog.Title className="dialog-title">{tour.title}</Dialog.Title></div>
              <Dialog.Close asChild><button className="icon-button" aria-label="Close walkthrough"><X size={16} /></button></Dialog.Close>
            </div>
            <Dialog.Description id="tour-description" className="dialog-description">{tour.body}</Dialog.Description>
            <div className="callout"><strong>Member {tour.member}</strong> · {HERO_CASES.find((member) => member.id === tour.member)?.name}. This guided view uses synthetic data only.</div>
            <div className="dialog-actions">
              <button className="button button-secondary" onClick={() => setTourOpen(false)}>Close</button>
              <button className="button button-secondary" onClick={() => goToTourStep((tourIndex + 1) % tourSteps.length)}>Go to view</button>
              <button className="button button-primary" onClick={() => { const next = (tourIndex + 1) % tourSteps.length; goToTourStep(next); }}>Next step</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
