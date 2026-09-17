import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/hooks/useAuth';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: any) { setError(err.message || 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };

  return <main className="login-page">
    <section className="login-story">
      <a className="login-brand" href="/" aria-label="AgriTrace"><span>🌿</span><div><strong>AgriTrace</strong><small>Trust every harvest</small></div></a>
      <div className="login-story-copy"><span className="login-kicker">Minh bạch từ nông trại</span><h1>Mỗi sản phẩm<br />mang một <em>câu chuyện.</em></h1><p>Kết nối nông hộ, nhà quản lý và người tiêu dùng bằng dữ liệu truy xuất đáng tin cậy.</p><div className="login-proof"><div><strong>100%</strong><small>Dữ liệu có thể xác minh</small></div><div><strong>24/7</strong><small>Theo dõi chuỗi cung ứng</small></div></div></div>
      <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" /><span className="login-leaf">⌁</span>
    </section>

    <section className="login-form-side">
      <div className="login-card">
        <div className="login-mobile-brand"><span>🌿</span><strong>AgriTrace</strong></div>
        <span className="login-welcome">Chào mừng trở lại</span><h2>Đăng nhập tài khoản</h2><p className="login-subtitle">Tiếp tục quản lý hành trình nông sản của bạn.</p>
        <form onSubmit={handleSubmit}>
          <label>Email<span className="login-input"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 7l8 6 8-6" /></svg><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required /></span></label>
          <label>Mật khẩu<span className="login-input"><svg viewBox="0 0 24 24"><path d="M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4z" /></svg><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></span></label>
          <div className="login-options"><label><input type="checkbox" /> Ghi nhớ đăng nhập</label><a href="/forgot-password">Quên mật khẩu?</a></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? <><i /> Đang đăng nhập...</> : <>Đăng nhập <span>→</span></>}</button>
        </form>
        <div className="login-divider"><span>Truy xuất công khai không cần đăng nhập</span></div>
        <p className="login-help">Cần hỗ trợ? <a href="mailto:support@agritrace.vn">Liên hệ quản trị viên</a></p>
      </div>
      <footer>© 2026 AgriTrace · Nền tảng truy xuất nguồn gốc nông sản</footer>
    </section>
  </main>;
};
export default LoginPage;
