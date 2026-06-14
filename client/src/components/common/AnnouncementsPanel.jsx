import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Megaphone, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

/**
 * AnnouncementsPanel
 *
 * Props:
 *   isAdmin {boolean} — when true, shows delete buttons next to each item
 *   onDelete {function} — called with (id) after a successful delete; lets the
 *                         parent refresh its own state if needed (optional)
 */
const AnnouncementsPanel = ({ isAdmin = false, onDelete }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/admin/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError('Could not load announcements.');
      console.error('AnnouncementsPanel fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? All users will stop seeing it.')) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      if (onDelete) onDelete(id);
    } catch (err) {
      console.error('Failed to delete announcement:', err.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Announcements</h3>
            <p className="text-2xs text-slate-500 dark:text-slate-400 font-light">
              {announcements.length} active post{announcements.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAnnouncements}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Refresh"
          aria-label="Refresh announcements"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {loading && (
          <div className="py-8 text-center">
            <div className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading announcements…</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-6 text-center px-5">
            <p className="text-xs text-red-500">{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="py-10 text-center px-5">
            <Megaphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs text-slate-400 dark:text-slate-500">No announcements yet.</p>
            {isAdmin && (
              <p className="text-2xs text-slate-400 dark:text-slate-600 mt-1">
                Use the "Broadcast Announcement" button to post one.
              </p>
            )}
          </div>
        )}

        {!loading && !error && announcements.map((a) => {
          const isLong = a.message.length > 160;
          const isOpen = expanded[a._id];

          return (
            <div
              key={a._id}
              className="px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: dot + content */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                      {a.title}
                    </h4>
                    <time className="block text-2xs text-slate-400 dark:text-slate-500 mb-1.5">
                      Posted: {formatDate(a.createdAt)}
                    </time>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {isLong && !isOpen
                        ? `${a.message.substring(0, 160).trimEnd()}…`
                        : a.message}
                    </p>

                    {isLong && (
                      <button
                        onClick={() => toggleExpand(a._id)}
                        className="mt-1.5 flex items-center gap-1 text-2xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <>Show less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Read more <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: delete (admin only) */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-all"
                    title="Delete announcement"
                    aria-label={`Delete announcement: ${a.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementsPanel;
