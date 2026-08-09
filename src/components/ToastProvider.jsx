// src/components/ToastProvider.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: '380px',
          },
          success: {
            icon: '✅',
            style: {
              borderLeft: '4px solid #10B981',
            },
          },
          error: {
            icon: '❌',
            style: {
              borderLeft: '4px solid #EF4444',
            },
          },
          loading: {
            icon: '⏳',
            style: {
              borderLeft: '4px solid #3B82F6',
            },
          },
        }}
      />
    </>
  );
};