"use client";

import React, { useEffect, useState } from 'react';
import './page.css';
import Link from 'next/link';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container nav-content">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="10" height="10" rx="2" fill="var(--primary-color)"/>
              <rect x="14" width="10" height="10" rx="2" fill="var(--tertiary-color)"/>
              <rect y="14" width="10" height="10" rx="2" fill="var(--secondary-color)"/>
              <rect x="14" y="14" width="10" height="10" rx="2" fill="var(--primary-color)"/>
            </svg>
            FlowLens
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#about">About</a>
          </div>
          <div className="nav-actions">
            <Link href="/auth" className="btn btn-primary">Login / Sign Up</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1 className="animate-fade-in-up">
                Proactive Warehouse <span>Intelligence</span>
              </h1>
              <p className="animate-fade-in-up delay-1">
                Stop reacting to customer complaints. FlowLens provides end-to-end visibility, predicts failures before dispatch, and automatically detects workflow bottlenecks in real-time.
              </p>
              <div className="hero-buttons animate-fade-in-up delay-2">
                <button className="btn btn-primary">Get Started</button>
                <button className="btn btn-secondary">Explore Platform</button>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <div className="mockup-header">
                <span className="mockup-title">Live Warehouse Overview</span>
                <span className="mockup-badge">AI Risk Prediction Active</span>
              </div>
              <div className="mockup-content">
                <div className="mockup-card">
                  <div className="mockup-card-title">At-Risk Orders</div>
                  <div className="mockup-card-value" style={{color: 'var(--tertiary-color)'}}>14</div>
                </div>
                <div className="mockup-card">
                  <div className="mockup-card-title">Avg Prep Time</div>
                  <div className="mockup-card-value">12m 45s</div>
                </div>
              </div>
              <div style={{flex: 1, background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #F1F5F9', position: 'relative', overflow: 'hidden'}}>
                <div className="mockup-card-title">Workflow Bottlenecks</div>
                <div style={{height: '8px', background: '#F1F5F9', borderRadius: '4px', marginTop: '1rem'}}>
                  <div style={{width: '75%', height: '100%', background: 'var(--tertiary-color)', borderRadius: '4px'}}></div>
                </div>
                <div style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--secondary-color)'}}>Packing Station B - 75% Load</div>
                
                <div style={{height: '8px', background: '#F1F5F9', borderRadius: '4px', marginTop: '1rem'}}>
                  <div style={{width: '30%', height: '100%', background: 'var(--primary-color)', borderRadius: '4px'}}></div>
                </div>
                <div style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--secondary-color)'}}>Quality Check - 30% Load</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section features">
          <div className="container">
            <div className="section-header">
              <h2>End-to-End Operational Visibility</h2>
              <p>Everything you need to optimize your warehouse operations, improve packing accuracy, and reduce SLA breaches.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Bottleneck Detection</h3>
                <p>Automatically detect long queues, high waiting times, and slow processing stages across your warehouse workflows.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3>AI Risk Prediction</h3>
                <p>Calculate risk scores for every order before dispatch based on prep time, queue size, and historical data.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Root Cause Analysis</h3>
                <p>Trace complaints back through workflow history to identify responsible stages, shifts, or individuals.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Intelligent Alerts</h3>
                <p>Get real-time notifications for SLA breaches, packing accuracy drops, and high complaint rates via Dashboard or SMS.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💡</div>
                <h3>Smart Recommendations</h3>
                <p>Receive actionable insights like reassigning workers, triggering quality inspections, or delaying dispatch.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3>Comprehensive KPIs</h3>
                <p>Track warehouse utilization, employee productivity, and complaint resolution times all in one unified dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container">
            <h2>Ready to transform your warehouse?</h2>
            <p>Join operations managers who are reducing complaints and improving efficiency with FlowLens' predictive AI platform.</p>
            <button className="btn btn-tertiary" style={{ backgroundColor: '#fff', color: 'var(--primary-color)'}}>Schedule a Demo</button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          &copy; {new Date().getFullYear()} FlowLens Warehouse Workflow Intelligence Platform. All rights reserved.
        </div>
      </footer>
    </>
  );
}
