import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Calendar, Award, Clock, ArrowRight, ShieldCheck, Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { api, API_ROOT } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const LandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { showToast } = useNotification();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sendingContact, setSendingContact] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (pathname === '/events') {
        const el = document.getElementById('events');
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else if (hash) {
        const id = hash.replace('#', '');
        const el = document.getElementById(id);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };

    handleScroll();
  }, [location]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.get('/events?status=upcoming');
        setEvents(data.events.slice(0, 3)); // show top 3 upcoming
      } catch (err) {
        console.warn('Fallback to local mock events for UI display');
        // Fallback mock events
        setEvents([
          {
            _id: '1',
            title: 'Green City Tree Plantation',
            description: 'Help plant 500 trees in the urban parks around Metropolis.',
            category: 'Environment',
            date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Central Park East',
            startTime: '09:00',
            image: '/assets/tree_plantation.png'
          },
          {
            _id: '2',
            title: 'Children Literacy Drive',
            description: 'Tutor elementary children in reading and comprehension skills.',
            category: 'Education',
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Downtown Library Annex',
            startTime: '14:00',
            image: '/assets/children_literacy_drive.png'
          },
          {
            _id: '3',
            title: 'Community Soups Kitchen',
            description: 'Assist in food preparation and serving local shelters.',
            category: 'Community Outreach',
            date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            location: 'Mercy Soup Kitchen',
            startTime: '11:00',
            image: '/assets/community_soup_kitchen.png'
          }
        ]);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    const nameVal = contactForm.name.trim();
    const emailVal = contactForm.email.trim();
    const messageVal = contactForm.message.trim();

    // Client-side validations
    if (!nameVal || !emailVal || !messageVal) {
      showToast('All fields are required.', 'warning');
      return;
    }

    if (nameVal.length < 3) {
      showToast('Full name must be at least 3 characters.', 'warning');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(emailVal)) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (messageVal.length < 10) {
      showToast('Message must be at least 10 characters.', 'warning');
      return;
    }

    if (messageVal.length > 1000) {
      showToast('Message cannot exceed 1000 characters.', 'warning');
      return;
    }

    setSendingContact(true);

    try {
      const response = await api.post('/contact', {
        fullName: nameVal,
        email: emailVal,
        message: messageVal
      });

      showToast(response.message || "Your message has been sent successfully. We'll get back to you within 24 hours.", 'success');
      setContactForm({ name: '', email: '', message: '' });
    } catch (err) {
      showToast(err.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setSendingContact(false);
    }
  };

  const benefits = [
    { icon: <Award className="w-6 h-6 text-primary-500" />, title: 'Earn Certificates & Badges', desc: 'Gain official recognition and unlock badges for every volunteer hour logged.' },
    { icon: <Clock className="w-6 h-6 text-primary-500" />, title: 'Flexible Schedules', desc: 'Find opportunities that fit your availability: weekdays, weekends, or evenings.' },
    { icon: <ShieldCheck className="w-6 h-6 text-primary-500" />, title: 'Verified Impact', desc: 'Track your total hours and view verified stats in your personal dashboard.' }
  ];

  const testimonials = [
    { quote: "VRS Flow made it so easy for me to find local beach cleanups. I've logged over 30 hours and earned my Silver Helper badge!", author: "Sarah Jenkins", role: "Environmental Volunteer" },
    { quote: "Managing volunteer schedules was a nightmare before. The admin dashboard handles approval and attendance tracking beautifully.", author: "Marcus Broady", role: "Event Administrator" }
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section id="home" className="scroll-mt-20 relative pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50">
          <Heart className="w-3.5 h-3.5 fill-current" />
          Join The Movement
        </span>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-4xl leading-tight">
          Make a Difference in Your{' '}
          <span className="bg-gradient-to-r from-primary-500 to-indigo-600 bg-clip-text text-transparent">
            Community Today
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-350 max-w-2xl font-light">
          Connect with local events, track your volunteering hours, earn certificates, and help build a stronger, more supportive community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 px-8 h-12 rounded-xl text-base font-medium text-white bg-gradient-to-tr from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 shadow-xl shadow-primary-500/10 hover:shadow-primary-600/25 transition-all hover:scale-102"
          >
            Become a Volunteer
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/events"
            className="flex items-center justify-center px-8 h-12 rounded-xl text-base font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all hover:scale-102 shadow-sm"
          >
            Explore Events
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Our Mission & Impact</h2>
          <p className="text-slate-600 dark:text-slate-355 text-base font-light leading-relaxed">
            At VRS Flow, we believe that collective action has the power to solve some of our society\'s most pressing challenges. Our platform bridges the gap between passionate citizens and local community organizations.
          </p>
          <p className="text-slate-600 dark:text-slate-355 text-base font-light leading-relaxed">
            Whether you want to teach children, clean up local parks, or coordinate medical camps, we provide the tools to search, register, and track your impact easily.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-4 text-center">
            <div className="p-4 rounded-2xl glass border-slate-100">
              <span className="block text-3xl font-extrabold text-primary-500">1,500+</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Volunteers</span>
            </div>
            <div className="p-4 rounded-2xl glass border-slate-100">
              <span className="block text-3xl font-extrabold text-primary-500">250+</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Events Run</span>
            </div>
            <div className="p-4 rounded-2xl glass border-slate-100">
              <span className="block text-3xl font-extrabold text-primary-500">10k+</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Hours Logged</span>
            </div>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl group border border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-indigo-500/20 mix-blend-multiply" />
          <img
            src="/assets/volunteers_cooperating.png"
            alt="Volunteers cooperating"
            className="w-full h-[350px] object-cover group-hover:scale-102 transition-transform duration-700"
          />
        </div>
      </section>

      {/* Volunteer Benefits */}
      <section className="bg-slate-100/50 dark:bg-slate-900/30 py-20 border-y border-slate-200/50 dark:border-slate-850/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold">Why Volunteer With Us?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm">
              We make the volunteering experience rewarding, trackable, and fun. Here\'s what you get when you sign up.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((b, idx) => (
              <div key={idx} className="p-8 rounded-2xl glass-card text-left space-y-4 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center shadow-inner">
                  {b.icon}
                </div>
                <h3 className="text-lg font-bold">{b.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="events" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold">Featured Upcoming Events</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Be the change. Join one of our highly requested events.</p>
          </div>
          <Link to="/events" className="hidden sm:flex items-center gap-1.5 text-primary-500 hover:text-primary-600 font-medium text-sm">
            View All Events
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map((event) => (
              <div key={event._id} className="rounded-2xl overflow-hidden glass-card hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 relative">
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-slate-900/95 shadow-sm text-primary-600 dark:text-primary-400">
                    {event.category}
                  </div>
                  <img
                    src={event.image ? (event.image.startsWith('/uploads') ? `${API_ROOT}${event.image}` : event.image) : 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow justify-between">
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold line-clamp-1">{event.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 font-light leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                  <div className="space-y-4 mt-4">
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        <span>{new Date(event.date).toLocaleDateString()} at {event.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                    <Link
                      to={`/register`}
                      className="block text-center w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/10"
                    >
                      Register to Participate
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900 text-white py-20 rounded-3xl max-w-7xl mx-auto px-6 sm:px-12 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500/20 rounded-full blur-2xl" />
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <MessageSquare className="w-10 h-10 text-primary-400 mx-auto fill-current opacity-50 animate-pulse-subtle" />
          <h2 className="text-2xl sm:text-3xl font-extrabold">What Our Community Says</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left pt-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <p className="text-sm font-light text-slate-300 italic leading-relaxed">"{t.quote}"</p>
                <div>
                  <h4 className="text-sm font-bold text-white">{t.author}</h4>
                  <span className="text-xs text-primary-400">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Get in Touch</h2>
          <p className="text-slate-650 dark:text-slate-400 text-sm font-light">
            Have questions about volunteer certificates, organizing an event, or account settings? Send us a message and our support team will respond within 24 hours.
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-500" />
              </div>
              <span className="text-sm">support@vrsflow.org</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary-500" />
              </div>
              <span className="text-sm">+1 (555) 019-2834</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-500" />
              </div>
              <span className="text-sm">100 Civic Plaza, Metropolis, NY</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleContactSubmit} className="glass-card p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
            <textarea
              required
              rows={4}
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
              placeholder="How can we help you?"
            />
          </div>
          <button
            type="submit"
            disabled={sendingContact}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/10"
          >
            {sendingContact ? 'Sending...' : 'Send Message'}
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};

export default LandingPage;
