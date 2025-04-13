import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NotificationManager from './components/NotificationManager';
import HomePage from './components/home/HomePage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import DashboardPage from './pages/DashboardPage';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4299e1',
    },
    secondary: {
      main: '#2d3748',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Toaster position="top-right" />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <DashboardPage />
                  </PrivateRoute>
                } />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
            <NotificationManager />
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// PrivateRoute component to protect routes that require authentication
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default App;
