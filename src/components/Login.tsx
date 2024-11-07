// src/components/Login.tsx

import type { FC } from '../lib/teact/teact';
import React, { useState } from '../lib/teact/teact';
import styles from './App.module.scss';


type LoginProps = {
  onLogin: () => void;
};

const Login: FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === 'smartUiTelegramClone') { // Change credentials as needed
      localStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('Incorrect username or password');
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Login</h1>
        {error && <p className={styles.error}>{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />
        <button onClick={handleLogin} className={styles.button}>Login</button>
      </div>
    </div>
  );
};



export default Login;