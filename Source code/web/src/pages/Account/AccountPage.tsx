import React, { useMemo, useState } from 'react';
import { authApi } from '../../core/api/auth.api';
import { useAuth } from '../../core/hooks/useAuth';
import type { User } from '../../core/types';
import './AccountPage.css';

const roleLabel: Record<User['role'], string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  farmer: 'Nông hộ',
  consumer: 'Người tiêu dùng',
};

const getDisplayName = (user: User | null) => {
  if (!user) return '';
  const composed = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return user.name || composed || user.email;
};

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { first_name: parts[0] || 'Người', last_name: 'dùng' };
  }
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts.slice(-1).join(''),
  };
};

const normalizeUser = (user: User, fallback: User): User => {
  const composed = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return {
    ...fallback,
    ...user,
    _id: user._id || fallback._id || fallback.userId,
    userId: user.userId || user._id || fallback.userId || fallback._id,
    name: user.name || composed || fallback.name,
    role: user.role || fallback.role,
    email: user.email || fallback.email,
  };
};

const AccountPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(getDisplayName(user));
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initials = useMemo(() => {
    return displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'AT';
  }, [displayName]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Tên hiển thị không được để trống.');
      return;
    }

    try {
      setSavingProfile(true);
      clearMessages();
      const nameParts = splitName(trimmedName);
      const { data } = await authApi.updateProfile({
        ...nameParts,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });
      updateUser(normalizeUser(data.user, user));
      setSuccess('Đã cập nhật hồ sơ tài khoản.');
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setError('Mật khẩu mới cần tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới chưa khớp.');
      return;
    }

    try {
      setSavingPassword(true);
      clearMessages();
      const { data } = await authApi.changePassword({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(data.msg || 'Đã đổi mật khẩu.');
    } catch (err: any) {
      setError(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return <div className="account-state">Không tìm thấy thông tin tài khoản.</div>;
  }

  return (
    <div className="account-page">
      <header className="account-hero">
        <div className="account-avatar">
          {avatar ? <img src={avatar} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : initials}
        </div>
        <div>
          <p className="account-eyebrow">Hồ sơ tài khoản</p>
          <h1>{getDisplayName(user)}</h1>
          <p>{user.email} · {roleLabel[user.role]}</p>
        </div>
      </header>

      {(error || success) && (
        <div className={`account-alert ${error ? 'is-error' : 'is-success'}`}>
          {error || success}
          <button type="button" onClick={clearMessages}>×</button>
        </div>
      )}

      <section className="account-grid">
        <form className="account-panel" onSubmit={handleProfileSubmit}>
          <div className="account-panel-head">
            <div>
              <span>Thông tin cá nhân</span>
              <h2>Cập nhật hồ sơ</h2>
            </div>
          </div>
          <label>Tên hiển thị
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>Email
            <input value={user.email} disabled />
          </label>
          <label>Số điện thoại
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" />
          </label>
          <label>Địa chỉ
            <textarea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Địa chỉ liên hệ hoặc vùng phụ trách" />
          </label>
          <label>Avatar URL
            <input value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="/uploads/sample-media/default-avatar.svg" />
          </label>
          <button disabled={savingProfile} type="submit">{savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
        </form>

        <div className="account-side">
          <article className="account-panel account-card">
            <span>Quyền truy cập</span>
            <strong>{roleLabel[user.role]}</strong>
            <p>
              {user.role === 'admin'
                ? 'Bạn có toàn quyền quản trị người dùng, dữ liệu và cấu hình hệ thống.'
                : 'Tài khoản được cấp quyền theo vai trò để thao tác với dữ liệu truy xuất phù hợp.'}
            </p>
          </article>

          <form className="account-panel" onSubmit={handlePasswordSubmit}>
            <div className="account-panel-head">
              <div>
                <span>Bảo mật</span>
                <h2>Đổi mật khẩu</h2>
              </div>
            </div>
            <label>Mật khẩu hiện tại
              <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required />
            </label>
            <label>Mật khẩu mới
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </label>
            <label>Xác nhận mật khẩu mới
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
            <button disabled={savingPassword} type="submit">{savingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
