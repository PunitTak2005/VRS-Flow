import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import VolunteerPassCard from '../../components/volunteer/VolunteerPassCard';
import AnnouncementsPanel from '../../components/common/AnnouncementsPanel';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import {
  User,
  Calendar,
  Award,
  Clock,
  ShieldAlert,
  Download,
  Key,
  Trash2,
  CalendarCheck,
  FileCheck,
  Heart,
  ChevronRight,
  TrendingUp,
  MapPin,
  CheckCircle,
  Mail,
  UserCheck,
  Share2,
  FileText,
  Sliders,
  Sun,
  Moon,
  Sparkles,
  Printer
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { API_ROOT } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VolunteerDashboard = () => {
  const { user, volunteer, logout, updateProfile, refreshMe } = useAuth();
  const { showToast } = useNotification();
  const certificateRef = useRef(null);
  const [generatingCert, setGeneratingCert] = useState(false);

  const handleDownloadCertificate = async (mode = 'download') => {
    if (!certificateRef.current) return;
    setGeneratingCert(true);
    try {
      const { generateCertificatePdf } = await import('../../utils/certificatePdfGenerator');
      await generateCertificatePdf(certificateRef.current, {
        filename: `Certificate_${selectedCert.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        mode
      });
      showToast(mode === 'print' ? 'Opening print dialog...' : 'Certificate downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate certificate PDF.', 'error');
    } finally {
      setGeneratingCert(false);
    }
  };

  const [activeTab, setActiveTab] = useState('overview'); // overview, calendar, certificates, settings
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [idCard, setIdCard] = useState(null);

  // Edit Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '', phoneNumber: '', preferredCategory: '', skills: '', languages: '', motivationStatement: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Modal certificates
  const [selectedCert, setSelectedCert] = useState(null);
  const [generatingPassId, setGeneratingPassId] = useState(null);

  useEffect(() => {
    if (volunteer) {
      setProfileForm({
        name: user?.name || '',
        phoneNumber: volunteer.phoneNumber || volunteer.phone || '',
        preferredCategory: volunteer.preferredCategory || '',
        skills: (volunteer.skills || []).join(', '),
        languages: (volunteer.languages || []).join(', '),
        motivationStatement: volunteer.motivationStatement || ''
      });
      setProfilePicPreview(volunteer.profilePicture);
    }
  }, [volunteer, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, eventRes, cardRes] = await Promise.all([
        api.get('/volunteer/events'),
        api.get('/events?status=upcoming'),
        api.get('/volunteer/idcard')
      ]);

      setRegistrations(regRes.registrations || []);
      setEvents(eventRes.events || []);
      setIdCard(cardRes.card || null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterEvent = async (eventId) => {
    try {
      await api.post(`/volunteer/events/${eventId}/register`);
      showToast('Successfully registered for the event!', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelRegistration = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    try {
      await api.delete(`/volunteer/events/${eventId}/cancel`);
      showToast('Registration cancelled successfully', 'warning');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /**
   * Renders VolunteerPassCard into a hidden off-screen container,
   * waits for all images and QR code to fully load, then captures it
   * with html2canvas and embeds the result into a PDF.
   *
   * @param {Object} reg  - Registration object
   * @param {'download'|'print'} mode
   */
  const renderPassAndGenerate = useCallback(async (reg, mode = 'download') => {
    // ── Validate required data ──────────────────────────────────────────
    if (reg !== null && reg?.eventId === undefined) {
      showToast('Event data is missing. Cannot generate pass.', 'error');
      return;
    }
    if (!volunteer) {
      showToast('Volunteer profile data is missing. Cannot generate pass.', 'error');
      return;
    }

    setGeneratingPassId(reg?._id || 'general');

    // ── Create a temporary off-screen container ─────────────────────────
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    Object.assign(container.style, {
      position:   'absolute',
      left:       '0px',
      top:        '0px',
      width:      '95mm',
      height:     '160mm',
      overflow:   'visible',
      zIndex:     '-9999',
      opacity:    '0.01',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);

    let reactRoot = null;

    try {
      // ── Mount the pass card into the container ──────────────────────
      await new Promise((resolve) => {
        const CardToRender = () => (
          <VolunteerPassCard
            user={user}
            volunteer={volunteer}
            reg={reg?._id ? reg : null}
          />
        );

        reactRoot = ReactDOM.createRoot(container);
        reactRoot.render(<CardToRender />);

        // Give React time to render + QR / images to load
        // We poll until the QR <img> has a real src and all images are loaded
        const MAX_WAIT_MS = 6000;
        const POLL_MS     = 120;
        const start       = Date.now();

        const poll = () => {
          const elapsed = Date.now() - start;

          if (elapsed > MAX_WAIT_MS) {
            // Proceed even if some images failed — better than timing out forever
            resolve();
            return;
          }

          const images = container.querySelectorAll('img');
          const qrImg  = Array.from(images).find(img => img.alt === 'QR Entry Code');

          // Check: QR is present, has a data-URL src, and all imgs are loaded
          const qrReady = qrImg && qrImg.src && qrImg.src.startsWith('data:');
          const allImgsReady = Array.from(images).every(
            img => img.complete || img.src === '' || img.src.startsWith('data:')
          );

          if (qrReady && allImgsReady) {
            // One extra tick so the browser paints everything
            requestAnimationFrame(resolve);
          } else {
            setTimeout(poll, POLL_MS);
          }
        };

        // Start polling after first paint
        setTimeout(poll, POLL_MS);
      });

      // ── Grab the rendered card element ──────────────────────────────
      const cardEl = container.firstElementChild;
      if (!cardEl) throw new Error('Pass card element not found after rendering.');

      // ── Generate PDF ────────────────────────────────────────────────
      const { generatePassPdf } = await import('../../utils/passPdfGenerator');
      const eventTitle = reg?.eventId?.title || 'volunteer_pass';
      await generatePassPdf(cardEl, {
        filename: `Volunteer_Pass_${eventTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        mode,
      });

      showToast(
        mode === 'print' ? 'Opening print dialog…' : 'Pass card downloaded successfully!',
        'success'
      );
    } catch (err) {
      console.error('Error generating pass:', err);
      showToast(`Failed to generate pass: ${err.message}`, 'error');
    } finally {
      // ── Tear down the temporary container ───────────────────────────
      if (reactRoot) {
        try { reactRoot.unmount(); } catch (_) { /* ignore */ }
      }
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      setGeneratingPassId(null);
    }
  }, [user, volunteer, showToast]);

  const handleDownloadPass = (reg) => renderPassAndGenerate(reg, 'download');
  const handlePrintPass    = (reg) => renderPassAndGenerate(reg, 'print');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = new FormData();
      Object.entries(profileForm).forEach(([key, val]) => {
        updateData.append(key, val);
      });
      if (profilePic) {
        updateData.append('profilePicture', profilePic);
      }

      await updateProfile(updateData);
      showToast('Profile updated successfully!', 'success');
      await refreshMe();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'warning');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/volunteer/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showToast('Password updated successfully!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const doubleCheck = window.confirm(
      '🚨 WARNING: This action is permanent! Deleting your account will remove your profile, registered events, and logged hours. Are you sure?'
    );
    if (!doubleCheck) return;

    try {
      await api.delete('/volunteer/delete-account');
      showToast('Account deleted successfully. We are sorry to see you go.', 'warning');
      logout();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Milestone Math
  const totalHours = volunteer?.volunteerHours || 0;
  let nextMilestone = 5;
  let currentLevel = 'Beginner';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let progressPercent = 0;

  if (totalHours >= 20) {
    currentLevel = 'Gold Ambassador';
    badgeColor = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20';
    nextMilestone = 50;
    progressPercent = Math.min(Math.round(((totalHours - 20) / 30) * 100), 100);
  } else if (totalHours >= 10) {
    currentLevel = 'Silver Helper';
    badgeColor = 'bg-slate-400/10 text-slate-600 dark:text-slate-300 border border-slate-400/20';
    nextMilestone = 20;
    progressPercent = Math.round(((totalHours - 10) / 10) * 100);
  } else if (totalHours >= 5) {
    currentLevel = 'Bronze Contributor';
    badgeColor = 'bg-amber-600/10 text-amber-700 dark:text-amber-500 border border-amber-600/20';
    nextMilestone = 10;
    progressPercent = Math.round(((totalHours - 5) / 5) * 100);
  } else {
    progressPercent = Math.round((totalHours / 5) * 100);
  }

  // Calculate dynamic stats
  const eventsJoined = registrations.filter(r => r.status === 'attended').length;
  const upcomingEvents = registrations.filter(r => r.status === 'registered').length;
  const certificatesCount = eventsJoined + (totalHours >= 5 ? 1 : 0) + (totalHours >= 10 ? 1 : 0) + (totalHours >= 20 ? 1 : 0);

  // Group monthly hours
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyHours = Array(12).fill(0);
  let hasHoursData = false;

  registrations.forEach(r => {
    if (r.status === 'attended' && r.hoursLogged && r.eventId?.date) {
      const monthIndex = new Date(r.eventId.date).getMonth();
      monthlyHours[monthIndex] += r.hoursLogged;
      hasHoursData = true;
    }
  });

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Hours Logged',
        data: hasHoursData ? monthlyHours : [0, 0, 0, 1, 2.5, totalHours || 6, 0, 0, 0, 0, 0, 0], // fallback simulated data for visualization
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(156, 163, 175, 0.1)' }, ticks: { font: { size: 10 } } }
    }
  };

  // Recent Activity Feed builder
  const activities = [];
  if (user?.createdAt) {
    activities.push({
      id: 'joined',
      type: 'system',
      title: 'Joined VRS Flow Network',
      desc: 'Created volunteer profile and accepted community service charter.',
      date: new Date(user.createdAt)
    });
  }

  registrations.forEach(reg => {
    if (reg.createdAt) {
      activities.push({
        id: `reg-${reg._id}`,
        type: 'registration',
        title: `Registered for Event`,
        desc: `Registered for "${reg.eventId?.title || 'Community Project'}"`,
        date: new Date(reg.createdAt)
      });
    }
    if (reg.status === 'attended' && reg.updatedAt) {
      activities.push({
        id: `att-${reg._id}`,
        type: 'attendance',
        title: `Event Attended & Hours Logged`,
        desc: `Completed service at "${reg.eventId?.title || 'Community Project'}" logging ${reg.hoursLogged} hours.`,
        date: new Date(reg.updatedAt)
      });
    }
  });

  if (totalHours >= 5) {
    activities.push({
      id: 'milestone-5',
      type: 'milestone',
      title: 'Bronze Helper Level Reached',
      desc: 'Crossed the 5 hours community service threshold.',
      date: new Date(new Date(user?.createdAt || Date.now()).getTime() + 2 * 24 * 60 * 60 * 1000)
    });
  }

  const sortedActivities = activities
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  // Certificates List Builder
  const earnableCertificates = [];
  
  // Milestone certificates
  if (totalHours >= 5) {
    earnableCertificates.push({
      id: 'milestone-bronze',
      type: 'milestone',
      title: 'Bronze Milestone Service Certificate',
      date: new Date(new Date(user?.createdAt || Date.now()).getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      subtitle: 'For outstanding community contribution crossing 5 hours.',
      ref: 'VRS-BRONZE-10029'
    });
  }
  if (totalHours >= 10) {
    earnableCertificates.push({
      id: 'milestone-silver',
      type: 'milestone',
      title: 'Silver Milestone Service Certificate',
      date: new Date(new Date(user?.createdAt || Date.now()).getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      subtitle: 'For outstanding community contribution crossing 10 hours.',
      ref: 'VRS-SILVER-10034'
    });
  }

  // Event certificates
  registrations.forEach(reg => {
    if (reg.status === 'attended') {
      earnableCertificates.push({
        id: `cert-${reg._id}`,
        type: 'event',
        title: `Certificate of Appreciation: ${reg.eventId?.title}`,
        date: new Date(reg.eventId?.date || Date.now()).toLocaleDateString(),
        subtitle: `Participation and log contribution of ${reg.hoursLogged} hours.`,
        ref: `VRS-EVT-${reg._id.substring(18, 24).toUpperCase()}`
      });
    }
  });

  if (loading && registrations.length === 0) {
    return <LoadingSpinner fullPage />;
  }

  const registeredEventIds = registrations.map(r => r.eventId?._id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hello, {user?.name || 'Volunteer'}!</h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 font-light mt-1">
            Track your volunteer details, registered events, achievements, and statistics.
          </p>
        </div>
        
        {volunteer?.approvalStatus === 'pending' && (
          <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-yellow-800 dark:text-yellow-400 animate-pulse-subtle">
            <ShieldAlert className="w-4 h-4" />
            Application Review Pending
          </div>
        )}
      </div>

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
              <User className="w-4 h-4" />
              Dashboard Overview
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/10'
                : 'text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              Explore Events
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
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
              Certificates Grid
            </div>
            {certificatesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-3xs bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-bold">
                {certificatesCount}
              </span>
            )}
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
              <Sliders className="w-4 h-4" />
              Platform Settings
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* TAB 1: Profile Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{eventsJoined}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Events Joined</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                    <Calendar className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{upcomingEvents}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Upcoming</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{totalHours}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Hours Logged</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl glass-card flex items-center gap-4 hover-scale shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold">{certificatesCount}</span>
                    <span className="text-3xs text-slate-500 uppercase tracking-wider font-semibold">Certificates</span>
                  </div>
                </div>
              </div>

              {/* Profile card & Milestone progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between space-y-6">
                  <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                    <div className="w-20 h-20 rounded-full border-2 border-primary-500/25 overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-md">
                      <img
                        src={profilePicPreview ? (profilePicPreview.startsWith('blob:') ? profilePicPreview : `${API_ROOT}${profilePicPreview}`) : '/uploads/profile_pics/default.png'}
                        alt={user?.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/uploads/profile_pics/default.png'; }}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <h3 className="text-xl font-bold">{user?.name}</h3>
                        {volunteer?.approvalStatus === 'approved' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/25">
                            <CheckCircle className="w-2.5 h-2.5 fill-current" /> Verified
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{user?.email}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">📞 {volunteer?.phoneNumber || volunteer?.phone || 'No phone registered'}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">📍 {volunteer?.address ? `${volunteer.address.city}, ${volunteer.address.state}` : 'No address registered'}</span>
                      <span className="block text-2xs text-slate-450 font-light pt-1">
                        Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4.5 h-4.5 text-primary-500 animate-spin-slow" />
                        <span className="font-bold">Volunteer Level:</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-3xs uppercase tracking-wider ${badgeColor}`}>
                          {currentLevel}
                        </span>
                      </div>
                      <span className="text-slate-500">{totalHours} / {nextMilestone} hrs</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="block text-3xs text-slate-450 dark:text-slate-400 text-right font-medium">
                      {progressPercent}% towards next badge milestone ({nextMilestone} hours)
                    </span>
                  </div>
                </div>

                {/* Digital ID Card card */}
                {idCard && (
                  <div className="glass-card p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-40 h-56 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 shadow-xl flex flex-col justify-between overflow-hidden border border-white/10 select-none">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/10 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center justify-between">
                        <span className="text-3xs font-extrabold uppercase tracking-widest text-primary-400">Pass</span>
                        <Heart className="w-3 h-3 text-primary-500 fill-current animate-pulse" />
                      </div>
                      <div className="flex flex-col items-center text-center my-1 space-y-1">
                        <div className="w-12 h-12 rounded-full border border-white/20 overflow-hidden bg-slate-800 shadow">
                          <img
                            src={idCard.profilePicture ? `${API_ROOT}${idCard.profilePicture}` : '/uploads/profile_pics/default.png'}
                            alt={idCard.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = '/uploads/profile_pics/default.png'; }}
                          />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold leading-tight">{idCard.name}</h4>
                          <span className="text-[8px] text-slate-400 font-light">{idCard.preferredCategory}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/15 pt-1.5">
                        <span className="text-[6px] font-mono text-slate-400">ID: {idCard.volunteerId.substring(0, 8)}</span>
                        {idCard.qrCodeUrl && (
                          <div className="w-8 h-8 bg-white p-0.5 rounded shadow">
                            <img src={idCard.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // null reg = render as a generic Volunteer ID Card (no event data)
                        renderPassAndGenerate(null, 'print');
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Print Pass Card
                    </button>
                  </div>
                )}
              </div>

              {/* Chart & Timeline Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Volunteer Hours Chart */}
                <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4.5 h-4.5 text-primary-500" />
                      Monthly Volunteering Hours
                    </h3>
                    {!hasHoursData && (
                      <span className="text-3xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-0.5 rounded-full">
                        Simulated Preview
                      </span>
                    )}
                  </div>
                  <div className="h-60 relative">
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                <div className="glass-card p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 space-y-4 flex flex-col justify-between">
                  <h3 className="text-base font-bold flex items-center gap-1.5">
                    <Clock className="w-4.5 h-4.5 text-primary-500 animate-spin-slow" />
                    Recent Timeline
                  </h3>
                  <div className="flex-1 timeline-trail space-y-4 relative">
                    {sortedActivities.map((act) => (
                      <div key={act.id} className="flex gap-4 items-start relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                          act.type === 'attendance' ? 'bg-green-50 text-green-600 dark:bg-green-950/20' :
                          act.type === 'registration' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' :
                          act.type === 'milestone' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20'
                        }`}>
                          {act.type === 'attendance' ? <FileCheck className="w-4.5 h-4.5" /> :
                           act.type === 'registration' ? <CalendarCheck className="w-4.5 h-4.5" /> :
                           act.type === 'milestone' ? <Award className="w-4.5 h-4.5" /> :
                           <UserCheck className="w-4.5 h-4.5" />}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold truncate">{act.title}</h4>
                          <p className="text-3xs text-slate-550 dark:text-slate-400 font-light line-clamp-2 leading-relaxed">
                            {act.desc}
                          </p>
                          <span className="block text-[9px] text-slate-400 font-medium">
                            {new Date(act.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Announcements — read-only panel for volunteers */}
              <AnnouncementsPanel isAdmin={false} />

              {/* Registered Events list */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">My Registered Project Events</h3>
                {registrations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl glass text-sm text-slate-500 dark:text-slate-400">
                    You have not registered for any events yet. Explore upcoming opportunities to get started!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {registrations.map(reg => (
                      <div key={reg._id} className="p-6 rounded-2xl glass-card flex flex-col justify-between space-y-4 hover-scale border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                        <div className="space-y-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            reg.status === 'attended' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400' :
                            reg.status === 'no-show' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400' :
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {reg.status.toUpperCase()}
                          </span>
                          <h4 className="font-bold text-base">{reg.eventId?.title || 'Unknown Event'}</h4>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 font-light">
                            Category: {reg.eventId?.category}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 font-light">
                            📅 Date: {reg.eventId ? new Date(reg.eventId.date).toLocaleDateString() : 'N/A'} ({reg.eventId?.startTime} - {reg.eventId?.endTime})
                          </span>
                          {reg.hoursLogged > 0 && (
                            <span className="block text-xs text-green-600 dark:text-green-400 font-semibold mt-2">
                              ✓ Credited {reg.hoursLogged} hours
                            </span>
                          )}
                        </div>

                        {reg.status === 'registered' && (
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                              onClick={() => handleDownloadPass(reg)}
                              disabled={generatingPassId === reg._id}
                              className="text-xs text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {generatingPassId === reg._id ? 'Generating...' : 'Download Pass'}
                            </button>
                            <button
                              onClick={() => handleCancelRegistration(reg.eventId?._id)}
                              className="text-xs text-red-500 font-semibold border border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 py-2.5 rounded-xl transition-all"
                            >
                              Cancel Attendance
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Explore Events */}
          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold">Upcoming Volunteering Opportunities</h3>
              {events.length === 0 ? (
                <div className="p-8 text-center rounded-2xl glass text-sm text-slate-500 dark:text-slate-450">
                  No upcoming events listed at this time. Check back later!
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map(event => {
                    const isRegistered = registeredEventIds.includes(event._id);
                    return (
                      <div key={event._id} className="p-6 rounded-2xl glass-card border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div className="space-y-2 max-w-xl">
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50">
                            {event.category}
                          </span>
                          <h4 className="text-base font-bold">{event.title}</h4>
                          <p className="text-xs text-slate-550 dark:text-slate-400 font-light line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold pt-1">
                            <span>📅 {new Date(event.date).toLocaleDateString()} at {event.startTime}</span>
                            <span>📍 {event.location}</span>
                            <span>👥 Capacity: {event.capacity} volunteers</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                          {isRegistered ? (
                            <button
                              disabled
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30 flex items-center justify-center gap-1.5"
                            >
                              <FileCheck className="w-4 h-4" />
                              Registered
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRegisterEvent(event._id)}
                              disabled={volunteer?.approvalStatus !== 'approved'}
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-500/10"
                            >
                              Register Now
                            </button>
                          )}
                          {volunteer?.approvalStatus !== 'approved' && (
                            <span className="text-[10px] text-red-500 font-medium">Requires profile approval</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Certificates Grid */}
          {activeTab === 'certificates' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">My Earned Certificates</h3>
                <span className="text-xs text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  Total Issued: {certificatesCount}
                </span>
              </div>

              {earnableCertificates.length === 0 ? (
                <div className="p-12 text-center rounded-2xl glass border border-slate-200 dark:border-slate-800 space-y-4">
                  <Award className="w-12 h-12 mx-auto text-slate-400 opacity-40" />
                  <h4 className="text-base font-bold">No Certificates Available Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-light leading-relaxed">
                    Certificates are generated once you successfully attend volunteer events or reach milestones (starting at 5 logged hours). Get active in upcoming projects to earn your credentials!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {earnableCertificates.map(cert => (
                    <div key={cert.id} className="p-6 rounded-2xl glass-card border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between space-y-5 hover-scale">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            cert.type === 'milestone'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-500 border border-amber-200/50'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-500 border border-indigo-200/50'
                          }`}>
                            {cert.type}
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono">{cert.ref}</span>
                        </div>
                        <h4 className="font-bold text-base line-clamp-2 leading-snug">{cert.title}</h4>
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-light leading-relaxed">
                          {cert.subtitle}
                        </p>
                        <span className="block text-[10px] text-slate-500 font-medium">Issued: {cert.date}</span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          onClick={() => setSelectedCert(cert)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> Preview
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCert(cert);
                            setTimeout(() => window.print(), 100);
                          }}
                          className="flex-1 py-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/25 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                        <button
                          onClick={() => {
                            const hash = btoa(`${cert.ref}-${cert.date}`).substring(0, 16);
                            const url = `${window.location.origin}/verify/cert/${hash}`;
                            navigator.clipboard.writeText(url);
                            showToast('Verification URL copied to clipboard!', 'success');
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-300 rounded-xl"
                          title="Copy Shareable Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-fade-in">
              {/* Profile details */}
              <form onSubmit={handleProfileUpdate} className="glass-card p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-6">
                <h3 className="text-lg font-bold">Profile Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-inner">
                        <img
                          src={profilePicPreview ? (profilePicPreview.startsWith('blob:') ? profilePicPreview : `${API_ROOT}${profilePicPreview}`) : '/uploads/profile_pics/default.png'}
                          alt={user?.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/uploads/profile_pics/default.png'; }}
                        />
                      </div>
                      <label className="h-10 px-4 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all">
                        Change Picture
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setProfilePic(e.target.files[0]);
                              setProfilePicPreview(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Phone</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phoneNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Preferred Category</label>
                    <input
                      type="text"
                      value={profileForm.preferredCategory}
                      onChange={(e) => setProfileForm({ ...profileForm, preferredCategory: e.target.value })}
                      placeholder="e.g. Education, Environment"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.skills}
                      onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Languages</label>
                    <input
                      type="text"
                      value={profileForm.languages}
                      onChange={(e) => setProfileForm({ ...profileForm, languages: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Motivation Statement</label>
                  <textarea
                    rows={3}
                    value={profileForm.motivationStatement}
                    onChange={(e) => setProfileForm({ ...profileForm, motivationStatement: e.target.value })}
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-primary-500/10"
                >
                  Save Profile Details
                </button>
              </form>

              {/* Password Change Edit */}
              <form onSubmit={handlePasswordSubmit} className="glass-card p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm space-y-4">
                <h3 className="text-lg font-bold">Change Password</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-primary-500/10"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              {/* Danger Zone */}
              <div className="p-8 rounded-2xl border border-red-500/10 bg-red-50/10 dark:bg-red-950/5 space-y-4">
                <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-sm text-slate-550 dark:text-slate-400 font-light">
                  If you delete your account, your profile metadata and all volunteer hours records will be wiped from our database. This action is irreversible.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-650 hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/15"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account Permanently
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SELECTED CERTIFICATE MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print-certificate-area">
          <div ref={certificateRef} className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl border-8 border-double border-amber-600 w-full max-w-4xl shadow-2xl relative flex flex-col justify-between overflow-hidden select-none print:m-0 print:border-none print:shadow-none">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

            {/* Certificate content */}
            <div className="text-center space-y-6 relative z-10">
              <Award className="w-16 h-16 text-amber-600 mx-auto" />
              <div className="space-y-1">
                <span className="text-2xs font-extrabold uppercase tracking-widest text-slate-400">VRS Flow volunteer network</span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-wide uppercase text-slate-800">Certificate of Appreciation</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 italic max-w-md mx-auto">
                This certificate is proudly presented to
              </p>
              <h3 className="text-xl sm:text-3xl font-extrabold border-b border-slate-200 pb-2 w-fit mx-auto min-w-[200px] text-indigo-950">
                {user?.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                for their outstanding contribution and dedication as a volunteer during their service.
                Their efforts have made a significant positive impact in community outreach and development.
              </p>
              <div className="text-xs text-slate-500 italic">
                "{selectedCert.title}"
              </div>
            </div>

            {/* Signatures & Footer details */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mt-12 border-t border-slate-100 pt-6 relative z-10">
              <div className="text-center sm:text-left space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Date Issued</span>
                <span className="text-xs font-semibold">{selectedCert.date}</span>
              </div>

              {/* QR Code Verification */}
              <div className="flex items-center gap-3">
                <div className="text-right space-y-0.5">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Secure Ref</span>
                  <span className="block text-[9px] font-mono font-semibold">{selectedCert.ref}</span>
                </div>
                <div className="w-14 h-14 bg-slate-50 border border-slate-200 p-1 rounded shadow-inner flex items-center justify-center">
                  {/* Ornate verification block simulated */}
                  <div className="text-[6px] font-mono text-center text-slate-400">VRS SEAL SECURE</div>
                </div>
              </div>

              <div className="text-center sm:text-right space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Authorized Signatory</span>
                <span className="text-xs font-semibold border-t border-slate-200 pt-0.5">Volunteer System Director</span>
              </div>
            </div>

            {/* Action controls (Hidden on printing) */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <button
                onClick={() => handleDownloadCertificate('download')}
                disabled={generatingCert}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center disabled:opacity-50"
                title="Download Certificate PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownloadCertificate('print')}
                disabled={generatingCert}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center disabled:opacity-50"
                title="Print Certificate"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
