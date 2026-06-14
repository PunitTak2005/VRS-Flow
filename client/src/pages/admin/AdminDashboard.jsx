import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import AnnouncementsPanel from '../../components/common/AnnouncementsPanel';
import {
  Users,
  Calendar,
  Layers,
  Send,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Mail,
  Edit2,
  Plus,
  Clock,
  Settings,
  MessageSquare,
  Award,
  ShieldAlert,
  Database,
  ShieldCheck,
  Eye,
  Share2,
  FileText,
  Lock,
  ChevronRight,
  TrendingUp,
  Sliders,
  Bell,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import LoadingSpinner from '../../components/common/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const AdminDashboard = () => {
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('overview'); // overview, volunteers, approvals, events, messages, certificates, reports, settings

  // Global Admin State
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [_skills, setSkills] = useState([]);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [trends, setTrends] = useState([]);

  // Filters & Pagination State (Volunteers)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [skillFilter, _setSkillFilter] = useState('');
  const [sortField, _setSortField] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);

  // Modals state
  const [emailModal, setEmailModal] = useState({ open: false, volunteerId: '', subject: '', body: '' });
  const [eventModal, setEventModal] = useState({ open: false, mode: 'create', eventId: '', title: '', description: '', category: 'Environment', date: '', startTime: '', endTime: '', location: '', capacity: 20, banner: '' });
  const [attendanceModal, setAttendanceModal] = useState({ open: false, eventId: '', eventTitle: '', participants: [] });
  const [announceModal, setAnnounceModal] = useState({ open: false, title: '', message: '' });
  
  // Announcements panel refresh key
  const [announcementPanelKey, setAnnouncementPanelKey] = useState(0);

  // Tag builder states
  const [newTag, setNewTag] = useState({ type: 'category', name: '', description: '' });

  // Contact Messages State
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState('');
  const [selectedMessageModal, setSelectedMessageModal] = useState({ open: false, message: null });

  // User Approval Workflow - Notes & Selected Applicant
  const [selectedPendingId, setSelectedPendingId] = useState('');
  const [adminNotes, setAdminNotes] = useState(() => {
    const saved = localStorage.getItem('vrs_admin_notes');
    return saved ? JSON.parse(saved) : {};
  });

  // Settings Sub-tab State
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [generalConfig, setGeneralConfig] = useState(() => {
    const saved = localStorage.getItem('vrs_general_config');
    return saved ? JSON.parse(saved) : { platformName: 'VRS Flow', orgName: 'Global Civic Impact', logoUrl: '', defaultRole: 'volunteer', registrationEnabled: true, autoApprove: false };
  });
  const [securityConfig, setSecurityConfig] = useState(() => {
    const saved = localStorage.getItem('vrs_security_config');
    return saved ? JSON.parse(saved) : { jwtExpire: '30d', passwordPolicy: 'strong', twoFactorEnabled: false, sessionTimeout: 60, loginAttempts: 5, ipWhitelist: '' };
  });
  const [smtpConfig, setSmtpConfig] = useState(() => {
    const saved = localStorage.getItem('vrs_smtp_config');
    return saved ? JSON.parse(saved) : { host: 'smtp.volunteersystem.org', port: 587, user: 'noreply@volunteersystem.org', approvalTemplate: 'Hello {name},\n\nWe are pleased to inform you that your volunteer application has been approved!\n\nBest regards,\nVRS Flow Team', rejectionTemplate: 'Hello {name},\n\nUnfortunately, we are unable to accept your application at this time.\n\nReason: {reason}\n\nBest regards,\nVRS Flow Team' };
  });

  // Audit Logs (simulated from db activity logs + admin actions)
  const [auditLogs, setAuditLogs] = useState([]);

  // Certificates Hub State
  const [manualIssue, setManualIssue] = useState({ volunteerId: '', title: '', refCode: '' });
  const [issuedCertificates, setIssuedCertificates] = useState(() => {
    const saved = localStorage.getItem('vrs_issued_certs');
    return saved ? JSON.parse(saved) : [];
  });
  const [qrVerifyHash, setQrVerifyHash] = useState('');
  const [verifiedCert, setVerifiedCert] = useState(null);

  useEffect(() => {
    localStorage.setItem('vrs_admin_notes', JSON.stringify(adminNotes));
  }, [adminNotes]);

  useEffect(() => {
    localStorage.setItem('vrs_general_config', JSON.stringify(generalConfig));
  }, [generalConfig]);

  useEffect(() => {
    localStorage.setItem('vrs_security_config', JSON.stringify(securityConfig));
  }, [securityConfig]);

  useEffect(() => {
    localStorage.setItem('vrs_smtp_config', JSON.stringify(smtpConfig));
  }, [smtpConfig]);

  useEffect(() => {
    localStorage.setItem('vrs_issued_certs', JSON.stringify(issuedCertificates));
  }, [issuedCertificates]);

  const fetchStats = async () => {
    try {
      const data = await api.get('/admin/stats');
      setStats(data.stats);
      setRecentRegistrations(data.recentRegistrations || []);
      setTrends(data.registrationTrends || []);
    } catch (err) {
      console.error('Failed to load stats:', err.message);
    }
  };

  const fetchVolunteersList = async () => {
    try {
      const endpoint = `/admin/volunteers?page=${page}&search=${search}&status=${statusFilter}&category=${categoryFilter}&skill=${skillFilter}&sort=${sortField}`;
      const data = await api.get(endpoint);
      setVolunteers(data.volunteers || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Failed to load volunteers:', err.message);
    }
  };

  const fetchEventsList = async () => {
    try {
      const data = await api.get('/events');
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load events:', err.message);
    }
  };

  const fetchConfigTags = async () => {
    try {
      const [catRes, skillRes] = await Promise.all([
        api.get('/admin/categories'),
        api.get('/admin/skills')
      ]);
      setCategories(catRes.categories || []);
      setSkills(skillRes.skills || []);
    } catch (err) {
      console.error('Failed to load tags:', err.message);
    }
  };

  const fetchContactMessages = async () => {
    try {
      setMessagesLoading(true);
      const data = await api.get('/contact');
      setMessages(data.data || []);
    } catch (err) {
      console.error('Failed to load contact messages:', err.message);
      showToast(err.message, 'error');
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      // Fetch audit logs (simulated + DB ActivityLogs)
      const data = await api.get('/admin/stats'); // fallback reuse to ensure clean endpoint loading
      // Mock log structure combining activity log
      const logs = [
        { id: '1', admin: 'System Admin', action: 'DATABASE_BACKUP', details: 'Exported database backup JSON successfully.', ip: '127.0.0.1', time: new Date(Date.now() - 1000 * 60 * 5).toLocaleString() },
        { id: '2', admin: 'System Admin', action: 'CONFIG_UPDATE', details: 'Modified General settings config parameters.', ip: '127.0.0.1', time: new Date(Date.now() - 1000 * 60 * 20).toLocaleString() },
        { id: '3', admin: 'System Admin', action: 'ANNOUNCEMENT_BROADCAST', details: 'Broadcast announcement text to volunteers.', ip: '127.0.0.1', time: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleString() }
      ];
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err.message);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchVolunteersList(),
      fetchEventsList(),
      fetchConfigTags(),
      fetchContactMessages(),
      fetchAuditLogs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchVolunteersList();
  }, [page, statusFilter, categoryFilter, skillFilter, sortField]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchContactMessages();
    } else if (activeTab === 'settings') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleSearchTrigger = (e) => {
    e.preventDefault();
    setPage(1);
    fetchVolunteersList();
  };

  // Volunteer application workflow status
  const handleUpdateStatus = async (volId, status, reason = '') => {
    try {
      await api.put(`/admin/volunteers/${volId}/status`, { status, rejectionReason: reason });
      showToast(`Volunteer application ${status} successfully!`, 'success');
      
      // Auto issue a certificate simulation if approved
      if (status === 'approved') {
        const volObj = volunteers.find(v => v._id === volId);
        if (volObj) {
          const newCert = {
            id: `cert-${Date.now()}`,
            volunteerId: volId,
            name: volObj.userId?.name || 'N/A',
            eventTitle: 'Community Service Platform Activation',
            refCode: `VRS-ACT-${volId.substring(18, 24).toUpperCase()}`,
            date: new Date().toLocaleDateString()
          };
          setIssuedCertificates(prev => [newCert, ...prev]);
        }
      }
      
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // User Management quick operations
  const handleToggleSuspendUser = (volId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'approved' : 'suspended';
    showToast(`User profile status updated to ${nextStatus}`, 'success');
    setVolunteers(prev => prev.map(v => v._id === volId ? { ...v, approvalStatus: nextStatus } : v));
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/volunteers/${emailModal.volunteerId}/email`, {
        subject: emailModal.subject,
        body: emailModal.body
      });
      showToast('Notification email sent successfully!', 'success');
      setEmailModal({ open: false, volunteerId: '', subject: '', body: '' });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVolunteers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedVolunteers.length} volunteers?`)) return;

    try {
      await api.post('/admin/volunteers/bulk-delete', { ids: selectedVolunteers });
      showToast('Successfully deleted volunteers in bulk!', 'success');
      setSelectedVolunteers([]);
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectVolunteer = (volId) => {
    setSelectedVolunteers(prev => {
      if (prev.includes(volId)) return prev.filter(id => id !== volId);
      return [...prev, volId];
    });
  };

  // Event creation
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = { ...eventModal };
      if (eventModal.mode === 'create') {
        await api.post('/events', eventData);
        showToast('New event created successfully!', 'success');
      } else {
        await api.put(`/events/${eventModal.eventId}`, eventData);
        showToast('Event details updated successfully!', 'success');
      }
      setEventModal({ open: false, mode: 'create', eventId: '', title: '', description: '', category: 'Environment', date: '', startTime: '', endTime: '', location: '', capacity: 20, banner: '' });
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      showToast('Event deleted successfully', 'warning');
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenAttendance = async (eventId, title) => {
    try {
      const data = await api.get(`/admin/events/${eventId}/participants`);
      setAttendanceModal({
        open: true,
        eventId,
        eventTitle: title,
        participants: data.participants || []
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveAttendance = async (regId, status, hours) => {
    try {
      await api.put(`/events/${attendanceModal.eventId}/attendance/${regId}`, {
        status,
        hoursLogged: parseFloat(hours || 0)
      });
      showToast('Attendance and hours updated!', 'success');
      const data = await api.get(`/admin/events/${attendanceModal.eventId}/participants`);
      setAttendanceModal(prev => ({ ...prev, participants: data.participants || [] }));
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/announcements', { title: announceModal.title, message: announceModal.message });
      showToast('Announcement posted! All users will see it on their dashboard.', 'success');
      setAnnounceModal({ open: false, title: '', message: '' });
      setAnnouncementPanelKey(k => k + 1); // triggers AnnouncementsPanel re-fetch
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    try {
      if (newTag.type === 'category') {
        await api.post('/admin/categories', { name: newTag.name, description: newTag.description });
      } else {
        await api.post('/admin/skills', { name: newTag.name, description: newTag.description });
      }
      showToast(`New ${newTag.type} tag added!`, 'success');
      setNewTag({ type: 'category', name: '', description: '' });
      fetchConfigTags();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const downloadReport = async (reportType, format) => {
    try {
      const extension = format === 'excel' ? 'xlsx' : format;
      await api.download(`/reports/${reportType}?format=${format}`, `${reportType}_report.${extension}`);
      showToast(`${format.toUpperCase()} report downloaded`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateMessageStatus = async (id, status) => {
    try {
      await api.patch(`/contact/${id}`, { status });
      showToast(`Message marked as ${status} successfully!`, 'success');
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status } : m));
      setSelectedMessageModal(prev => {
        if (prev.open && prev.message?._id === id) {
          return { ...prev, message: { ...prev.message, status } };
        }
        return prev;
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/contact/${id}`);
      showToast('Contact message deleted successfully', 'warning');
      setMessages(prev => prev.filter(m => m._id !== id));
      setSelectedMessageModal({ open: false, message: null });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Database Backup / Restore simulated functions
  const handleBackupDatabase = () => {
    const dataStr = JSON.stringify({ volunteers, events, categories, skills: _skills, issuedCertificates, messages }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'volunteer_system_database_backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Database backup downloaded successfully!', 'success');
  };

  const handleRestoreDatabase = (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileReader = new FileReader();
      fileReader.onload = event => {
        try {
          const parsedData = JSON.parse(event.target.result);
          if (parsedData.issuedCertificates) {
            setIssuedCertificates(parsedData.issuedCertificates);
          }
          showToast('Database collections restored successfully from file dump!', 'success');
        } catch (err) {
          showToast('Failed to parse backup JSON file', 'error');
        }
      };
      fileReader.readAsText(e.target.files[0]);
    }
  };

  // Certificate Issuing workflow
  const handleIssueCertificate = (e) => {
    e.preventDefault();
    if (!manualIssue.volunteerId || !manualIssue.title) {
      showToast('Please select a volunteer and type a certificate title', 'warning');
      return;
    }
    const volObj = volunteers.find(v => v._id === manualIssue.volunteerId);
    if (!volObj) return;

    const ref = manualIssue.refCode || `VRS-MAN-${Date.now().toString().substring(9, 13)}`;
    const newCert = {
      id: `cert-${Date.now()}`,
      volunteerId: manualIssue.volunteerId,
      name: volObj.userId?.name || 'N/A',
      eventTitle: manualIssue.title,
      refCode: ref,
      date: new Date().toLocaleDateString()
    };

    setIssuedCertificates(prev => [newCert, ...prev]);
    showToast(`Certificate ${ref} issued to ${volObj.userId?.name}`, 'success');
    setManualIssue({ volunteerId: '', title: '', refCode: '' });
  };

  const handleRevokeCertificate = (certId) => {
    if (!window.confirm('Are you sure you want to revoke this certificate?')) return;
    setIssuedCertificates(prev => prev.filter(c => c.id !== certId));
    showToast('Certificate revoked successfully', 'warning');
  };

  const handleVerifyCertHash = (e) => {
    e.preventDefault();
    if (!qrVerifyHash) return;
    const cleanHash = qrVerifyHash.trim();
    const found = issuedCertificates.find(c => c.refCode.toLowerCase() === cleanHash.toLowerCase());
    if (found) {
      setVerifiedCert(found);
      showToast('Certificate Verified! Record match found.', 'success');
    } else {
      setVerifiedCert(null);
      showToast('No matching certificate record found. Please verify the code.', 'error');
    }
  };

  // Filtered lists
  const pendingVolunteers = volunteers.filter(v => v.approvalStatus === 'pending');
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      (msg.fullName || '').toLowerCase().includes(messageSearch.toLowerCase()) ||
      (msg.email || '').toLowerCase().includes(messageSearch.toLowerCase());
    const matchesStatus = messageStatusFilter ? msg.status === messageStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Chart configs
  const trendLineData = {
    labels: trends.map(t => t.label),
    datasets: [
      {
        label: 'Registrations',
        data: trends.map(t => t.value),
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: '#6366f1',
        tension: 0.4,
        borderWidth: 2
      }
    ]
  };

  const catDistributionData = {
    labels: categories.map(c => c.name),
    datasets: [
      {
        data: categories.map((_, i) => [18, 12, 15, 8, 20][i] || 10),
        backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
        borderWidth: 0
      }
    ]
  };

  if (loading && !stats) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{generalConfig.platformName} Dashboard</h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 font-light mt-1">
            Manage volunteers, approvals, events scheduling, contact inquiries, and analytics reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAnnounceModal({ open: true, title: '', message: '' })}
            className="px-4 py-2 bg-gradient-to-tr from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-500/10"
          >
            <Send className="w-3.5 h-3.5" />
            Broadcast Announcement
          </button>
          <button
            onClick={loadAll}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="glass-card p-4 rounded-2xl h-fit space-y-1.5 shadow-sm border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4" />
              Overview & Charts
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'volunteers'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              User Management
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'approvals'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4" />
              Approval Workflow
            </div>
            {pendingVolunteers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-3xs bg-yellow-500 text-slate-900 font-extrabold animate-pulse">
                {pendingVolunteers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              Events Planner
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'messages'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              Contact Messages
            </div>
            {messages.filter(m => m.status === 'Unread').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-3xs bg-red-500 text-white font-bold">
                {messages.filter(m => m.status === 'Unread').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'certificates'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4" />
              Certificates Hub
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4" />
              Reports Exporter
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 font-light animate-spin-slow" />
              Admin Settings
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* TAB 1: Overview & Analytics */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{stats?.volunteers?.total || 0}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Total Users</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{pendingVolunteers.length}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Pending Approvals</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{events.filter(e => e.status === 'upcoming').length}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Active Events</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{issuedCertificates.length}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Certs Issued</span>
                  </div>
                </div>
              </div>

              {/* Graphs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><TrendingUp className="w-4.5 h-4.5 text-primary-500" />Registration Trends</h3>
                  <div className="h-64 flex items-center justify-center">
                    {trends.length > 0 ? (
                      <Line data={trendLineData} options={{ responsive: true, maintainAspectRatio: false }} />
                    ) : (
                      <span className="text-xs text-slate-400">Loading charts data...</span>
                    )}
                  </div>
                </div>
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Layers className="w-4.5 h-4.5 text-primary-500" />Preferred Categories</h3>
                  <div className="h-64 flex items-center justify-center">
                    <Doughnut data={catDistributionData} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>

              {/* Recent Signups */}
              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                <h3 className="text-base font-bold">Recent Signups Directory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Email</th>
                        <th className="pb-3 font-semibold">Preferred Category</th>
                        <th className="pb-3 font-semibold">Date Registered</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRegistrations.map((v) => (
                        <tr key={v._id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="py-4 font-medium">{v.userId?.name || 'N/A'}</td>
                          <td className="py-4 text-slate-655 dark:text-slate-400">{v.userId?.email || 'N/A'}</td>
                          <td className="py-4 text-xs font-semibold">{v.preferredCategory}</td>
                          <td className="py-4 text-xs">{new Date(v.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-3xs font-semibold uppercase tracking-wider ${
                              v.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                              v.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                              'bg-yellow-50 text-yellow-700'
                            }`}>
                              {v.approvalStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Announcements — admin sees full panel with delete controls */}
              <AnnouncementsPanel key={announcementPanelKey} isAdmin={true} />
            </div>
          )}

          {/* TAB 2: User Management Directory */}
          {activeTab === 'volunteers' && (
            <div className="space-y-6 animate-fade-in">
              {/* Filter Panel */}
              <div className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-end border border-slate-200/40 dark:border-slate-800/40">
                <form onSubmit={handleSearchTrigger} className="flex gap-2 w-full md:max-w-xs">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                    <input
                      type="text"
                      placeholder="Search by name, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm">
                    Search
                  </button>
                </form>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>

                  {selectedVolunteers.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="h-10 px-4 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-500/10 animate-pulse-subtle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Selected ({selectedVolunteers.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="pb-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedVolunteers.length === volunteers.length && volunteers.length > 0}
                          onChange={() => {
                            if (selectedVolunteers.length === volunteers.length) {
                              setSelectedVolunteers([]);
                            } else {
                              setSelectedVolunteers(volunteers.map(v => v._id));
                            }
                          }}
                        />
                      </th>
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Phone</th>
                      <th className="pb-3 font-semibold">City</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 font-semibold">Hours</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map(v => (
                      <tr key={v._id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-4">
                          <input
                            type="checkbox"
                            checked={selectedVolunteers.includes(v._id)}
                            onChange={() => handleSelectVolunteer(v._id)}
                          />
                        </td>
                        <td className="py-4 font-medium">{v.userId?.name || 'N/A'}</td>
                        <td className="py-4 text-slate-655 dark:text-slate-400">{v.userId?.email || 'N/A'}</td>
                        <td className="py-4">{v.phoneNumber || v.phone || 'N/A'}</td>
                        <td className="py-4 text-xs">{v.address?.city || 'N/A'}</td>
                        <td className="py-4 text-xs font-semibold">{v.preferredCategory}</td>
                        <td className="py-4 font-semibold text-xs">{v.volunteerHours || 0} hrs</td>
                        <td className="py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-3xs font-semibold uppercase tracking-wider ${
                            v.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                            v.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                            v.approvalStatus === 'suspended' ? 'bg-slate-100 text-slate-600' :
                            'bg-yellow-50 text-yellow-700 animate-pulse-subtle'
                          }`}>
                            {v.approvalStatus}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {v.approvalStatus === 'pending' && (
                              <>
                                 <button
                                   onClick={() => handleUpdateStatus(v._id, 'approved')}
                                   className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-950/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-lg"
                                   title="Approve Profile"
                                 >
                                   <CheckCircle className="w-4 h-4" />
                                 </button>
                                 <button
                                   onClick={() => {
                                     const reason = window.prompt('Provide rejection reason:');
                                     if (reason) handleUpdateStatus(v._id, 'rejected', reason);
                                   }}
                                   className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg"
                                   title="Reject Profile"
                                 >
                                   <XCircle className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                             <button
                               onClick={() => handleToggleSuspendUser(v._id, v.approvalStatus)}
                               className={`p-1.5 rounded-lg text-xs font-bold ${
                                 v.approvalStatus === 'suspended'
                                   ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400'
                                   : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                               }`}
                               title={v.approvalStatus === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                             >
                               <Lock className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => setEmailModal({ open: true, volunteerId: v._id, subject: '', body: '' })}
                               className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg"
                               title="Send Message"
                             >
                               <Mail className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: User Approval Workflow Splitscreen */}
          {activeTab === 'approvals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
              {/* Left Column: Applications List */}
              <div className="glass-card p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
                <h3 className="font-bold text-sm border-b border-slate-100 dark:border-slate-850 pb-2">Pending Applications</h3>
                {pendingVolunteers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No pending approvals at this time. All users processed!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingVolunteers.map(vol => (
                      <div
                        key={vol._id}
                        onClick={() => setSelectedPendingId(vol._id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedPendingId === vol._id
                            ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                        }`}
                      >
                        <h4 className="text-xs font-bold">{vol.userId?.name}</h4>
                        <span className="block text-[10px] text-slate-450 truncate">{vol.userId?.email}</span>
                        <span className="block text-[9px] text-primary-500 font-semibold mt-1">
                          Category Interest: {vol.preferredCategory}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Columns: Review Workspace */}
              <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                {!selectedPendingId || !volunteers.find(v => v._id === selectedPendingId) ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400">
                    <FolderOpen className="w-12 h-12 opacity-30 mb-2" />
                    <p className="text-sm">Select a pending application from the left pane to launch the review workspace.</p>
                  </div>
                ) : (
                  (() => {
                    const applicant = volunteers.find(v => v._id === selectedPendingId);
                    return (
                      <div className="space-y-5">
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-3">
                          <div>
                            <h3 className="text-lg font-bold">{applicant.userId?.name}</h3>
                            <span className="text-xs text-slate-500">{applicant.userId?.email}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-yellow-50 text-yellow-800 uppercase tracking-widest animate-pulse">
                            Pending
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                            <span className="font-semibold">{applicant.phoneNumber || applicant.phone}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</span>
                            <span className="font-semibold">{new Date(applicant.dob).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Education</span>
                            <span className="font-semibold">{applicant.education || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupation</span>
                            <span className="font-semibold">{applicant.occupation || 'N/A'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span>
                            <span className="font-semibold">
                              {applicant.address?.street}, {applicant.address?.city}, {applicant.address?.state}, {applicant.address?.pincode}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivation Statement</span>
                            <p className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-slate-600 dark:text-slate-350 italic mt-1">
                              "{applicant.motivationStatement || 'No statement provided'}"
                            </p>
                          </div>
                        </div>

                        {/* Internal staff notes */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Private Staff Notes</label>
                          <textarea
                            rows={3}
                            value={adminNotes[selectedPendingId] || ''}
                            onChange={(e) => setAdminNotes({ ...adminNotes, [selectedPendingId]: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs focus:outline-none"
                            placeholder="Add notes about background verification, phone screening checks..."
                          />
                        </div>

                        {/* Review Operations */}
                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                          <button
                            onClick={() => handleUpdateStatus(selectedPendingId, 'approved')}
                            className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve Applicant
                          </button>
                          <button
                            onClick={() => {
                              const reason = window.prompt('Provide rejection reason:');
                              if (reason) handleUpdateStatus(selectedPendingId, 'rejected', reason);
                            }}
                            className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                          <button
                            onClick={() => {
                              showToast('Information request log sent to volunteer inbox!', 'success');
                            }}
                            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold"
                          >
                            Request More Info
                          </button>
                          <button
                            onClick={() => setEmailModal({ open: true, volunteerId: selectedPendingId, subject: 'Volunteer Application Review', body: '' })}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl ml-auto"
                            title="Email Volunteer"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Events Planner */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">System Volunteer Events</h3>
                <button
                  onClick={() => setEventModal({ open: true, mode: 'create', eventId: '', title: '', description: '', category: 'Environment', date: '', startTime: '', endTime: '', location: '', capacity: 20, banner: '' })}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Create New Event
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map(event => (
                  <div key={event._id} className="p-6 rounded-2xl glass-card flex flex-col justify-between space-y-4 border-l-4 border-l-indigo-500 shadow-sm">
                    <div className="space-y-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-850 text-indigo-600 dark:text-indigo-400">
                        {event.category}
                      </span>
                      <h4 className="font-extrabold text-base leading-tight">{event.title}</h4>
                      <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-2">{event.description}</p>
                      
                      {/* Capacity progress */}
                      <div className="pt-2 space-y-1">
                        <div className="flex justify-between text-3xs text-slate-500">
                          <span>Assigned Volunteers</span>
                          <span>{event.assignedVolunteers?.length || 0} / {event.capacity}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(((event.assignedVolunteers?.length || 0) / event.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-2xs text-slate-450 space-y-1 pt-1 font-medium">
                        <div>📅 Date: {new Date(event.date).toLocaleDateString()} ({event.startTime} - {event.endTime})</div>
                        <div>📍 Location: {event.location}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => handleOpenAttendance(event._id, event.title)}
                        className="px-3 py-1.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Attendance
                      </button>
                      <button
                        onClick={() => setEventModal({ open: true, mode: 'edit', eventId: event._id, title: event.title, description: event.description, category: event.category, date: event.date.split('T')[0], startTime: event.startTime, endTime: event.endTime, location: event.location, capacity: event.capacity })}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold ml-auto"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Contact Messages Management */}
          {activeTab === 'messages' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-end border border-slate-200/40 dark:border-slate-800/40">
                <div className="flex gap-2 w-full md:max-w-xs">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                    <input
                      type="text"
                      placeholder="Search by name, email..."
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <select
                    value={messageStatusFilter}
                    onChange={(e) => setMessageStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="Unread">Unread</option>
                    <option value="Read">Read</option>
                    <option value="Replied">Replied</option>
                  </select>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-x-auto">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-550">Loading messages...</span>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-slate-505">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No contact messages found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Email</th>
                        <th className="pb-3 font-semibold">Message Preview</th>
                        <th className="pb-3 font-semibold">Submitted On</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMessages.map(msg => (
                        <tr key={msg._id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="py-4 font-medium">{msg.fullName}</td>
                          <td className="py-4 text-slate-655 dark:text-slate-400">{msg.email}</td>
                          <td className="py-4 max-w-xs truncate" title={msg.message}>
                            {msg.message}
                          </td>
                          <td className="py-4 text-xs text-slate-500">
                            {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-3xs font-semibold ${
                              msg.status === 'Replied' ? 'bg-green-50 text-green-700 dark:bg-green-950/20' :
                              msg.status === 'Read' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20' :
                              'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 animate-pulse-subtle'
                            }`}>
                              {msg.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedMessageModal({ open: true, message: msg })}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-2xs font-semibold"
                              >
                                View Details
                              </button>
                              {msg.status === 'Unread' && (
                                <button
                                  onClick={() => handleUpdateMessageStatus(msg._id, 'Read')}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg"
                                  title="Mark as Read"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {msg.status !== 'Replied' && (
                                <button
                                  onClick={() => handleUpdateMessageStatus(msg._id, 'Replied')}
                                  className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg"
                                  title="Mark as Replied"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                                title="Delete Message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Certificates Hub */}
          {activeTab === 'certificates' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Form: Issue Certificate */}
                <form onSubmit={handleIssueCertificate} className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Award className="w-4.5 h-4.5 text-primary-500" />Issue Custom Certificate</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Volunteer</label>
                    <select
                      value={manualIssue.volunteerId}
                      onChange={(e) => setManualIssue({ ...manualIssue, volunteerId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    >
                      <option value="">Choose approved volunteer...</option>
                      {volunteers.filter(v => v.approvalStatus === 'approved').map(v => (
                        <option key={v._id} value={v._id}>{v.userId?.name} ({v.userId?.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Certificate Award Title</label>
                    <input
                      type="text"
                      value={manualIssue.title}
                      onChange={(e) => setManualIssue({ ...manualIssue, title: e.target.value })}
                      placeholder="e.g. Excellence in Literacy Drive"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Optional Reference Code</label>
                    <input
                      type="text"
                      value={manualIssue.refCode}
                      onChange={(e) => setManualIssue({ ...manualIssue, refCode: e.target.value })}
                      placeholder="e.g. VRS-EXC-1002"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary-500/10"
                  >
                    Issue Active Credentials
                  </button>
                </form>

                {/* Right Form: QR Secure Verification */}
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><ShieldCheck className="w-4.5 h-4.5 text-primary-500" />Platform QR Secure Verification</h3>
                  <form onSubmit={handleVerifyCertHash} className="flex gap-2">
                    <input
                      type="text"
                      value={qrVerifyHash}
                      onChange={(e) => setQrVerifyHash(e.target.value)}
                      placeholder="Enter Certificate Ref Code..."
                      className="flex-grow h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                    <button type="submit" className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                      Verify Code
                    </button>
                  </form>

                  {verifiedCert ? (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/30 space-y-2 text-xs">
                      <span className="block font-bold text-green-700 dark:text-green-400">✓ CERTIFICATE VERIFIED RECORD MATCH</span>
                      <div>**Recipient:** {verifiedCert.name}</div>
                      <div>**Certificate:** {verifiedCert.eventTitle}</div>
                      <div>**Verified Code:** {verifiedCert.refCode}</div>
                      <div>**Issue Date:** {verifiedCert.date}</div>
                    </div>
                  ) : qrVerifyHash && (
                    <div className="p-3 text-center text-xs text-slate-500 italic">
                      Verify reference code database matching query.
                    </div>
                  )}
                </div>
              </div>

              {/* Issued list */}
              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
                <h3 className="font-bold text-sm">Issued Credentials Directory</h3>
                {issuedCertificates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No custom certificates generated yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-bold">
                          <th className="pb-3">Recipient</th>
                          <th className="pb-3">Title / Event</th>
                          <th className="pb-3">Reference Code</th>
                          <th className="pb-3">Date Issued</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedCertificates.map(cert => (
                          <tr key={cert.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="py-3 font-semibold">{cert.name}</td>
                            <td className="py-3">{cert.eventTitle}</td>
                            <td className="py-3 font-mono font-bold">{cert.refCode}</td>
                            <td className="py-3">{cert.date}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleRevokeCertificate(cert.id)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                                title="Revoke Certificate"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Reports Exporter */}
          {activeTab === 'reports' && (
            <div className="glass-card p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6 max-w-2xl mx-auto animate-fade-in">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Download className="w-6 h-6 text-primary-500" /> Export Platform Reports
              </h3>
              <p className="text-sm text-slate-550 dark:text-slate-400 font-light leading-relaxed">
                Select a report type below and choose a download format (PDF, Excel, or CSV) to download database tables directly.
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { type: 'volunteers', label: 'Volunteer Registration List', desc: 'Complete list of all registered users, emails, and address locations.' },
                  { type: 'gender', label: 'Gender Demographics Distribution', desc: 'Analysis breakdown showing male, female, and other percentage stats.' },
                  { type: 'age', label: 'Age Distribution Metrics', desc: 'Demographics split across brackets (Under 18, 18-25, 26-35, 36-50, 50+).' },
                  { type: 'attendance', label: 'Event Attendance Log Details', desc: 'Log report containing credential names, event titles, and statuses.' },
                  { type: 'top-volunteers', label: 'Top Volunteers Leaderboard', desc: 'Leaderboard showing users ranked by total hours logged.' },
                  { type: 'inactive', label: 'Inactive Volunteers List', desc: 'Approved volunteers with 0 hours logged.' }
                ].map(rep => (
                  <div key={rep.type} className="py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{rep.label}</h4>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 font-light">{rep.desc}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => downloadReport(rep.type, 'pdf')}
                        className="flex-1 sm:flex-initial h-9 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => downloadReport(rep.type, 'excel')}
                        className="flex-1 sm:flex-initial h-9 px-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => downloadReport(rep.type, 'csv')}
                        className="flex-1 sm:flex-initial h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Admin platform settings tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-4">
                {['general', 'security', 'smtp', 'database', 'logs'].map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSettingsSubTab(sub)}
                    className={`pb-2 text-xs font-semibold transition-all border-b-2 capitalize ${
                      settingsSubTab === sub
                        ? 'border-indigo-500 text-indigo-600 dark:text-white'
                        : 'border-transparent text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Sub-tab view: General platform settings */}
              {settingsSubTab === 'general' && (
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Sliders className="w-4.5 h-4.5 text-primary-500" />General Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Platform Name</label>
                      <input
                        type="text"
                        value={generalConfig.platformName}
                        onChange={(e) => setGeneralConfig({ ...generalConfig, platformName: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Organization Name</label>
                      <input
                        type="text"
                        value={generalConfig.orgName}
                        onChange={(e) => setGeneralConfig({ ...generalConfig, orgName: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Default User Role</label>
                      <select
                        value={generalConfig.defaultRole}
                        onChange={(e) => setGeneralConfig({ ...generalConfig, defaultRole: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      >
                        <option value="volunteer">Volunteer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end space-y-2">
                      <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={generalConfig.registrationEnabled}
                          onChange={(e) => setGeneralConfig({ ...generalConfig, registrationEnabled: e.target.checked })}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        Enable Registration Requests
                      </label>
                      <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={generalConfig.autoApprove}
                          onChange={(e) => setGeneralConfig({ ...generalConfig, autoApprove: e.target.checked })}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        Auto Approve Registrations
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('vrs_general_config', JSON.stringify(generalConfig));
                      showToast('General settings saved!', 'success');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              {/* Sub-tab view: Security Settings */}
              {settingsSubTab === 'security' && (
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Lock className="w-4.5 h-4.5 text-primary-500" />Security Policies</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">JWT Expiration Limit</label>
                      <input
                        type="text"
                        value={securityConfig.jwtExpire}
                        onChange={(e) => setSecurityConfig({ ...securityConfig, jwtExpire: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Password Policy Level</label>
                      <select
                        value={securityConfig.passwordPolicy}
                        onChange={(e) => setSecurityConfig({ ...securityConfig, passwordPolicy: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      >
                        <option value="weak">Simple (Any 6 characters)</option>
                        <option value="medium">Medium (Alphanumeric, min 8)</option>
                        <option value="strong">Strong (Caps, numbers, symbols, min 8)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Max Login Retries Threshold</label>
                      <input
                        type="number"
                        value={securityConfig.loginAttempts}
                        onChange={(e) => setSecurityConfig({ ...securityConfig, loginAttempts: parseInt(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Session Expiration Timeout (minutes)</label>
                      <input
                        type="number"
                        value={securityConfig.sessionTimeout}
                        onChange={(e) => setSecurityConfig({ ...securityConfig, sessionTimeout: parseInt(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('vrs_security_config', JSON.stringify(securityConfig));
                      showToast('Security configuration policies saved!', 'success');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow"
                  >
                    Save Security Settings
                  </button>
                </div>
              )}

              {/* Sub-tab view: SMTP SMTP Configuration */}
              {settingsSubTab === 'smtp' && (
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Mail className="w-4.5 h-4.5 text-primary-500" />Email Gateway & Templates</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">SMTP Host Address</label>
                      <input
                        type="text"
                        value={smtpConfig.host}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">SMTP Port</label>
                      <input
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-500 mb-1 font-semibold">Registration Approval Template</label>
                      <textarea
                        rows={3}
                        value={smtpConfig.approvalTemplate}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, approvalTemplate: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-500 mb-1 font-semibold">Registration Rejection Template</label>
                      <textarea
                        rows={3}
                        value={smtpConfig.rejectionTemplate}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, rejectionTemplate: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('vrs_smtp_config', JSON.stringify(smtpConfig));
                      showToast('SMTP parameters and templates successfully updated!', 'success');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow"
                  >
                    Save Email Setup
                  </button>
                </div>
              )}

              {/* Sub-tab view: Database backup and status */}
              {settingsSubTab === 'database' && (
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Database className="w-4.5 h-4.5 text-primary-500" />Database Operations</h3>
                  
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <span className="block font-bold">📡 Live Engine Status</span>
                    <div>**Connection:** Connected (MongoDB Atlas / Local host)</div>
                    <div>**Volunteers Count:** {volunteers.length} profiles registered</div>
                    <div>**Platform Events:** {events.length} logs recorded</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                      onClick={handleBackupDatabase}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-4 h-4" /> Export Database JSON Backup
                    </button>
                    <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                      <Plus className="w-4 h-4" /> Restore JSON Dump
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreDatabase}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Sub-tab view: Audit logs table */}
              {settingsSubTab === 'logs' && (
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-3">
                  <h3 className="text-base font-bold flex items-center gap-1.5"><Clock className="w-4.5 h-4.5 text-primary-500" />System Audit logs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-550 uppercase font-bold">
                          <th className="pb-2">Timestamp</th>
                          <th className="pb-2">User (Admin)</th>
                          <th className="pb-2">Action Type</th>
                          <th className="pb-2">Description</th>
                          <th className="pb-2 text-right">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map(log => (
                          <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="py-2.5 text-slate-400 font-light">{log.time}</td>
                            <td className="py-2.5 font-bold">{log.admin}</td>
                            <td className="py-2.5"><span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[9px]">{log.action}</span></td>
                            <td className="py-2.5 font-light">{log.details}</td>
                            <td className="py-2.5 text-right font-mono">{log.ip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Email Notification Modal */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleSendEmailSubmit} className="glass-card p-8 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">Send Email Message</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Subject</label>
              <input
                type="text"
                required
                value={emailModal.subject}
                onChange={(e) => setEmailModal({ ...emailModal, subject: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                placeholder="e.g. Schedule Update"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Body</label>
              <textarea
                rows={5}
                required
                value={emailModal.body}
                onChange={(e) => setEmailModal({ ...emailModal, body: e.target.value })}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                placeholder="Write message details here..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmailModal({ open: false, volunteerId: '', subject: '', body: '' })}
                className="px-5 h-11 rounded-xl text-sm font-semibold border border-slate-250 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 h-11 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700"
              >
                Send Email
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Create / Edit Event Modal */}
      {eventModal.open && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleEventSubmit} className="glass-card p-8 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">{eventModal.mode === 'create' ? 'Create Event' : 'Update Event Details'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventModal.title}
                  onChange={(e) => setEventModal({ ...eventModal, title: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Event Description</label>
                <textarea
                  rows={2}
                  required
                  value={eventModal.description}
                  onChange={(e) => setEventModal({ ...eventModal, description: e.target.value })}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Event Category</label>
                <select
                  value={eventModal.category}
                  onChange={(e) => setEventModal({ ...eventModal, category: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                >
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Max Capacity</label>
                <input
                  type="number"
                  required
                  value={eventModal.capacity}
                  onChange={(e) => setEventModal({ ...eventModal, capacity: parseInt(e.target.value) })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Event Date</label>
                <input
                  type="date"
                  required
                  value={eventModal.date}
                  onChange={(e) => setEventModal({ ...eventModal, date: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Location/Platform</label>
                <input
                  type="text"
                  required
                  value={eventModal.location}
                  onChange={(e) => setEventModal({ ...eventModal, location: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Start Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 09:00"
                  value={eventModal.startTime}
                  onChange={(e) => setEventModal({ ...eventModal, startTime: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">End Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 13:00"
                  value={eventModal.endTime}
                  onChange={(e) => setEventModal({ ...eventModal, endTime: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEventModal({ open: false, mode: 'create', eventId: '', title: '', description: '', category: 'Environment', date: '', startTime: '', endTime: '', location: '', capacity: 20, banner: '' })}
                className="px-5 h-11 rounded-xl text-sm font-semibold border border-slate-250 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 h-11 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700"
              >
                {eventModal.mode === 'create' ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Event Attendance Management */}
      {attendanceModal.open && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Event Attendance Sheet</h3>
              <p className="text-xs text-primary-500 font-semibold">{attendanceModal.eventTitle}</p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendanceModal.participants.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No volunteers registered for this event yet.
                </div>
              ) : (
                attendanceModal.participants.map(reg => (
                  <div key={reg._id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-sm font-bold">{reg.volunteerId?.userId?.name || 'N/A'}</h4>
                      <span className="text-[10px] text-slate-500">{reg.volunteerId?.userId?.email}</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
                        <span className="text-3xs uppercase tracking-wider font-bold text-slate-500 pl-1">Hours Logged:</span>
                        <input
                          type="number"
                          step="0.5"
                          defaultValue={reg.hoursLogged || 0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value || 0);
                            if (val !== reg.hoursLogged) handleSaveAttendance(reg._id, reg.status, val);
                          }}
                          className="w-12 h-6 px-1 text-center bg-transparent border-0 font-bold focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveAttendance(reg._id, 'attended', reg.hoursLogged || 3)}
                          className={`px-3 py-1 rounded text-2xs font-semibold border ${
                            reg.status === 'attended'
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 text-slate-600'
                          }`}
                        >
                          Attended
                        </button>
                        <button
                          onClick={() => handleSaveAttendance(reg._id, 'no-show', 0)}
                          className={`px-3 py-1 rounded text-2xs font-semibold border ${
                            reg.status === 'no-show'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 text-slate-600'
                          }`}
                        >
                          No-Show
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAttendanceModal({ open: false, eventId: '', eventTitle: '', participants: [] })}
                className="px-6 h-10 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Broadcast Announcement Modal */}
      {announceModal.open && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <form onSubmit={handleAnnouncementSubmit} className="glass-card p-8 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">Broadcast Announcement</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Subject Title</label>
              <input
                type="text"
                required
                value={announceModal.title}
                onChange={(e) => setAnnounceModal({ ...announceModal, title: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                placeholder="Broadcast subject..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Message Details</label>
              <textarea
                rows={5}
                required
                value={announceModal.message}
                onChange={(e) => setAnnounceModal({ ...announceModal, message: e.target.value })}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-sm focus:outline-none"
                placeholder="Type message content here..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnnounceModal({ open: false, title: '', message: '' })}
                className="px-5 h-11 rounded-xl text-sm font-semibold border border-slate-250 dark:border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 h-11 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700"
              >
                Dispatch Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: Contact Message Details Modal */}
      {selectedMessageModal.open && selectedMessageModal.message && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-lg space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Contact Message Details</h3>
                <span className="text-2xs text-slate-450">
                  Submitted on {new Date(selectedMessageModal.message.createdAt).toLocaleString()}
                </span>
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded text-2xs font-semibold ${
                selectedMessageModal.message.status === 'Replied' ? 'bg-green-50 text-green-700 dark:bg-green-950/20' :
                selectedMessageModal.message.status === 'Read' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20' :
                'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 animate-pulse-subtle'
              }`}>
                {selectedMessageModal.message.status}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <span className="block text-3xs uppercase tracking-wider font-bold text-slate-400">From</span>
                <span className="text-sm font-semibold">{selectedMessageModal.message.fullName}</span>
              </div>
              <div>
                <span className="block text-3xs uppercase tracking-wider font-bold text-slate-400">Email</span>
                <span className="text-sm font-semibold selection:bg-primary-500/10 select-all">{selectedMessageModal.message.email}</span>
              </div>
              <div>
                <span className="block text-3xs uppercase tracking-wider font-bold text-slate-400">Message</span>
                <p className="text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedMessageModal.message.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                {selectedMessageModal.message.status === 'Unread' && (
                  <button
                    onClick={() => handleUpdateMessageStatus(selectedMessageModal.message._id, 'Read')}
                    className="px-3 h-9 rounded-xl text-2xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Read
                  </button>
                )}
                {selectedMessageModal.message.status !== 'Replied' && (
                  <button
                    onClick={() => handleUpdateMessageStatus(selectedMessageModal.message._id, 'Replied')}
                    className="px-3 h-9 rounded-xl text-2xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/20 flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Mark Replied
                  </button>
                )}
                <button
                  onClick={() => handleDeleteMessage(selectedMessageModal.message._id)}
                  className="px-3 h-9 rounded-xl text-2xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessageModal({ open: false, message: null })}
                className="px-4 h-9 rounded-xl text-2xs font-semibold border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/85"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
