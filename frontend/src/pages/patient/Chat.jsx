import { useState, useEffect, useRef } from "react";
import Navbar from "../../components/Navbar";
import { apiRequest } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

export default function Chat() {
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [doctorsError, setDoctorsError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatStarted, setChatStarted] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  function loadDoctors() {
    setDoctorsError("");
    apiRequest(ENDPOINTS.doctors, { auth: true })
      .then((res) => { if (res.success) setDoctors(res.data ?? []); })
      .catch((err) => setDoctorsError(err.message || "Failed to load doctors."));
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatStarted || !selectedDoctorId || !user?.userId) return;

    const fetchMessages = async () => {
      try {
        const res = await apiRequest(
          ENDPOINTS.chatMessages(selectedDoctorId, user.userId),
          { auth: true }
        );
        if (res.success) setMessages(res.data ?? []);
      } catch {
        // silent poll failure
      }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [chatStarted, selectedDoctorId, user?.userId]);

  async function handleOpenChat(e) {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setError("");
    setMessages([]);
    setLoadingMessages(true);
    setChatStarted(false);
    clearInterval(pollRef.current);

    try {
      const res = await apiRequest(
        ENDPOINTS.chatMessages(selectedDoctorId, user.userId),
        { auth: true }
      );
      if (res.success) {
        setMessages(res.data ?? []);
        setChatStarted(true);
      } else {
        setError(res.message ?? "Failed to load messages.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoadingMessages(false);
    }
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
      if (res.success) {
        setNewMessage("");
        setMessages((prev) => [...prev, res.data]);
      } else {
        setError(res.message ?? "Failed to send message.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.doctorId === selectedDoctorId);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <p className="section-eyebrow role-patient">Patient Portal</p>
          <h1 className="page-title">Chat with Your Doctor</h1>
          <div className="accent-line"></div>
        </div>

        <form className="form-row" onSubmit={handleOpenChat}>
          <div className="form-group">
            <label className="form-label" htmlFor="doctor_chat_select">Select Doctor</label>
            <select
              id="doctor_chat_select"
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setChatStarted(false);
                setMessages([]);
                setError("");
                clearInterval(pollRef.current);
              }}
            >
              <option value="">— Choose a doctor —</option>
              {doctors.map((doc) => (
                <option key={doc.doctorId} value={doc.doctorId}>
                  {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!selectedDoctorId || loadingMessages}>
            {loadingMessages ? "Loading…" : "Open Chat"}
          </button>
        </form>

        {doctorsError && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>Couldn't load doctors: {doctorsError}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadDoctors}>Retry</button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {chatStarted && (
          <div className="chat-window">
            <div className="chat-header">
              <span className="chat-header__icon">💬</span>
              <div>
                <p className="chat-header__name">{selectedDoctor?.name ?? "Doctor"}</p>
                {selectedDoctor?.specialization && (
                  <p className="chat-header__spec">{selectedDoctor.specialization}</p>
                )}
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <p className="chat-empty">No messages yet. Start the conversation below.</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.patientId === user?.userId;
                  return (
                    <div
                      key={msg.messageId}
                      className={`chat-bubble-wrap ${isMe ? "chat-bubble-wrap--mine" : "chat-bubble-wrap--theirs"}`}
                    >
                      <div className={`chat-bubble ${isMe ? "chat-bubble--mine" : "chat-bubble--theirs"}`}>
                        {msg.message}
                        <div className="chat-bubble__time">
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={handleSend}>
              <input
                type="text"
                className="form-control"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <button type="submit" className="btn btn-primary" disabled={!newMessage.trim() || sending}>
                {sending ? "…" : "Send"}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}