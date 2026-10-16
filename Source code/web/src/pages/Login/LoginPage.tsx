import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgriLivingScene from '../../components/visual/AgriLivingScene';
import { useAuth } from '../../core/hooks/useAuth';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      if (remember) localStorage.setItem('agritrace.remember-email', email.trim());
      else localStorage.removeItem('agritrace.remember-email');
      navigate('/');
    } catch (loginError: any) {
      setError(loginError?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Giới thiệu AgriTrace">
        <AgriLivingScene className="login-story__scene" />
        <a className="login-brand" href="/" aria-label="AgriTrace - trang chủ">
          <span aria-hidden="true">A</span>
          <div><strong>AgriTrace</strong><small>Minh bạch từ nông trại</small></div>
        </a>
        <div className="login-story-copy">
          <span className="login-kicker">Dữ liệu đáng tin cho mỗi mùa vụ</span>
          <h1>Mỗi nông sản<br />mang một <em>hành trình.</em></h1>
          <p>Kết nối nông hộ, đơn vị quản lý và người tiêu dùng bằng hồ sơ truy xuất rõ ràng, có thể kiểm chứng.</p>
          <div className="login-proof" aria-label="Giá trị nền tảng">
            <div><strong>100%</strong><small>Dữ liệu có thể xác minh</small></div>
            <div><strong>24/7</strong><small>Theo dõi chuỗi cung ứng</small></div>
          </div>
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card">
          <div className="login-mobile-brand"><span aria-hidden="true">A</span><strong>AgriTrace</strong></div>
          <span className="login-welcome">Chào mừng trở lại</span>
          <h2>Đăng nhập tài khoản</h2>
          <p className="login-subtitle">Tiếp tục quản lý hành trình nông sản của bạn.</p>
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email">
              Email
              <span className="login-input">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 7l8 6 8-6" /></svg>
                <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required />
              </span>
            </label>
            <label htmlFor="login-password">
              Mật khẩu
              <span className="login-input">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4z" /></svg>
                <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required />
                <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button>
              </span>
            </label>
            <div className="login-options">
              <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Ghi nhớ email</label>
              <a href="mailto:support@agritrace.vn?subject=Hỗ trợ đặt lại mật khẩu">Quên mật khẩu?</a>
            </div>
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <><i aria-hidden="true" /> Đang đăng nhập...</> : <>Đăng nhập <span aria-hidden="true">→</span></>}
            </button>
          </form>
          <div className="login-divider"><span>Truy xuất công khai không cần đăng nhập</span></div>
          <p className="login-help">Cần hỗ trợ? <a href="mailto:support@agritrace.vn">Liên hệ quản trị viên</a></p>
        </div>
        <footer>© 2026 AgriTrace · Nền tảng truy xuất nguồn gốc nông sản</footer>
      </section>
    </main>
  );
};

export default LoginPage;
