// src/pages/doctor/DoctorChat.jsx
//
// Doctor-facing chat. Mirrors src/pages/patient/Chat.jsx but with the role
// roles swapped: here the logged-in user is the doctor, and the left rail
// lists patients (sourced from the doctor's appointment queue) instead of
// doctors. The backend chat endpoints (/chat/send, /chat/messages) take
// both doctorId and patientId, so the wire format is identical.

import { useState, useEffect, useMemo, useRef } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

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

export default function DoctorChat() {
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [patientsError, setPatientsError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatStarted, setChatStarted] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const historyRef = useRef({});
  const [previews, setPreviews] = useState({}); // { patientId: { text, time } }

  // Build the left rail from the doctor's appointment queue (both pending +
  // completed) so the doctor always sees patients they actually have a
  // relationship with. Deduplicate by patient_id.
  function loadPatients() {
    setPatientsError("");
    apiRequest(ENDPOINTS.doctorAppointments, { method: "GET", auth: true })
      .then((res) => {
        const all = [...(res?.data?.incomplete || []), ...(res?.data?.complete || [])];
        const byId = new Map();
        for (const a of all) {
          if (!a?.patient_id) continue;
          if (!byId.has(a.patient_id)) {
            byId.set(a.patient_id, {
              patientId: a.patient_id,
              name: a.name || a.patient_name || `Patient ${a.patient_id}`,
              phone: a.phone || "",
              lastDate: a.date || "",
            });
          }
        }
        setPatients(Array.from(byId.values()));
      })
      .catch((err) => setPatientsError(getErrorMessage(err) || "Failed to load patients."));
  }

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedPatientId || !user?.userId) return;
    loadMessages(user.userId, selectedPatientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, user?.userId]);

  // Poll for new messages every 5s while a chat is active
  useEffect(() => {
    if (!chatStarted || !selectedPatientId || !user?.userId) return;

    const fetchMessages = async () => {
      try {
        const res = await apiRequest(
          ENDPOINTS.chatMessages(user.userId, selectedPatientId),
          { auth: true }
        );
        if (res?.success) mergeMessages(res.data ?? []);
      } catch { /* silent */ }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStarted, selectedPatientId, user?.userId]);

  async function loadMessages(doctorId, patientId) {
    setError("");
    setLoadingMessages(true);
    setChatStarted(false);
    clearInterval(pollRef.current);

    const cached = historyRef.current[patientId];
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
      historyRef.current[selectedPatientId] = merged;
      const last = merged[merged.length - 1];
      if (last) {
        setPreviews((p) => ({
          ...p,
          [selectedPatientId]: { text: last.message, time: last.created_at },
        }));
      }
      return merged;
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedPatientId || !user?.userId) return;

    setSending(true);
    setError("");

    try {
      const res = await apiRequest(ENDPOINTS.chatSend, {
        method: "POST",
        body: { doctorId: user.userId, patientId: selectedPatientId, message: trimmed },
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

  const selectedPatient = patients.find((p) => p.patientId === selectedPatientId);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = patients
      .filter((p) => !q || (p.name || "").toLowerCase().includes(q) || (p.phone || "").toLowerCase().includes(q));
    return list.sort((a, b) => {
      const ta = new Date(previews[a.patientId]?.time || a.lastDate || 0).getTime();
      const tb = new Date(previews[b.patientId]?.time || b.lastDate || 0).getTime();
      return tb - ta;
    });
  }, [patients, search, previews]);

  return (
    <>
      <Navbar />
      <div className="container chat-page">
        <div className="page-header">
          <div>
            <p className="section-eyebrow role-doctor">Doctor Portal</p>
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
                placeholder="Search patients"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {patientsError && (
              <div className="messenger-error">
                <span>Couldn't load patients.</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={loadPatients}>Retry</button>
              </div>
            )}

            <div className="messenger-section messenger-section--scroll">
              <h3 className="messenger-section__title">Your Patients</h3>
              {filteredPatients.length === 0 ? (
                <div className="messenger-empty">
                  {patients.length === 0 ? "No patients yet — they'll appear here once they book an appointment." : "No matches."}
                </div>
              ) : (
                <ul className="messenger-list">
                  {filteredPatients.map((p) => {
                    const isActive = p.patientId === selectedPatientId;
                    const preview = previews[p.patientId];
                    return (
                      <li key={p.patientId}>
                        <button
                          type="button"
                          className={`messenger-contact ${isActive ? "messenger-contact--active" : ""}`}
                          onClick={() => { setSelectedPatientId(p.patientId); setError(""); clearInterval(pollRef.current); }}
                        >
                          <div
                            className="messenger-avatar"
                            style={{ background: `hsl(${hueForId(p.patientId)}, 55%, 88%)`, color: `hsl(${hueForId(p.patientId)}, 45%, 30%)` }}
                            aria-hidden
                          >
                            {initialsOf(p.name)}
                          </div>
                          <div className="messenger-contact__body">
                            <div className="messenger-contact__row">
                              <span className="messenger-contact__name">{p.name}</span>
                              <span className="messenger-contact__time">
                                {preview?.time ? formatStamp(preview.time) : (p.lastDate || "")}
                              </span>
                            </div>
                            <div className="messenger-contact__row messenger-contact__row--sub">
                              <span className="messenger-contact__preview">
                                {preview?.text
                                  ? (preview.text.length > 32 ? preview.text.slice(0, 32) + "…" : preview.text)
                                  : (p.phone ? `📞 ${p.phone}` : "Tap to start chatting")}
                              </span>
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
            {!selectedPatientId ? (
              <div className="messenger-thread__empty">
                <div className="messenger-thread__empty-icon" aria-hidden>💬</div>
                <p className="messenger-thread__empty-text">
                  Select a patient from the left to start a conversation.
                </p>
              </div>
            ) : (
              <>
                <header className="messenger-thread__header">
                  <div
                    className="messenger-avatar messenger-avatar--lg"
                    style={{ background: `hsl(${hueForId(selectedPatientId)}, 55%, 88%)`, color: `hsl(${hueForId(selectedPatientId)}, 45%, 30%)` }}
                    aria-hidden
                  >
                    {initialsOf(selectedPatient?.name)}
                  </div>
                  <div className="messenger-thread__title">
                    <p className="messenger-thread__name">{selectedPatient?.name ?? "Patient"}</p>
                    <p className="messenger-thread__status">
                      {selectedPatient?.phone ? `📞 ${selectedPatient.phone}` : "Patient"}
                    </p>
                  </div>
                </header>

                {error && <div className="alert alert-error messenger-error-banner">{error}</div>}

                <div className="messenger-thread__body" role="log" aria-live="polite">
                  {chatStarted && messages.length === 0 && !loadingMessages && (
                    <div className="messenger-thread__empty-inline">
                      No messages yet. Send the first note to your patient.
                    </div>
                  )}

                  {(() => {
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
                      const run = [m];
                      while (
                        i + run.length < messages.length &&
                        messages[i + run.length].patientId === m.patientId &&
                        new Date(messages[i + run.length].created_at || 0).toDateString() === day
                      ) {
                        run.push(messages[i + run.length]);
                      }
                      // On the doctor side, the "doctor" side of the bubble is mine.
                      const isMe = m.patientId !== user?.userId;
                      blocks.push(
                        <div key={`run-${m.messageId}`} className={`messenger-run ${isMe ? "messenger-run--mine" : "messenger-run--theirs"}`}>
                          {!isMe && (
                            <div
                              className="messenger-avatar messenger-avatar--sm"
                              style={{ background: `hsl(${hueForId(selectedPatientId)}, 55%, 88%)`, color: `hsl(${hueForId(selectedPatientId)}, 45%, 30%)` }}
                              aria-hidden
                            >
                              {initialsOf(selectedPatient?.name)}
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
