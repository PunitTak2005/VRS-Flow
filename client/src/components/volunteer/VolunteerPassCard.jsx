import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { API_ROOT } from '../../services/api';

/**
 * VolunteerPassCard
 *
 * A self-contained, printable pass card component.
 * Renders a 95 mm × 160 mm badge with all volunteer / event details and a QR code.
 *
 * Props:
 *   user       – AuthContext user object   { name, ... }
 *   volunteer  – AuthContext volunteer obj { volunteerId, _id, profilePicture, ... }
 *   reg        – Registration object       { _id, eventId: { title, date, startTime, endTime, location } }
 *                Pass reg=null for a generic volunteer ID card.
 */
const VolunteerPassCard = React.forwardRef(({ user, volunteer, reg }, ref) => {
  const [qrUrl, setQrUrl]       = useState('');
  const [imgError, setImgError] = useState(false);

  const volunteerName   = user?.name || volunteer?.name || 'Volunteer';
  const volunteerId     = volunteer?.volunteerId || volunteer?._id || 'N/A';
  const registrationId  = reg?._id || null;
  const isEventPass     = !!reg;

  const eventName     = reg?.eventId?.title    || 'Unknown Event';
  const categoryName  = reg?.eventId?.category || volunteer?.preferredCategory || 'Community Outreach';

  // ── Format date / time ────────────────────────────────────────────────
  let eventDate = 'N/A';
  if (reg?.eventId?.date) {
    try {
      eventDate = new Date(reg.eventId.date).toLocaleDateString(undefined, {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      eventDate = reg.eventId.date;
    }
  }
  const eventTime     = reg?.eventId?.startTime
    ? `${reg.eventId.startTime}${reg.eventId.endTime ? ` – ${reg.eventId.endTime}` : ''}`
    : 'N/A';
  const eventLocation = reg?.eventId?.location || 'N/A';

  // ── QR code ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!volunteerId) return;
    const qrData = isEventPass
      ? JSON.stringify({ volunteerId, registrationId })
      : JSON.stringify({ volunteerId });

    QRCode.toDataURL(qrData, {
      margin: 1,
      width: 180,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [volunteerId, registrationId, isEventPass]);

  // ── Profile picture ───────────────────────────────────────────────────
  const profilePicUrl = (!imgError && volunteer?.profilePicture)
    ? (volunteer.profilePicture.startsWith('http')
        ? volunteer.profilePicture
        : `${API_ROOT}${volunteer.profilePicture}`)
    : null;

  const initials = volunteerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // ── Shorten IDs for display ───────────────────────────────────────────
  const shortVolId = volunteerId.substring(0, 15).toUpperCase();
  const shortRegId = registrationId ? registrationId.substring(0, 15).toUpperCase() : '';

  // ── Inline styles (no Tailwind class dependence for print safety) ─────
  const card = {
    width: '95mm',
    height: '160mm',
    minWidth: '95mm',
    minHeight: '160mm',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
  };

  const header = {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '14px 18px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minHeight: '36mm',
    flexShrink: 0,
  };

  const body = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 20px 8px',
    gap: '8px',
    overflow: 'hidden',
  };

  const footer = {
    padding: '8px 20px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div ref={ref} style={card}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={header}>
        {/* Top row: org name + heart */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '7pt', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#f97316',
          }}>
            VRS FLOW NETWORK
          </span>
          {/* Heart icon (inline SVG — no Lucide dependency needed for canvas capture) */}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5z"/>
          </svg>
        </div>

        {/* Logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          {/* Custom VRS logo (inline SVG) */}
          <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
            <line x1="2"  y1="4"  x2="9"  y2="16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="9"  y1="16" x2="17" y2="5"  stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="9" cy="11" r="3.5" fill="#0f172a" stroke="#f97316" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: '15pt', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            VRS <span style={{ fontWeight: 300, color: '#94a3b8' }}>Flow</span>
          </span>
        </div>

        {/* Pass type label */}
        <div style={{ textAlign: 'center', marginTop: '6px' }}>
          <span style={{
            fontSize: '7.5pt', fontFamily: 'monospace', letterSpacing: '0.16em',
            textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 700,
          }}>
            {isEventPass ? 'VOLUNTEER ENTRY PASS' : 'VOLUNTEER ID CARD'}
          </span>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div style={body}>

        {/* Profile photo */}
        <div style={{
          width: '26mm', height: '26mm', borderRadius: '12px', overflow: 'hidden',
          backgroundColor: profilePicUrl ? '#f8fafc' : '#eef2ff',
          border: '1px solid #e2e8f0', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt={volunteerName}
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{
              fontSize: '18pt', fontWeight: 700, color: '#4338ca',
              lineHeight: 1, userSelect: 'none',
            }}>
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h3 style={{
            margin: 0, fontSize: '12pt', fontWeight: 800,
            color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', padding: '0 8px',
          }}>
            {volunteerName}
          </h3>
        </div>

        {/* IDs */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '4px', width: '100%',
        }}>
          <span style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            VOLUNTEER ID
          </span>
          <span style={{ fontSize: '8pt', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', letterSpacing: '0.06em' }}>
            {shortVolId}
          </span>

          {isEventPass && (
            <>
              <div style={{ width: '60%', borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />
              <span style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                REGISTRATION ID
              </span>
              <span style={{ fontSize: '8pt', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', letterSpacing: '0.06em' }}>
                {shortRegId}
              </span>
            </>
          )}
        </div>

        {/* Event / category info box */}
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #f1f5f9',
          borderRadius: '10px', padding: '10px 12px', width: '100%',
          boxSizing: 'border-box',
        }}>
          {isEventPass ? (
            <>
              <div style={{
                fontSize: '9pt', fontWeight: 700, color: '#2563eb',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                marginBottom: '6px',
              }}>
                {eventName}
              </div>
              <div style={{ fontSize: '7.5pt', color: '#475569', lineHeight: 1.7 }}>
                <div>📅 {eventDate}</div>
                <div>🕒 {eventTime}</div>
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  📍 {eventLocation}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <span style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, display: 'block' }}>
                PREFERRED CATEGORY
              </span>
              <span style={{ fontSize: '10pt', fontWeight: 700, color: '#1e293b', display: 'block', marginTop: '3px' }}>
                {categoryName}
              </span>
              <span style={{ fontSize: '7.5pt', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                Verified Volunteer Member
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER / QR ────────────────────────────────────────────────── */}
      <div style={footer}>
        {/* QR code frame */}
        <div style={{
          width: '22mm', height: '22mm', backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0', borderRadius: '10px',
          padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR Entry Code"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            /* Placeholder while QR is generating */
            <div style={{
              width: '100%', height: '100%', backgroundColor: '#f1f5f9',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '6pt', color: '#94a3b8',
            }}>
              QR…
            </div>
          )}
        </div>

        {/* Footer text */}
        <p style={{
          margin: 0, fontSize: '6.5pt', color: '#94a3b8', fontStyle: 'italic',
          textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em',
          fontWeight: 600, lineHeight: 1.4,
        }}>
          {isEventPass
            ? 'Present this pass at the event entrance.'
            : 'Present this ID at event registration.'}
        </p>
      </div>

    </div>
  );
});

VolunteerPassCard.displayName = 'VolunteerPassCard';

export default VolunteerPassCard;
