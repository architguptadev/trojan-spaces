"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  MapPin,
  Users,
  Clock,
  SlidersHorizontal,
  LayoutGrid,
  Map as MapIcon,
  Bell,
  Plus,
  X,
  Check,
  ChevronDown,
  Sparkles,
  ArrowUp,
  Bookmark,
  RefreshCw,
  ExternalLink,
  Leaf,
  CalendarDays,
  ShieldCheck,
  Link as LinkIcon,
  Menu,
  LoaderCircle,
} from "lucide-react";
import { rooms, sourceLinks, type Room } from "@/lib/catalog";
import { time, type Request, type Member } from "@/lib/planner";
const CampusMap = dynamic(() => import("./CampusMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading campus map…</div>,
});
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
};
const initial: Request = {
  people: 4,
  duration: 60,
  earliest: 14,
  latest: 20,
  amenities: [],
  school: "usc",
  date: "",
};
async function api(action: string, data: object = {}) {
  const res = await fetch("/api/engine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Something went wrong");
  return body;
}
export default function Spaces() {
  const [tab, setTab] = useState("Discover");
  const [view, setView] = useState("grid");
  const [mode, setMode] = useState("demo");
  const [request, setRequest] = useState<Request>(initial);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("All spaces");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [selected, setSelected] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [member, setMember] = useState<Member>({
    name: "",
    start: 14,
    end: 20,
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [watches, setWatches] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [release, setRelease] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const load = async () => {
    const s = await api("state");
    setPlans(s.plans);
    setWatches(s.watches);
    setReleases(s.releases);
  };
  useEffect(() => {
    setRequest((r) => ({ ...r, date: tomorrow() }));
    load().catch((e) => setError(e.message));
    const id = new URLSearchParams(location.search).get("group");
    if (id) {
      api("group_read", { id })
        .then((g) => {
          setGroup(g);
          setMembers(g.members);
          setRequest((r) => ({ ...r, date: g.date }));
          setModal("group");
        })
        .catch((e) => setError(e.message));
    }
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[role="dialog"] button')?.focus(),
    );
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setConsent(false);
      }
      if (e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"] button:not(:disabled), [role="dialog"] input:not(:disabled), [role="dialog"] select:not(:disabled), [role="dialog"] a[href]',
          ),
        ).filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [modal]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const find = () =>
    run(async () => {
      const p = await api("plan", { request, members, mode });
      setPlan(p);
      setPlans((v) => [...v, p]);
      setModal("plan");
    });
  const selectRoom = useCallback((r: Room) => {
    setSelected(r);
    setModal("room");
  }, []);
  const shown = rooms.filter(
    (r) =>
      (filter === "All spaces" ||
        (filter === "Libraries" && r.school === "usc") ||
        (filter === "Marshall" && r.school === "marshall") ||
        (filter === "Viterbi" && r.school === "unverified")) &&
      `${r.name} ${r.building}`.toLowerCase().includes(query.toLowerCase()),
  );
  const close = () => {
    setModal(null);
    setConsent(false);
  };
  const update = (key: string, value: unknown) => {
    if (key === "date" && value !== request.date) {
      setMembers([]);
      setGroup(null);
    }
    setRequest((r) => ({ ...r, [key]: value }));
  };
  const watch = () =>
    run(async () => {
      await api("watch", { request, mode, consent });
      await load();
      close();
      setTab("Cancellation watch");
      setNotice("Demo watch saved. Alerts stay in this app.");
    });
  const join = () =>
    run(async () => {
      if (!member.name.trim()) throw new Error("Add your name first.");
      if (member.end <= member.start)
        throw new Error("End time must be after start time.");
      if (group) {
        const g = await api("group_join", { id: group.id, member });
        setGroup(g);
        setMembers(g.members);
      } else setMembers((v) => [...v, member]);
      setMember({ ...member, name: "" });
    });
  const createGroup = () =>
    run(async () => {
      const g = await api("group_create", {
        title: "Our next study session",
        date: request.date,
        members,
      });
      setGroup(g);
      setNotice(
        "Invite link created. Anyone with the link can see names and add availability.",
      );
    });
  const handoff = (room: Room, p?: any) =>
    run(async () => {
      if (p) {
        const updated = await api("handoff", { id: p.id, roomId: room.id });
        setPlan(updated);
        await load();
      }
      setNotice(
        "Continue in the official USC system. No reservation has been confirmed.",
      );
      window.open(room.url, "_blank", "noopener,noreferrer");
    });
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="Trojan Spaces home">
          <span className="brand-icon">
            t<span>↗</span>
          </span>
          <span>
            trojan<span className="brand-light">spaces</span>
            <small>MORE ROOM FOR WHAT MATTERS</small>
          </span>
        </a>
        <button
          className="mobile-close icon-btn"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <div className="campus-label">
          <span className="online-dot" /> UNIVERSITY PARK CAMPUS{" "}
          <ChevronDown size={13} />
        </div>
        <div className="nav-label">YOUR CAMPUS, CONNECTED</div>
        <nav>
          {[
            { name: "Discover", icon: Search },
            { name: "Group planner", icon: Users },
            { name: "My plans", icon: Bookmark },
            { name: "Cancellation watch", icon: Bell },
          ].map((n) => (
            <button
              key={n.name}
              className={`nav-item ${tab === n.name ? "active" : ""}`}
              onClick={() => {
                setTab(n.name);
                setMobileNav(false);
              }}
            >
              <n.icon size={19} />
              {n.name}
              {n.name === "Cancellation watch" && watches.length > 0 && (
                <span className="count">{watches.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="giveback">
            <span className="leaf-icon">
              <Leaf size={21} />
            </span>
            <h3>Plans changed?</h3>
            <p>
              Give your unused reservation
              <br />a second chance.
            </p>
            <button
              onClick={() => {
                setModal("release");
                setRelease(null);
              }}
            >
              Release a room <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="source-nav" onClick={() => setModal("sources")}>
            <ShieldCheck size={17} /> Data & campus policies{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <div className="avatar">T</div>
            <div>
              <b>Your study space</b>
              <small>Guest · private session</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn hamburger"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <b>{tab}</b>
          </div>
          <div className="top-actions">
            <button
              className={`mode-pill ${mode === "live" ? "live" : ""}`}
              onClick={() => {
                setMode(mode === "demo" ? "live" : "demo");
                setPlan(null);
                setNotice(
                  mode === "demo"
                    ? "Official directory mode: live availability is not connected."
                    : "Demo mode: all room details and openings are synthetic.",
                );
              }}
            >
              <span /> {mode === "demo" ? "Demo mode" : "Official directory"}{" "}
              <ChevronDown size={12} />
            </button>
            <button
              className="icon-btn notification"
              aria-label="Open alerts"
              onClick={() => setTab("Cancellation watch")}
            >
              <Bell size={19} />
              {watches.some((w) => w.status === "demo_opening") && <i />}
            </button>
          </div>
        </header>
        <div className="page-content">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {tab === "Discover" && (
            <>
              <section className="page-title">
                <div>
                  <div className="eyebrow">LESS SEARCHING. MORE STUDYING.</div>
                  <h1>
                    Find your room to <em>think.</em>
                  </h1>
                  <p>
                    A space for your next big idea. And everyone building it
                    with you.
                  </p>
                </div>
                <button
                  className="secondary group-top"
                  onClick={() => setModal("group")}
                >
                  <Users size={16} /> Plan with friends{" "}
                  <ArrowUpRight size={16} />
                </button>
              </section>
              <section className="ai-panel">
                <div className="ai-heading">
                  <span className="spark-icon">
                    <Sparkles size={19} />
                  </span>
                  <b>A little help finding your space</b>
                  <span className="ai-badge">SPACES ASSISTANT</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const result = await api("interpret", {
                        text,
                        date: request.date,
                      });
                      if (result.request.date !== request.date) {
                        setMembers([]);
                        setGroup(null);
                      }
                      setRequest({ ...result.request, school: request.school });
                      setNotice(`${result.engine}: ${result.notice}`);
                      setModal("filters");
                    });
                  }}
                >
                  <input
                    aria-label="Describe your ideal room"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="A room for 4 people with a whiteboard, tomorrow from 2 to 5 pm…"
                    required
                    minLength={3}
                    maxLength={1200}
                  />
                  <button aria-label="Interpret room request" disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spin" size={20} />
                    ) : (
                      <ArrowUp size={20} />
                    )}
                  </button>
                </form>
                <div className="prompts">
                  <span>TRY ASKING</span>
                  {[
                    "4 people, whiteboard, 2 to 5 pm",
                    "A screen for 6 people, after 3 pm",
                  ].map((s) => (
                    <button key={s} onClick={() => setText(s)}>
                      {s} <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </section>
              <section className="search-bar">
                <label>
                  <CalendarDays size={18} />
                  <div>
                    <small>WHEN</small>
                    <input
                      type="date"
                      value={request.date}
                      onChange={(e) => update("date", e.target.value)}
                      aria-label="Study date"
                    />
                  </div>
                </label>
                <button onClick={() => setModal("filters")}>
                  <Clock size={18} />
                  <div>
                    <small>TIME</small>
                    <b>
                      {time(request.earliest)} – {time(request.latest)}
                    </b>
                  </div>
                  <ChevronDown size={13} />
                </button>
                <button onClick={() => setModal("group")}>
                  <Users size={18} />
                  <div>
                    <small>GROUP SIZE</small>
                    <b>{request.people} people</b>
                  </div>
                  <ChevronDown size={13} />
                </button>
                <button
                  className="filter-button"
                  onClick={() => setModal("filters")}
                >
                  <SlidersHorizontal size={17} /> Filters
                  {request.amenities.length > 0 &&
                    ` (${request.amenities.length})`}
                </button>
                <button
                  className="primary search-submit"
                  onClick={find}
                  disabled={busy}
                >
                  Find a space <ArrowRight size={17} />
                </button>
              </section>
              <section className="results-heading">
                <div>
                  <h2>
                    A good place to start<span>{shown.length} spaces</span>
                  </h2>
                  <p>
                    {mode === "demo"
                      ? "Explore illustrative rooms in real USC buildings."
                      : "USC building directory · availability requires official verification."}
                  </p>
                </div>
                <div className="view-toggle">
                  <button
                    className={view === "grid" ? "selected" : ""}
                    aria-label="Grid view"
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid size={15} /> Grid
                  </button>
                  <button
                    className={view === "map" ? "selected" : ""}
                    aria-label="Map view"
                    onClick={() => setView("map")}
                  >
                    <MapIcon size={15} /> Map
                  </button>
                </div>
              </section>
              <div className="category-row">
                <div className="categories">
                  {["All spaces", "Libraries", "Marshall", "Viterbi"].map(
                    (f) => (
                      <button
                        key={f}
                        className={filter === f ? "selected" : ""}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
                <span className="data-note">
                  <span />{" "}
                  {mode === "demo"
                    ? "Synthetic room data"
                    : "Live availability not connected"}
                </span>
              </div>
              <div className="room-search">
                <Search size={16} />
                <input
                  aria-label="Search buildings"
                  placeholder="Search a building or space"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span>University Park, Los Angeles</span>
              </div>
              {view === "map" ? (
                <>
                  <CampusMap rooms={shown} onSelect={selectRoom} />
                  <p className="footnote">
                    Pins show approximate building locations. Room capacities,
                    amenities and walking times are illustrative.
                  </p>
                </>
              ) : (
                <div className="room-grid">
                  {shown.map((room, i) => (
                    <article className="room-card" key={room.id}>
                      <button
                        className="room-photo"
                        onClick={() => selectRoom(room)}
                        aria-label={`View ${room.building}`}
                        style={{
                          backgroundColor: room.color,
                          backgroundImage: `url(https://images.unsplash.com/${room.image}?auto=format&fit=crop&w=900&q=85)`,
                        }}
                      >
                        <span
                          className={`room-status ${room.school === "unverified" ? "muted" : ""}`}
                        >
                          <span />
                          {room.school === "unverified"
                            ? "Verify with department"
                            : mode === "demo"
                              ? "Demo · sample opening"
                              : "Check official system"}
                        </span>
                        <span className="photo-label">ILLUSTRATIVE PHOTO</span>
                        <span className="photo-arrow">
                          <ArrowUpRight size={20} />
                        </span>
                      </button>
                      <div className="room-body">
                        <div className="room-building">
                          {room.building}
                          <span>
                            {room.school === "marshall"
                              ? "MARSHALL ONLY"
                              : room.school === "unverified"
                                ? "POLICY UNVERIFIED"
                                : "USC STUDENTS"}
                          </span>
                        </div>
                        <button
                          className="room-title"
                          onClick={() => selectRoom(room)}
                        >
                          {room.name}
                        </button>
                        <div className="room-meta">
                          <span>
                            <Users size={14} /> Up to {room.capacity}
                          </span>
                          <span>
                            <MapPin size={14} /> {room.minutes} min walk*
                          </span>
                        </div>
                        <div className="amenities">
                          {room.amenities.map((a) => (
                            <span key={a}>{a}</span>
                          ))}
                        </div>
                        <div className="card-footer">
                          <span>{room.area}</span>
                          <button
                            onClick={() => selectRoom(room)}
                            aria-label={`Explore ${room.building}`}
                          >
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {shown.length === 0 && (
                <div className="empty">
                  <Search />
                  <h3>No spaces found</h3>
                  <p>Try another building or category.</p>
                </div>
              )}
              <section className="bottom-banner">
                <div className="banner-symbol">↗</div>
                <div>
                  <h3>Good spaces deserve to be used.</h3>
                  <p>
                    Can’t make your reservation? Help another Trojan find their
                    focus.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRelease(null);
                    setModal("release");
                  }}
                >
                  Make room for someone <ArrowUpRight size={16} />
                </button>
              </section>
            </>
          )}
          {tab === "Group planner" && (
            <>
              <PageHeading
                eyebrow="BETTER TOGETHER"
                title="Get everyone in the room."
                text="Collect availability. Find the overlap. Let the planner do the juggling."
              />
              <div className="workspace-grid">
                <section className="white-panel">
                  <h2>
                    Your study crew{" "}
                    <span className="pill">{members.length} joined</span>
                  </h2>
                  <p>Availability is for {request.date}, in Pacific Time.</p>
                  <MemberList members={members} />
                  <button
                    className="secondary"
                    onClick={() => setModal("group")}
                  >
                    <Plus size={16} /> Add availability or invite friends
                  </button>
                  <hr />
                  <button className="primary" onClick={find} disabled={busy}>
                    Find our best fit <Sparkles size={16} />
                  </button>
                </section>
                <section className="green-panel">
                  <Users size={29} />
                  <h2>
                    One time.
                    <br />
                    Everyone’s in.
                  </h2>
                  <p>
                    We only suggest a session when every group member is free
                    for the entire duration.
                  </p>
                  <button
                    className="light-button"
                    onClick={() => setModal("filters")}
                  >
                    Set session constraints <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "My plans" && (
            <>
              <PageHeading
                eyebrow="A LITTLE LESS COORDINATION"
                title="Room for your plans."
                text="Your saved requests and the decisions behind them."
              />
              {plans.length === 0 ? (
                <Empty
                  icon={<Bookmark />}
                  title="Your next session starts here."
                  text="Find a space to save your first plan."
                  action={() => setTab("Discover")}
                  label="Discover spaces"
                />
              ) : (
                <div className="stack">
                  {[...plans].reverse().map((p) => (
                    <div className="saved-card" key={p.id}>
                      <div className="saved-icon">
                        <CalendarDays />
                      </div>
                      <div>
                        <h3>
                          {p.request.people} people · {p.request.duration}{" "}
                          minutes
                        </h3>
                        <p>
                          {p.request.date} · {time(p.request.earliest)} –{" "}
                          {time(p.request.latest)} PT
                        </p>
                        <span className="pill">
                          {p.mode === "demo" ? "DEMO · " : ""}
                          {p.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setPlan(p);
                          setModal("plan");
                        }}
                      >
                        View plan <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "Cancellation watch" && (
            <>
              <PageHeading
                eyebrow="SECOND CHANCES, FIRST IN LINE"
                title="Let a room come to you."
                text="Opt in to in-app opening alerts. No polling of USC systems is enabled."
              />
              <div className="watch-banner">
                <Bell size={23} />
                <div>
                  <b>Your next opening could be someone’s changed plans.</b>
                  <p>
                    Demo watches use synthetic events. Official calendars always
                    have the final say.
                  </p>
                </div>
                <button className="primary" onClick={() => setModal("watch")}>
                  Create a watch <Plus size={16} />
                </button>
              </div>
              {watches.length === 0 ? (
                <Empty
                  icon={<Bell />}
                  title="Nothing on your radar. Yet."
                  text="Create a watch for your current room and time preferences."
                  action={() => setModal("watch")}
                  label="Set up a watch"
                />
              ) : (
                <div className="stack">
                  {watches.map((w) => (
                    <div className="saved-card" key={w.id}>
                      <div className="saved-icon">
                        <Bell />
                      </div>
                      <div>
                        <h3>
                          {w.request.people} people · {w.request.date}
                        </h3>
                        <p>{w.notice}</p>
                        <span className="pill">
                          {w.status === "demo_opening"
                            ? "DEMO OPENING"
                            : "DEMO · WATCHING"}
                        </span>
                      </div>
                      <button
                        className="secondary"
                        onClick={() =>
                          run(async () => {
                            await api("watch_check", { id: w.id });
                            await load();
                          })
                        }
                      >
                        Simulate opening
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Delete watch"
                        onClick={() =>
                          run(async () => {
                            await api("delete_watch", { id: w.id });
                            await load();
                          })
                        }
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <footer>
            <span className="footer-brand">
              trojan spaces <span>↗</span>
            </span>
            <span>Made for Trojans. Built for possibility.</span>
            <button onClick={() => setModal("sources")}>
              Independent student prototype · Policies & data{" "}
              <ArrowUpRight size={12} />
            </button>
          </footer>
        </div>
      </main>
      {modal && (
        <div className="modal-overlay" onClick={close}>
          <section
            className={`modal ${modal === "plan" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "filters"
                ? "Session constraints"
                : modal === "plan"
                  ? "Your room plan"
                  : modal === "group"
                    ? "Group availability"
                    : modal === "room"
                      ? "Room details"
                      : modal === "release"
                        ? "Release a room"
                        : modal === "watch"
                          ? "Create a watch"
                          : "Policies and data"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              aria-label="Close dialog"
              onClick={close}
            >
              <X size={20} />
            </button>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {modal === "filters" && (
              <>
                <div className="eyebrow">MAKE IT YOURS</div>
                <h2>Your ideal study session.</h2>
                <p>
                  All times are Pacific. Library booking limits still apply in
                  the official system.
                </p>
                <div className="form-grid">
                  <label>
                    Date
                    <input
                      type="date"
                      value={request.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </label>
                  <label>
                    People
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={request.people}
                      onChange={(e) => update("people", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Earliest start
                    <TimeSelect
                      value={request.earliest}
                      onChange={(v) => update("earliest", v)}
                    />
                  </label>
                  <label>
                    Latest end
                    <TimeSelect
                      value={request.latest}
                      onChange={(v) => update("latest", v)}
                    />
                  </label>
                  <label>
                    Session length
                    <select
                      value={request.duration}
                      onChange={(e) =>
                        update("duration", Number(e.target.value))
                      }
                    >
                      {[30, 60, 90, 120].map((n) => (
                        <option key={n} value={n}>
                          {n} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Your eligibility
                    <select
                      value={request.school}
                      onChange={(e) => update("school", e.target.value)}
                    >
                      <option value="usc">Current USC student</option>
                      <option value="marshall">Current Marshall student</option>
                    </select>
                  </label>
                </div>
                <label className="field-label">Must-have amenities</label>
                <div className="amenity-select">
                  {["Whiteboard", "Display", "Outlets", "Natural light"].map(
                    (a) => (
                      <button
                        key={a}
                        className={
                          request.amenities.includes(a as any) ? "selected" : ""
                        }
                        onClick={() =>
                          update(
                            "amenities",
                            request.amenities.includes(a as any)
                              ? request.amenities.filter((x) => x !== a)
                              : [...request.amenities, a],
                          )
                        }
                      >
                        {request.amenities.includes(a as any) && (
                          <Check size={13} />
                        )}{" "}
                        {a}
                      </button>
                    ),
                  )}
                </div>
                <button className="primary full" onClick={find} disabled={busy}>
                  Find a space <ArrowRight size={17} />
                </button>
              </>
            )}
            {modal === "group" && (
              <>
                <div className="eyebrow">BRING YOUR PEOPLE</div>
                <h2>A time that works for everyone.</h2>
                <p>
                  For {request.date} · Pacific Time. Share names and time
                  windows only. Anyone with your invite link can view the group.
                </p>
                <MemberList members={members} />
                <div className="form-grid">
                  <label className="span2">
                    Your name
                    <input
                      maxLength={35}
                      placeholder="e.g. Alex"
                      value={member.name}
                      onChange={(e) =>
                        setMember({ ...member, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Free from
                    <TimeSelect
                      value={member.start}
                      onChange={(v) => setMember({ ...member, start: v })}
                    />
                  </label>
                  <label>
                    Until
                    <TimeSelect
                      value={member.end}
                      onChange={(v) => setMember({ ...member, end: v })}
                    />
                  </label>
                </div>
                <button className="primary full" disabled={busy} onClick={join}>
                  <Plus size={16} /> Add availability
                </button>
                <div className="invite-area">
                  {group ? (
                    <>
                      <label>
                        Invite link
                        <input
                          readOnly
                          aria-label="Group invite link"
                          value={
                            typeof window !== "undefined"
                              ? `${location.origin}/?group=${group.id}`
                              : ""
                          }
                        />
                      </label>
                      <div className="button-row">
                        <button
                          className="secondary"
                          onClick={() =>
                            run(async () => {
                              await navigator.clipboard.writeText(
                                `${location.origin}/?group=${group.id}`,
                              );
                              setCopied(true);
                            })
                          }
                        >
                          <LinkIcon size={15} />
                          {copied ? "Copied" : "Copy link"}
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            run(async () => {
                              const g = await api("group_read", {
                                id: group.id,
                              });
                              setGroup(g);
                              setMembers(g.members);
                            })
                          }
                        >
                          <RefreshCw size={15} /> Refresh crew
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="secondary full"
                      onClick={createGroup}
                      disabled={busy}
                    >
                      <LinkIcon size={16} /> Create a shareable group
                    </button>
                  )}
                </div>
                <button
                  className="text-link"
                  onClick={() => {
                    close();
                    setTab("Group planner");
                  }}
                >
                  Continue to group planner <ArrowRight size={15} />
                </button>
              </>
            )}
            {modal === "room" && selected && (
              <>
                <div
                  className="detail-photo"
                  style={{
                    backgroundImage: `url(https://images.unsplash.com/${selected.image}?auto=format&fit=crop&w=1000&q=85)`,
                  }}
                >
                  <span>ILLUSTRATIVE PHOTO · SYNTHETIC ROOM DETAILS</span>
                </div>
                <div className="eyebrow">{selected.building}</div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.area} · Up to {selected.capacity} people ·{" "}
                  {selected.minutes} min illustrative walk
                </p>
                <div className="amenities">
                  {selected.amenities.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
                <div className="policy-box">
                  <ShieldCheck size={20} />
                  <div>
                    <b>
                      {selected.school === "marshall"
                        ? "Marshall access required"
                        : selected.school === "unverified"
                          ? "Department verification required"
                          : "Current USC students only"}
                    </b>
                    <p>
                      {selected.school === "usc"
                        ? "LibCal: reserve up to 7 days ahead, at most 2 hours per day. Leavey requires email confirmation within 30 minutes."
                        : selected.school === "marshall"
                          ? "Use your Marshall login in EMS. Room-specific permissions and limits apply."
                          : "We have not verified public reservation rules for these spaces. Ask the department before planning around a pod."}
                    </p>
                  </div>
                </div>
                <p className="footnote">
                  Room IDs, capacities, amenities, photos, and availability are
                  synthetic. Building and official system references are real.
                  No reservation is held.
                </p>
                <button
                  className="primary full"
                  onClick={() => handoff(selected)}
                  disabled={busy}
                >
                  Check official{" "}
                  {selected.school === "usc"
                    ? "LibCal"
                    : selected.school === "marshall"
                      ? "booking information"
                      : "department website"}{" "}
                  <ExternalLink size={16} />
                </button>
                <button className="text-link" onClick={() => setModal("watch")}>
                  Watch for a demo opening <Bell size={14} />
                </button>
              </>
            )}
            {modal === "plan" && plan && (
              <>
                <div className="eyebrow">
                  {plan.mode === "demo"
                    ? "DEMO · SYNTHETIC OPTIONS"
                    : "OFFICIAL DIRECTORY"}
                </div>
                <h2>
                  {plan.status === "replanned"
                    ? "A change of plans. Still a great fit."
                    : "Your people. Your next space."}
                </h2>
                <p>
                  {plan.request.date} · {plan.request.people} people ·{" "}
                  {plan.request.duration} min · {plan.members.length}{" "}
                  availability responses
                </p>
                <div className="plan-options">
                  {plan.matches.map((m: any, i: number) => {
                    const r = rooms.find((x) => x.id === m.roomId)!;
                    return (
                      <div className="plan-option" key={m.roomId}>
                        <span className="rank">0{i + 1}</span>
                        <div>
                          <span className="eyebrow">
                            {i === 0 ? "BEST FEASIBLE FIT" : "ALTERNATIVE"}
                          </span>
                          <h3>{r.building}</h3>
                          <b>
                            {time(m.start)} – {time(m.end)} PT
                          </b>
                          <p>{m.reason}</p>
                          <span className="pill">
                            Synthetic availability · not held
                          </span>
                        </div>
                        <button
                          className="primary"
                          onClick={() => handoff(r, plan)}
                          disabled={busy}
                        >
                          Official booking <ExternalLink size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {plan.matches.length === 0 && (
                  <div className="empty">
                    <Search />
                    <h3>
                      {plan.mode === "live"
                        ? "Live availability is not connected."
                        : "No feasible room remains."}
                    </h3>
                    <p>
                      {plan.mode === "live"
                        ? "Use official systems to verify a room and time."
                        : "Try a wider time window, fewer amenities, or a smaller group."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setModal("filters")}
                    >
                      Adjust constraints
                    </button>
                    {plan.mode === "live" && (
                      <a
                        className="text-link"
                        href="https://libcal.usc.edu/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open USC LibCal <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}
                <div className="agent-log">
                  <b>
                    <Sparkles size={15} /> Agent activity
                  </b>
                  {plan.events.map((e: any, i: number) => (
                    <p key={i}>
                      <span className="log-dot" />
                      {e.text}
                    </p>
                  ))}
                </div>
                {plan.mode === "demo" && plan.matches.length > 0 && (
                  <button
                    className="secondary full"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const p = await api("replan", { id: plan.id });
                        setPlan(p);
                        await load();
                      })
                    }
                  >
                    <RefreshCw size={16} /> Simulate best room becoming
                    unavailable
                  </button>
                )}
                <p className="footnote">
                  A booking is only complete in USC’s official system, subject
                  to eligibility, limits and required confirmation. Trojan
                  Spaces never marks a handoff as booked.
                </p>
              </>
            )}
            {modal === "watch" && (
              <>
                <div className="eyebrow">GOOD THINGS OPEN UP</div>
                <h2>Keep an eye out.</h2>
                <p>
                  Watch for {request.people} people on {request.date},{" "}
                  {time(request.earliest)}–{time(request.latest)} PT.
                </p>
                <div className="policy-box">
                  <Bell size={22} />
                  <div>
                    <b>Demo · in-app alerts</b>
                    <p>
                      Openings are simulated. No polling, email, push
                      notifications, or background alerts are connected to USC.
                    </p>
                  </div>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I want synthetic opening alerts in this app. I can delete
                    this watch at any time.
                  </span>
                </label>
                <button
                  className="primary full"
                  disabled={!consent || busy || mode !== "demo"}
                  onClick={watch}
                >
                  Create demo watch <Bell size={16} />
                </button>
                {mode !== "demo" && (
                  <p className="footnote">
                    An authorized provider is required for live watches. Switch
                    to demo mode to try the workflow.
                  </p>
                )}
              </>
            )}
            {modal === "release" && (
              <>
                <div className="eyebrow">MAKE EVERY ROOM COUNT</div>
                <h2>Changed plans. New possibilities.</h2>
                <p>
                  Release a reservation through the official system. Nobody
                  inherits or transfers your booking.
                </p>
                <div className="release-steps">
                  {[
                    "Cancel in the official system",
                    "Confirm your cancellation",
                    "Verify availability before alerts",
                  ].map((s, i) => (
                    <div key={s}>
                      <span>{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>
                {!release ? (
                  <>
                    <label className="field-label">
                      Try the demo workflow
                      <select
                        onChange={(e) =>
                          setSelected(
                            rooms.find((r) => r.id === e.target.value) ||
                              rooms[0],
                          )
                        }
                        value={selected?.id || rooms[0].id}
                      >
                        {rooms
                          .filter((r) => r.school === "usc")
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.building} · {r.area}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="primary full"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const r = await api("release", {
                            roomId:
                              selected?.school === "usc"
                                ? selected.id
                                : rooms[0].id,
                          });
                          setRelease(r);
                        })
                      }
                    >
                      Start demo release <ArrowRight size={16} />
                    </button>
                    {releases.length > 0 && (
                      <div className="release-history">
                        <b>Previous demo releases</b>
                        {releases.slice(-3).map((r) => (
                          <button
                            key={r.id}
                            className="text-link"
                            onClick={() => setRelease(r)}
                          >
                            {rooms.find((x) => x.id === r.roomId)?.building} ·{" "}
                            {r.status.replaceAll("_", " ")}{" "}
                            <ArrowRight size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="policy-box">
                      <ShieldCheck size={22} />
                      <div>
                        <b>{release.status.replaceAll("_", " ")}</b>
                        <p>
                          {release.notice ||
                            "A user statement does not prove that an opening is available. No live availability alerts will be issued."}
                        </p>
                      </div>
                    </div>
                    {release.status === "awaiting_official_cancellation" && (
                      <>
                        <a
                          className="secondary full"
                          href="https://libcal.usc.edu/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open official system to cancel{" "}
                          <ExternalLink size={15} />
                        </a>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          <span>
                            For this demo, I confirm the official cancellation
                            step is complete.
                          </span>
                        </label>
                        <button
                          className="primary full"
                          disabled={!consent || busy}
                          onClick={() =>
                            run(async () => {
                              setRelease(
                                await api("release_cancelled", {
                                  id: release.id,
                                  attest: consent,
                                }),
                              );
                              setConsent(false);
                              await load();
                            })
                          }
                        >
                          Record cancellation step
                        </button>
                      </>
                    )}
                    {release.status ===
                      "awaiting_availability_verification" && (
                      <button
                        className="primary full"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            setRelease(
                              await api("release_verify", { id: release.id }),
                            );
                            await load();
                          })
                        }
                      >
                        Simulate provider availability check{" "}
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </>
                )}
                <p className="footnote">
                  This is a demonstration. It cannot cancel, transfer, or
                  release a real reservation.
                </p>
              </>
            )}
            {modal === "sources" && (
              <>
                <div className="eyebrow">TRUST IS PART OF THE DESIGN</div>
                <h2>Real policies. Honest availability.</h2>
                <p>
                  Independent student prototype. Not affiliated with or endorsed
                  by USC. Sources reviewed November 14, 2026.
                </p>
                <div className="policy-box">
                  <ShieldCheck size={23} />
                  <div>
                    <b>What is verified?</b>
                    <p>
                      Official reservation systems and general eligibility.
                      Room-level details, photos, walking times and all
                      availability in this demo are illustrative.
                    </p>
                  </div>
                </div>
                <div className="source-list">
                  {sourceLinks.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.title}
                      <ExternalLink size={16} />
                    </a>
                  ))}
                </div>
                <p>
                  Viterbi reservation rules are unverified. No live feed or
                  booking API is connected. You always finish reservations in
                  the official system.
                </p>
                <p className="footnote">
                  Your random session cookie owns your saved plans. Group links
                  grant access to names and time windows. With Gemini
                  configured, only your room request text and selected date are
                  sent to Google; don’t include personal information.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty">
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={action}>
        {label}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="member-list">
      {members.length === 0 ? (
        <p className="footnote">
          No availability added yet. Add yours to get started.
        </p>
      ) : (
        members.map((m, i) => (
          <div key={i}>
            <span className="member-avatar">
              {m.name.slice(0, 1).toUpperCase()}
            </span>
            <b>{m.name}</b>
            <span>
              {time(m.start)}–{time(m.end)}
            </span>
            <Check size={15} />
          </div>
        ))
      )}
    </div>
  );
}
function TimeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: 31 }, (_, i) => 8 + i * 0.5).map((n) => (
        <option key={n} value={n}>
          {time(n)}
        </option>
      ))}
    </select>
  );
}
