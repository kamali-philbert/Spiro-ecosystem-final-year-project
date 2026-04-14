import { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('spiro_token');
    const savedUser  = localStorage.getItem('spiro_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Step 1 — verify credentials, returns { user_id, message } on success
  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    return res.data; // { status: 'otp_sent', user_id, message }
  };

  // Step 2 — verify OTP, stores token + user
  const verifyOtp = async (user_id, code) => {
    const res = await API.post('/auth/verify-otp', { user_id, code });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('spiro_token', t);
    localStorage.setItem('spiro_user', JSON.stringify(u));
    return u;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('spiro_token');
    localStorage.removeItem('spiro_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, verifyOtp, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
