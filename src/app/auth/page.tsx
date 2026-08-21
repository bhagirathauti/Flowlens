"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import './auth.css';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Enter your details to access your dashboard.' 
              : 'Start optimizing your warehouse operations today.'}
          </p>
        </div>

        <div className="auth-toggle">
          <div 
            className="auth-toggle-slider" 
            style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }}
          />
          <button 
            className={`auth-toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
          <button 
            className={`auth-toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {isLogin ? (
          <form className="auth-form" key="login" onSubmit={(e) => e.preventDefault()}>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input type="email" id="email" placeholder="name@company.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary auth-submit">
              Sign In
            </button>
          </form>
        ) : (
          <form className="auth-form" key="signup" onSubmit={(e) => e.preventDefault()}>
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input type="text" id="name" placeholder="John Doe" required />
            </div>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input type="email" id="email" placeholder="name@company.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="Create a strong password" required />
            </div>
            <button type="submit" className="btn btn-primary auth-submit">
              Create Account
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
