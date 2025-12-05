import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from './config';
import './Login.css';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(t('errors.authenticationFailed', { status: response.status, statusText: response.statusText }));
      }

      const data = await response.json();
      
      // Store access_token in localStorage
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        console.log('Access token stored in localStorage');
        
        // Redirect to projects page after successful login
        navigate('/projects');
      } else {
        console.warn('No access_token found in response');
        setError(t('login.noTokenError'));
      }
    } catch (err) {
      setError(err.message || t('login.error'));
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{t('login.title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">{t('login.username')}</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder={t('login.usernamePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? t('login.loggingIn') : t('login.loginButton')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

