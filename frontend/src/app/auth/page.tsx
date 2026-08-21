"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './auth.css';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    let endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    let payload: any = isLogin ? { email, password } : { name, email, password };
    
    if (isReset) {
      endpoint = '/api/auth/reset-password';
      payload = { email, password };
    }

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isReset) {
        setSuccess('Password reset successfully. Please log in.');
        setIsReset(false);
        setPassword('');
        return;
      }

      // Store JWT token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard based on role
      const role = data.user.role;
      if (role === 'ADMIN') router.push('/dashboard/admin');
      else if (role === 'OPERATIONS_MANAGER') router.push('/dashboard/operations');
      else if (role === 'WAREHOUSE_SUPERVISOR') router.push('/dashboard/warehouse');
      else if (role === 'QA_TEAM') router.push('/dashboard/qa');
      else router.push('/');

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="10" height="10" rx="2" fill="var(--primary-color)"/>
              <rect x="14" width="10" height="10" rx="2" fill="var(--tertiary-color)"/>
              <rect y="14" width="10" height="10" rx="2" fill="var(--secondary-color)"/>
              <rect x="14" y="14" width="10" height="10" rx="2" fill="var(--primary-color)"/>
            </svg>
            FlowLens
          </Link>
          <h1 className="auth-title">
            {isReset ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="auth-subtitle">
            {isReset 
              ? 'Enter your email and new password.' 
              : isLogin 
                ? 'Enter your details to access your dashboard.' 
                : 'Start optimizing your warehouse operations today.'}
          </p>
        </div>

        {!isReset && (
          <div className="auth-toggle">
            <div 
              className="auth-toggle-slider" 
              style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button 
              type="button"
              className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            >
              Log In
            </button>
            <button 
              type="button"
              className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            >
              Sign Up
            </button>
          </div>
        )}

        {error && <div className="auth-error" style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {success && <div className="auth-success" style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{success}</div>}

        {isReset ? (
          <form className="auth-form" key="reset" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input 
                type="email" 
                id="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">New Password</label>
              <input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button 
              type="button" 
              className="btn auth-submit" 
              style={{ marginTop: '0.5rem', background: 'transparent', color: 'var(--text-secondary)' }}
              onClick={() => setIsReset(false)}
            >
              Back to Login
            </button>
          </form>
        ) : isLogin ? (
          <form className="auth-form" key="login" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input 
                type="email" 
                id="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Password</label>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem' }}
                  onClick={() => { setIsReset(true); setError(''); setSuccess(''); }}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form" key="signup" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input 
                type="email" 
                id="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                placeholder="Create a strong password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          By continuing, you agree to FlowLens&apos;s <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
