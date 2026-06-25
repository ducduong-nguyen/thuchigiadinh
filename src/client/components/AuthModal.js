import React, { useState } from 'react';

export default function AuthModal({ visible, mode = 'login', onClose, onLogin, onRegister }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' });

  if (!visible) return null;

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'login') onLogin({ username: form.username, password: form.password });
    else onRegister({ name: form.name, username: form.username, password: form.password });
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeStyle} onClick={onClose}>×</button>
        <h3>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'register' && (
            <input placeholder="Họ và tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input placeholder="Tài khoản" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input placeholder="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="primary-button" type="submit">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
            <button type="button" className="secondary-button" onClick={onClose}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const modalStyle = { background: '#0b0f13', padding: 20, borderRadius: 12, minWidth: 320, color: '#fff' };
const closeStyle = { position: 'absolute', right: 12, top: 8, background: 'transparent', color: '#fff', border: 'none', fontSize: 20 };
