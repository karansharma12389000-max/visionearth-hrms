// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { runEndOfDayJobs } from './services/scheduledJobs';

function App() {
  useEffect(() => {
    const runJobsOncePerDay = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const lastRun = localStorage.getItem('lastJobRun');
        
        if (lastRun !== today) {
          console.log(`📅 Running end-of-day jobs for ${today} (IST)`);
          
          const result = await runEndOfDayJobs();
          
          console.log('✅ Job results:', {
            present: result.autoMarkPresent?.processed || 0,
            leaves: result.processLeaves?.processed || 0,
            autoCheckOut: result.autoCheckOut?.processed || 0,
            aco: result.autoMarkACO?.processed || 0,
            absent: result.autoMarkAbsentOrLeave?.processed || 0,
          });
          
          localStorage.setItem('lastJobRun', today);
        }
      } catch (error) {
        console.error('❌ Error running scheduled jobs:', error);
      }
    };
    
    runJobsOncePerDay();
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                icon: '✅',
              },
              error: {
                duration: 4000,
                icon: '❌',
              },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;