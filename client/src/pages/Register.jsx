import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, ClipboardList, ShieldCheck, ChevronRight, ChevronLeft, Upload, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Register = () => {
  const { register } = useAuth();
  const { showToast } = useNotification();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    phoneNumber: '', dob: '', gender: 'prefer-not-to-say',
    street: '', city: '', state: '', country: '', pincode: '',
    emergencyName: '', emergencyRelation: '', emergencyPhone: '',
    skills: '', education: '', occupation: '',
    availability: [], preferredCategory: 'Community Outreach',
    previousExperience: '', languages: 'English',
    motivationStatement: '', termsAccepted: false
  });

  const [files, setFiles] = useState({ profilePicture: null, govIdFile: null });
  const [profilePreview, setProfilePreview] = useState(null);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const getMaxDob = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 14);
    return date.toISOString().split('T')[0];
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'phoneNumber':
        if (!value) return 'Phone is required';
        if (!/^\d+$/.test(value)) return 'Only numbers allowed';
        if (value.length !== 10) return 'Must be 10 digits';
        return '';
      case 'dob': {
        if (!value) return 'Date of birth is required';
        const dobDate = new Date(value);
        if (isNaN(dobDate.getTime())) return 'Invalid date format';
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        if (age < 14) return 'Must be at least 14 years old';
        return '';
      }
      case 'gender':
        if (!value || value === '') return 'Gender is required';
        return '';
      case 'street':
        if (!value) return 'Street address is required';
        if (value.trim().length < 5) return 'Min 5 characters';
        return '';
      case 'city':
        if (!value) return 'City is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'state':
        if (!value) return 'State is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'country':
        if (!value) return 'Country is required';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'pincode':
        if (!value) return 'Pincode is required';
        if (!/^\d+$/.test(value)) return 'Only numbers allowed';
        if (value.length !== 5 && value.length !== 6) return 'Must be 5 or 6 digits';
        return '';
      case 'emergencyName':
        if (!value) return 'Emergency contact name is required';
        if (value.trim().length < 3) return 'Min 3 characters';
        return '';
      case 'emergencyRelation':
        if (!value || value.trim() === '') return 'Relation is required';
        return '';
      case 'emergencyPhone':
        if (!value) return 'Emergency phone is required';
        if (!/^\d+$/.test(value)) return 'Only numbers allowed';
        if (value.length !== 10) return 'Must be 10 digits';
        return '';
      default:
        return '';
    }
  };

  const isStep2Valid = () => {
    const step2Fields = [
      'phoneNumber', 'dob', 'gender', 'street', 'city', 'state', 'country', 'pincode',
      'emergencyName', 'emergencyRelation', 'emergencyPhone'
    ];
    return step2Fields.every(field => !validateField(field, formData[field]));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;

    // Input constraints
    if (name === 'phoneNumber' || name === 'emergencyPhone') {
      val = val.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pincode') {
      val = val.replace(/\D/g, '').slice(0, 6);
    } else if (name === 'city' || name === 'state' || name === 'country') {
      val = val.replace(/[^a-zA-Z\s]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: val
    }));

    if (step === 2) {
      const error = validateField(name, val);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (step === 2) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
      if (name === 'profilePicture') {
        setProfilePreview(URL.createObjectURL(selectedFiles[0]));
      }
    }
  };

  const handleCheckboxGroupChange = (val) => {
    setFormData(prev => {
      const arr = [...prev.availability];
      if (arr.includes(val)) {
        return { ...prev, availability: arr.filter(item => item !== val) };
      } else {
        return { ...prev, availability: [...arr, val] };
      }
    });
  };

  // Basic step validations
  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        showToast('Please fill out all credentials', 'warning');
        return false;
      }
      if (formData.password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return false;
      }
    }
    if (step === 2) {
      const step2Fields = [
        'phoneNumber', 'dob', 'gender', 'street', 'city', 'state', 'country', 'pincode',
        'emergencyName', 'emergencyRelation', 'emergencyPhone'
      ];
      const newErrors = {};
      const newTouched = {};
      let firstInvalidField = null;

      step2Fields.forEach(field => {
        const err = validateField(field, formData[field]);
        if (err) {
          newErrors[field] = err;
          newTouched[field] = true;
          if (!firstInvalidField) {
            firstInvalidField = field;
          }
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...newErrors }));
        setTouched(prev => ({ ...prev, ...newTouched }));
        showToast('Please fix the errors in the form before proceeding.', 'warning');
        
        if (firstInvalidField) {
          const element = document.getElementsByName(firstInvalidField)[0];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.focus();
          }
        }
        return false;
      }
      
      showToast('Personal details validated successfully!', 'success');
    }
    if (step === 3) {
      if (!formData.preferredCategory) {
        showToast('Please select a volunteer category preference', 'warning');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    if (!formData.motivationStatement) {
      showToast('Please provide a motivation statement', 'warning');
      const el = document.getElementsByName('motivationStatement')[0];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }
    if (!formData.termsAccepted) {
      showToast('You must accept the terms & conditions to register', 'warning');
      const el = document.getElementsByName('termsAccepted')[0];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setLoading(true);

    try {
      const dataPayload = new FormData();
      // Attach all regular fields
      Object.entries(formData).forEach(([key, val]) => {
          // For array fields, append each value using the same key name (no [] suffix)
          if (Array.isArray(val)) {
            val.forEach(v => dataPayload.append(key, v));
          } else {
            // Ensure boolean termsAccepted is sent as string 'true' for backend validation
            if (key === 'termsAccepted') {
              dataPayload.append(key, val ? 'true' : 'false');
            } else {
              dataPayload.append(key, val);
            }
          }
        });

      // Attach file fields
      if (files.profilePicture) dataPayload.append('profilePicture', files.profilePicture);
      if (files.govIdFile) dataPayload.append('govIdFile', files.govIdFile);

      await register(dataPayload);
      showToast('Registration Successful!', 'success');
      setSuccess(true);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = ['Environment', 'Education', 'Healthcare', 'Disaster Relief', 'Community Outreach'];
  const availabilityOptions = [
    { label: 'Weekdays', value: 'weekdays' },
    { label: 'Weekends', value: 'weekends' },
    { label: 'Evenings', value: 'evenings' },
    { label: 'Flexible / On Call', value: 'flexible' }
  ];

  if (success) {
    return (
      <div className="max-w-xl mx-auto mt-20 px-4 sm:px-6">
        <div className="glass-card p-10 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Registration Submitted Successfully!</h1>
          <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed">
            Your application has been submitted successfully and is now under review by the administration.
          </p>
          <div className="pt-6">
            <Link
              to="/volunteer/dashboard"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/10"
            >
              Go to Volunteer Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 px-4 sm:px-6">
      <div className="glass-card p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Volunteer Registration</h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 font-light">
            Step {step} of 4: {step === 1 ? 'Credentials' : step === 2 ? 'Personal Details' : step === 3 ? 'Skills & Availability' : 'Submit Application'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-500 to-indigo-650 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Account Credentials */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary-500 font-semibold text-sm">
                <User className="w-4 h-4" />
                <span>Account Credentials</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Choose Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 text-primary-500 font-semibold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Personal & Address Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.phoneNumber && errors.phoneNumber
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="9876543210"
                  />
                  {touched.phoneNumber && errors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.phoneNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dob"
                    required
                    max={getMaxDob()}
                    value={formData.dob}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.dob && errors.dob
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                  />
                  {touched.dob && errors.dob && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.dob}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.gender && errors.gender
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer Not To Say</option>
                  </select>
                  {touched.gender && errors.gender && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.gender}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    required
                    value={formData.street}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.street && errors.street
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="123 Pine St"
                  />
                  {touched.street && errors.street && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.street}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.city && errors.city
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="Metropolis"
                  />
                  {touched.city && errors.city && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.state && errors.state
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="NY"
                  />
                  {touched.state && errors.state && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.state}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.country && errors.country
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="USA"
                  />
                  {touched.country && errors.country && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.country}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    value={formData.pincode}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                      touched.pincode && errors.pincode
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                    placeholder="10001"
                  />
                  {touched.pincode && errors.pincode && (
                    <p className="text-red-500 text-xs mt-1 font-medium">{errors.pincode}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                <div className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Emergency Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyName"
                      required
                      value={formData.emergencyName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                        touched.emergencyName && errors.emergencyName
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                      }`}
                      placeholder="Jane Doe"
                    />
                    {touched.emergencyName && errors.emergencyName && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.emergencyName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Relation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyRelation"
                      required
                      value={formData.emergencyRelation}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                        touched.emergencyRelation && errors.emergencyRelation
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                      }`}
                      placeholder="Spouse/Parent"
                    />
                    {touched.emergencyRelation && errors.emergencyRelation && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.emergencyRelation}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      required
                      value={formData.emergencyPhone}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full h-11 px-4 rounded-xl border bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 text-sm ${
                        touched.emergencyPhone && errors.emergencyPhone
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-primary-500/20 focus:border-primary-500'
                      }`}
                      placeholder="5550199"
                    />
                    {touched.emergencyPhone && errors.emergencyPhone && (
                      <p className="text-red-500 text-xs mt-1 font-medium">{errors.emergencyPhone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Skills & Availability */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 text-primary-500 font-semibold text-sm">
                <ClipboardList className="w-4 h-4" />
                <span>Skills, Languages & Preferences</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Preferred Category</label>
                  <select
                    name="preferredCategory"
                    value={formData.preferredCategory}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  >
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="First Aid, Event Planning, Teaching"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Languages (Comma-separated)</label>
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Education Level</label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="Bachelors, Student, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                    placeholder="Teacher, Engineer, Student"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">Weekly Availability</label>
                <div className="grid grid-cols-2 gap-3">
                  {availabilityOptions.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.availability.includes(opt.value)
                          ? 'border-primary-500 bg-primary-50/20 text-primary-700 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.availability.includes(opt.value)}
                        onChange={() => handleCheckboxGroupChange(opt.value)}
                        className="hidden"
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Previous Volunteering Experience</label>
                <textarea
                  name="previousExperience"
                  rows={2}
                  value={formData.previousExperience}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  placeholder="Tell us about any previous events or charities you worked with..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: Files, Motivation & Acceptance */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 text-primary-500 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Documents & Final Submission</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Profile Pic Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <label className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-sm font-semibold cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                      <input
                        type="file"
                        name="profilePicture"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Gov ID Proof Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Government ID Proof (Optional)</label>
                  <label className="flex items-center justify-center gap-1.5 h-16 w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs font-semibold cursor-pointer text-slate-500">
                    <FileText className="w-4 h-4 text-primary-500" />
                    {files.govIdFile ? files.govIdFile.name : 'Upload Document (PDF/Doc/JPG)'}
                    <input
                      type="file"
                      name="govIdFile"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Motivation Statement</label>
                <textarea
                  name="motivationStatement"
                  required
                  rows={3}
                  value={formData.motivationStatement}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                  placeholder="Explain why you want to join our organization as a volunteer..."
                />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-850/50 cursor-pointer">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  className="w-4 h-4 mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  I hereby accept the Volunteer Code of Conduct and confirm that all information provided is accurate and true.
                </span>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center justify-center gap-1.5 px-6 h-11 rounded-xl text-sm font-semibold border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 2 && !isStep2Valid()}
                className={`flex items-center justify-center gap-1.5 px-6 h-11 rounded-xl text-sm font-semibold transition-all ml-auto ${
                  step === 2 && !isStep2Valid()
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed shadow-none border border-slate-300/10'
                    : 'text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/10 hover:scale-102 cursor-pointer'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-8 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-tr from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 transition-all shadow-lg shadow-primary-500/10 hover:shadow-primary-600/25 hover:scale-102 ml-auto"
              >
                {loading ? 'Submitting Application...' : 'Submit Registration'}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 hover:underline font-bold">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
