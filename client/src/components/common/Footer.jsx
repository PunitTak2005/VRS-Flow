import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-4">
              <Link to="/" className="flex items-center gap-2 group w-fit">
                <img src="/favicon.png" alt="VRS Flow Logo" className="w-9 h-9 object-contain group-hover:scale-105 transition-transform" />
                <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  VRS Flow
                </span>
              </Link>
            </div>
            <p className="text-sm">
              Empowering volunteers to connect with impactful community projects and build a better tomorrow.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="/events" className="hover:text-white transition-colors">Volunteer Events</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Contact Support</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact Info</h3>
            <ul className="space-y-2 text-sm">
              <li>Email: contact@vrsflow.org</li>
              <li>Phone: +1 (555) 019-2834</li>
              <li>Address: 100 Civic Plaza, Metropolis, NY</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} VRS Flow. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for community impact.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
