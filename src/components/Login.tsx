// src/components/Login.tsx

import type { FC } from '../lib/teact/teact';
import React, { useState } from '../lib/teact/teact';
import styles from './App.module.scss';


type LoginProps = {
  onLogin: () => void;
  isLoaded: boolean;
};

const Login: FC<LoginProps> = ({ onLogin, isLoaded }) => {
  const [username, setUsername] = useState<number>();
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username == 123) {
      localStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('Incorrect code');
    }
  };

  if (!isLoaded) {
    return (
      <div className={styles.container}>
        {/* <div className={styles.loginBox}> */}
          <h1 className={styles.title}>Loading...</h1>
        {/* </div> */}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>This is not an official version of Telegram. If you agree to continue, please enter the code 123:</h1>
        {error && <p className={styles.error}>{error}</p>}
        <input
          type="number"
          placeholder="Confirmation code"
          value={username}
          onChange={(e) => setUsername(parseInt(e.target.value))}
          className={styles.input}
        />

        <button onClick={handleLogin} className={styles.button}>Login</button>
      </div>
    </div>
  );
};



export default Login;