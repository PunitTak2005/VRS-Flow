import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { api } from '../../services/api';

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', targetId: 'home', path: '/#home' },
    { name: 'About', targetId: 'about', path: '/#about' },
    { name: 'Events', targetId: 'events', path: '/#events' },
    { name: 'Contact', targetId: 'contact', path: '/#contact' }
  ];

  // IntersectionObserver to detect currently active section
  useEffect(() => {
    // If we're not on the main/landing page or events alias, don't observe sections
    if (location.pathname !== '/' && location.pathname !== '/events') {
      setActiveSection('');
      return;
    }

    const sections = ['home', 'about', 'events', 'contact'];
    
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -50% 0px', // Trigger active highlight when section is centered
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  const isLinkActive = (link) => {
    if (location.pathname === '/' || location.pathname === '/events') {
      return activeSection === link.targetId;
    }
    return location.pathname === link.path || (location.pathname + location.hash) === link.path;
  };

  const handleNavLinkClick = (e, targetId, path) => {
    if (location.pathname === '/' || location.pathname === '/events') {
      const element = document.getElementById(targetId);
      if (element) {
        e.preventDefault();
        setIsOpen(false);
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without forcing full page reload
        window.history.pushState(null, '', `#${targetId}`);
        setActiveSection(targetId);
      }
    } else {
      // Normal routing for non-homepage paths
      setIsOpen(false);
    }
  };

  const isDashboardActive = () => {
    return location.pathname.includes('/dashboard');
  };

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/favicon.png" alt="VRS Flow Logo" className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              VRS Flow
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {loading ? (
              // Shimmer placeholder to prevent layout shifts
              <div className="h-5 w-48 bg-slate-200/50 dark:bg-slate-800/50 animate-pulse rounded-md" />
            ) : user ? (
              // Authenticated View: Dashboard only
              <div className="relative py-2">
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/volunteer/dashboard'}
                  className={`text-sm font-medium transition-all duration-300 hover:text-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-1 py-1 ${
                    isDashboardActive()
                      ? 'text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                  aria-current={isDashboardActive() ? 'page' : undefined}
                >
                  Dashboard
                </Link>
                <span
                  className={`absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-300 transform origin-center ${
                    isDashboardActive() ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                  }`}
                />
              </div>
            ) : (
              // Guest View: Public Links
              navLinks.map((link) => (
                <div key={link.name} className="relative py-2">
                  <Link
                    to={link.path}
                    onClick={(e) => handleNavLinkClick(e, link.targetId, link.path)}
                    className={`text-sm font-medium transition-all duration-300 hover:text-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-1 py-1 ${
                      isLinkActive(link)
                        ? 'text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                    aria-current={isLinkActive(link) ? 'page' : undefined}
                  >
                    {link.name}
                  </Link>
                  <span
                    className={`absolute bottom-0 left-1 right-1 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-300 transform origin-center ${
                      isLinkActive(link) ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                  />
                </div>
              ))
            )}
          </div>

          {/* Desktop Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />

            {loading ? (
              // Skeleton placeholder for login controls
              <div className="h-10 w-24 bg-slate-200/50 dark:bg-slate-800/50 animate-pulse rounded-xl" />
            ) : user ? (
              // Authenticated Actions
              <div className="flex items-center gap-3">
                {/* Profile Avatar Icon */}
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/volunteer/dashboard'}
                  className="flex items-center justify-center w-10 h-10 rounded-xl font-bold bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 hover:scale-105 transition-all border border-primary-200/40 dark:border-primary-800/40"
                  title="Profile"
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              // Guest Actions
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 h-10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-tr from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 flex items-center shadow-lg shadow-primary-500/10 hover:shadow-primary-600/20 hover:scale-102 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden glass border-b border-slate-200 dark:border-slate-800 animate-fade-in">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : user ? (
              // Authenticated Mobile Links
              <>
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/volunteer/dashboard'}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-base font-semibold transition-colors ${
                    isDashboardActive()
                      ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to={user.role === 'admin' ? '/admin/dashboard' : '/volunteer/dashboard'}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Profile ({user.name})
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full h-11 mt-4 rounded-xl text-base font-medium bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-655 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </>
            ) : (
              // Guest Mobile Links
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={(e) => handleNavLinkClick(e, link.targetId, link.path)}
                    className={`block px-3 py-2.5 rounded-xl text-base font-medium transition-colors ${
                      isLinkActive(link)
                        ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    aria-current={isLinkActive(link) ? 'page' : undefined}
                  >
                    {link.name}
                  </Link>
                ))}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 px-3 flex flex-col gap-3">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center w-full h-11 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center w-full h-11 rounded-xl text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/15"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
