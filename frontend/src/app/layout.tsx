import './globals.css';
import React from 'react';

export const metadata = {
  title: 'FlowLens - Warehouse Workflow Intelligence Platform',
  description: 'FlowLens provides end-to-end visibility into warehouse operations, identifying bottlenecks and predicting delivery failures using AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
