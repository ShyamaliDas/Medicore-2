import { useState, useEffect, useMemo, useRef } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

// Tiny deterministic hash so each doctor always renders the same avatar hue
function hueForId(id) {
  if (!id) return 160;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatStamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}

export default function Chat() {
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [doctorsError, setDoctorsError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatStarted, setChatStarted] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  // Per-doctor history cache so switching threads doesn't lose prior messages
  const historyRef = useRef({});
  // Track unread previews per doctor for the left rail
  const [lastSeen, setLastSeen] = useState({}); // { doctorId: isoString }
  const [previews, setPreviews] = useState({}); // { doctorId: { text, time } }

  function loadDoctors() {
    setDoctorsError("");
    apiRequest(ENDPOINTS.doctors, { auth: true })
      .then((res) => { if (res.success) setDoctors(res.data ?? []); })
      .catch((err) => setDoctorsError(err.message || "Failed to load doctors."));
  }

  useEffect(() => { loadDoctors(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-load messages as soon as a doctor is selected
  useEffect(() => {
    if (!selectedDoctorId || !user?.userId) return;
    loadMessages(selectedDoctorId, user.userId);
    // mark as seen when opening
    setLastSeen((prev) => ({ ...prev, [selectedDoctorId]: new Date().toISOString() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, user?.userId]);

  // Poll for new messages every 5s while a chat is active
  useEffect(() => {
    if (!chatStarted || !selectedDoctorId || !user?.userId) return;

    const fetchMessages = async () => {
      try {
        const res = await apiRequest(
          ENDPOINTS.chatMessages(selectedDoctorId, user.userId),
          { auth: true }
        );
        if (res?.success) mergeMessages(res.data ?? []);
      } catch { /* silent */ }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStarted, selectedDoctorId, user?.userId]);

  async function loadMessages(doctorId, patientId) {
    setError("");
    setLoadingMessages(true);
    setChatStarted(false);
    clearInterval(pollRef.current);

    const cached = historyRef.current[doctorId];
    if (cached) {
      setMessages(cached);
      setChatStarted(true);
    } else {
      setMessages([]);
    }

    try {
      const res = await apiRequest(ENDPOINTS.chatMessages(doctorId, patientId), { auth: true });
      if (res?.success) {
        mergeMessages(res.data ?? []);
        setChatStarted(true);
      } else {
        setError(res?.message ?? "Failed to load messages.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingMessages(false);
    }
  }

  function mergeMessages(incoming) {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.messageId, m]));
      for (const msg of incoming) if (msg?.messageId != null) byId.set(msg.messageId, msg);
      const merged = Array.from(byId.values()).sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return ta - tb;
      });
      historyRef.current[selectedDoctorId] = merged;
      // Update previews + last-activity for the rail
      const last = merged[merged.length - 1];
      if (last) {
        setPreviews((p) => ({
          ...p,
          [selectedDoctorId]: { text: last.message, time: last.created_at },
        }));
      }
      return merged;
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedDoctorId || !user?.userId) return;

    setSending(true);
    setError("");

    try {
      const res = await apiRequest(ENDPOINTS.chatSend, {
        method: "POST",
        body: { doctorId: selectedDoctorId, patientId: user.userId, message: trimmed },
        auth: true,
      });
      if (res?.success) {
        setNewMessage("");
        if (res.data) mergeMessages([res.data]);
      } else {
        setError(res?.message ?? "Failed to send message.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.doctorId === selectedDoctorId);

  // Filter doctors by search and sort by latest preview
  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = doctors
      .filter((d) => !q || (d.name || "").toLowerCase().includes(q) || (d.specialization || "").toLowerCase().includes(q));
    return list.sort((a, b) => {
      const ta = new Date(previews[a.doctorId]?.time || 0).getTime();
      const tb = new Date(previews[b.doctorId]?.time || 0).getTime();
      return tb - ta;
    });
  }, [doctors, search, previews]);

  return (
    <>
      <Navbar />
      <div className="container chat-page">
        <div className="page-header">
          <div>
            <p className="section-eyebrow role-patient">Patient Portal</p>
            <h1 className="page-title">Chat Box</h1>
          </div>
          <div className="accent-line"></div>
        </div>

        <div className="messenger">
          {/* ── Left rail ── */}
          <aside className="messenger-rail">
            <div className="messenger-rail__top">
              <div className="messenger-avatar messenger-avatar--me" aria-hidden>
                {initialsOf(user?.name)}
              </div>
            </div>

            <div className="messenger-search">
              <span className="messenger-search__icon" aria-hidden>🔍</span>
              <input
                type="text"
                className="messenger-search__input"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {doctorsError && (
              <div className="messenger-error">
                <span>Couldn't load contacts.</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={loadDoctors}>Retry</button>
              </div>
            )}

            {/* People list = all available doctors */}
            <div className="messenger-section messenger-section--scroll">
              <h3 className="messenger-section__title">Doctors Available</h3>
              {filteredDoctors.length === 0 ? (
                <div className="messenger-empty">
                  {doctors.length === 0 ? "No doctors available." : "No matches."}
                </div>
              ) : (
                <ul className="messenger-list">
                  {filteredDoctors.map((doc) => {
                    const isActive = doc.doctorId === selectedDoctorId;
                    const preview = previews[doc.doctorId];
                    const seen = lastSeen[doc.doctorId];
                    const lastMine = preview?.time && seen && new Date(preview.time) <= new Date(seen);
                    return (
                      <li key={doc.doctorId}>
                        <button
                          type="button"
                          className={`messenger-contact ${isActive ? "messenger-contact--active" : ""}`}
                          onClick={() => { setSelectedDoctorId(doc.doctorId); setError(""); clearInterval(pollRef.current); }}
                        >
                          <div
                            className="messenger-avatar"
                            style={{ background: `hsl(${hueForId(doc.doctorId)}, 55%, 88%)`, color: `hsl(${hueForId(doc.doctorId)}, 45%, 30%)` }}
                            aria-hidden
                          >
                            {initialsOf(doc.name)}
                          </div>
                          <div className="messenger-contact__body">
                            <div className="messenger-contact__row">
                              <span className="messenger-contact__name">{doc.name}</span>
                              <span className="messenger-contact__time">
                                {preview?.time ? formatStamp(preview.time) : ""}
                              </span>
                            </div>
                            <div className="messenger-contact__row messenger-contact__row--sub">
                              <span className="messenger-contact__preview">
                                {preview?.text
                                  ? (preview.text.length > 32 ? preview.text.slice(0, 32) + "…" : preview.text)
                                  : (doc.specialization || "Tap to start chatting")}
                              </span>
                              {lastMine && <span className="messenger-contact__dot" aria-hidden>•</span>}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── Right pane: thread ── */}
          <section className="messenger-thread">
            {!selectedDoctorId ? (
              <div className="messenger-thread__empty">
                <div className="messenger-thread__empty-icon" aria-hidden>💬</div>
                <p className="messenger-thread__empty-text">
                  Select a doctor from the left to start a conversation.
                </p>
              </div>
            ) : (
              <>
                <header className="messenger-thread__header">
                  <div
                    className="messenger-avatar messenger-avatar--lg"
                    style={{ background: `hsl(${hueForId(selectedDoctorId)}, 55%, 88%)`, color: `hsl(${hueForId(selectedDoctorId)}, 45%, 30%)` }}
                    aria-hidden
                  >
                    {initialsOf(selectedDoctor?.name)}
                  </div>
                  <div className="messenger-thread__title">
                    <p className="messenger-thread__name">{selectedDoctor?.name ?? "Doctor"}</p>
                    <p className="messenger-thread__status">
                      {selectedDoctor?.specialization
                        ? `${selectedDoctor.specialization} • Online`
                        : "Online"}
                    </p>
                  </div>
                </header>

                {error && <div className="alert alert-error messenger-error-banner">{error}</div>}

                <div className="messenger-thread__body" role="log" aria-live="polite">
                  {chatStarted && messages.length === 0 && !loadingMessages && (
                    <div className="messenger-thread__empty-inline">
                      No messages yet. State your Problems
                    </div>
                  )}

                  {(() => {
                    // Render with day separators + grouped runs of same sender
                    const blocks = [];
                    let lastDay = null;
                    let i = 0;
                    while (i < messages.length) {
                      const m = messages[i];
                      const day = m.created_at ? new Date(m.created_at).toDateString() : "";
                      if (day && day !== lastDay) {
                        blocks.push(
                          <div key={`day-${i}-${day}`} className="messenger-day-sep">
                            <span>{dayLabel(m.created_at)}</span>
                          </div>
                        );
                        lastDay = day;
                      }
                      // Collect a run of same-sender messages
                      const run = [m];
                      const runAuthor = m.senderId || m.patientId;
                      while (
                        i + run.length < messages.length &&
                        (messages[i + run.length].senderId || messages[i + run.length].patientId) === runAuthor &&
                        new Date(messages[i + run.length].created_at || 0).toDateString() === day
                      ) {
                        run.push(messages[i + run.length]);
                      }
                      const isMe = m.senderId
                        ? m.senderId === user?.userId
                        : m.patientId === user?.userId;
                      blocks.push(
                        <div key={`run-${m.messageId}`} className={`messenger-run ${isMe ? "messenger-run--mine" : "messenger-run--theirs"}`}>
                          {!isMe && (
                            <div
                              className="messenger-avatar messenger-avatar--sm"
                              style={{ background: `hsl(${hueForId(selectedDoctorId)}, 55%, 88%)`, color: `hsl(${hueForId(selectedDoctorId)}, 45%, 30%)` }}
                              aria-hidden
                            >
                              {initialsOf(selectedDoctor?.name)}
                            </div>
                          )}
                          <div className="messenger-run__bubbles">
                            {run.map((msg, idx) => {
                              const isLast = idx === run.length - 1;
                              return (
                                <div
                                  key={msg.messageId}
                                  className={`messenger-msg ${isMe ? "messenger-msg--mine" : "messenger-msg--theirs"}`}
                                >
                                  <div className="messenger-msg__bubble">{msg.message}</div>
                                  {isLast && (
                                    <div className="messenger-msg__time">{formatStamp(msg.created_at)}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                      i += run.length;
                    }
                    return blocks;
                  })()}

                  <div ref={messagesEndRef} />
                </div>

                <form className="messenger-input" onSubmit={handleSend}>
                  <span className="messenger-input__icon" aria-hidden>📎</span>
                  <input
                    type="text"
                    className="messenger-input__field"
                    placeholder="Type your message here…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <button type="submit" className="messenger-input__send" disabled={!newMessage.trim() || sending} aria-label="Send">
                    ➤
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}