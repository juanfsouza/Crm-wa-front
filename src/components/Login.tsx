import { useState } from 'react';
import api from '../services/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      console.log('Token armazenado:', token);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};