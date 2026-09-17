import React, { useEffect, useState } from 'react';
import { adminApi, AdminUser, DashboardStats, PaginatedUsers } from '../../core/api/admin.api';
import { colors, spacing, borderRadius, shadows, typography } from '../../core/theme';
import './AdminPage.css';

// SVG Icons for Admin Dashboard
const UsersIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: 24, height: 24 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.978 11.978 0 0 1 12 20.25a11.98 11.98 0 0 1-3-.112v-.109m0-1.018a9.38 9.38 0 0 1-2.625.372 9.337 9.337 0 0 1-4.121-.952 4.125 4.125 0 0 1 7.533-2.493M9 19.128v-.003c0-1.113.285-2.16.786-3.07M12 15.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7-5.25a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm14 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
  </svg>
);

const CubeIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: 24, height: 24 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const DocumentTextIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: 24, height: 24 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const ClockIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={color} style={{ width: 24, height: 24 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" style={{ width: 13, height: 13 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const UnlockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" style={{ width: 13, height: 13 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" style={{ width: 13, height: 13 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
  </svg>
);

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: '#fef2f2', text: '#b91c1c' },
  manager: { bg: '#fffbeb', text: '#d97706' },
  farmer: { bg: '#f0fdf4', text: '#15803d' },
  consumer: { bg: '#eff6ff', text: '#1d4ed8' }
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  icon: React.ReactNode;
  borderAccent?: string;
}> = ({ label, value, color = colors.textPrimary, icon, borderAccent }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.surface,
        borderRadius: borderRadius.xl,
        padding: `${spacing[5]} ${spacing[6]}`,
        boxShadow: hovered ? shadows.md : shadows.sm,
        border: `1px solid ${colors.neutral[200]}`,
        borderLeft: borderAccent ? `4px solid ${borderAccent}` : `1px solid ${colors.neutral[200]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: spacing[1] }}>{label}</p>
        <p style={{ margin: 0, fontSize: typography.sizes['3xl'], fontWeight: typography.weights.bold, color }}>{value}</p>
      </div>
      <div style={{
        padding: spacing[3],
        borderRadius: borderRadius.lg,
        background: borderAccent ? `${borderAccent}10` : `${colors.neutral[100]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: `${spacing[4]} ${spacing[4]}`,
  textAlign: 'left',
  fontWeight: typography.weights.semibold,
  color: colors.textSecondary,
  fontSize: typography.sizes.sm,
  borderBottom: `1px solid ${colors.neutral[200]}`,
};

const tdStyle: React.CSSProperties = {
  padding: `${spacing[4]} ${spacing[4]}`,
  fontSize: typography.sizes.sm,
};

const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getUsers({
          page,
          limit: 10,
          role: roleFilter || undefined,
          search: searchTerm || undefined,
        }),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data);
    } catch (err: any) {
      setError(err.message || 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, roleFilter]);

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await adminApi.toggleUserStatus(user._id, !user.isActive);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeRole = async (user: AdminUser, newRole: AdminUser['role']) => {
    try {
      await adminApi.updateUserRole(user._id, newRole);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await adminApi.deleteUser(userId);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && !stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <p style={{ color: colors.textSecondary }}>Đang tải...</p>
    </div>
  );

  return (
    <div className="admin-page">
      <h1 style={{
        margin: 0,
        fontSize: typography.sizes['3xl'],
        fontWeight: typography.weights.bold,
        color: colors.textPrimary,
      }}>
        Bảng điều khiển Admin
      </h1>
      <p style={{ margin: `${spacing[2]} 0 0`, color: colors.textSecondary, fontSize: typography.sizes.base, marginBottom: spacing[8] }}>
        Thống kê hệ thống và quản lý người dùng
      </p>

      {error && (
        <div style={{
          background: '#fef2f2',
          color: colors.error,
          padding: spacing[4],
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.neutral[200]}`,
          marginBottom: spacing[6]
        }}>
          {error}
        </div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing[5], marginBottom: spacing[8] }}>
          <StatCard
            label="Người dùng"
            value={stats.users.total}
            icon={<UsersIcon color="#16a34a" />}
            borderAccent={colors.primary[500]}
          />
          <StatCard
            label="Lô nông sản"
            value={stats.products.total}
            icon={<CubeIcon color="#2563eb" />}
            borderAccent="#2563eb"
          />
          <StatCard
            label="Sự kiện truy xuất"
            value={stats.traceEvents.total}
            icon={<DocumentTextIcon color="#7c3aed" />}
            borderAccent="#7c3aed"
          />
          <StatCard
            label="Sự kiện tuần này"
            value={stats.traceEvents.thisWeek}
            icon={<ClockIcon color="#059669" />}
            borderAccent="#059669"
          />
        </div>
      )}

      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.neutral[200]}`,
        borderRadius: borderRadius.xl,
        padding: spacing[6],
        boxShadow: shadows.md,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6], flexWrap: 'wrap', gap: spacing[4] }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold }}>
            Quản lý người dùng
          </h2>
          <div style={{ display: 'flex', gap: spacing[3] }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 12, color: colors.textMuted }}>
                <SearchIcon />
              </span>
              <input
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                style={{
                  padding: `8px 12px 8px 34px`,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.neutral[300]}`,
                  outline: 'none',
                  fontSize: typography.sizes.sm,
                  width: 220,
                }}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.neutral[300]}`,
                fontSize: typography.sizes.sm,
                outline: 'none',
                background: colors.surface,
                cursor: 'pointer',
              }}
            >
              <option value="">Tất cả quyền</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="farmer">Farmer</option>
              <option value="consumer">Consumer</option>
            </select>
          </div>
        </div>

        {users && users.users.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto', borderRadius: borderRadius.xl, border: `1px solid ${colors.neutral[200]}`, marginBottom: spacing[5] }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={thStyle}>Tên người dùng</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Vai trò / Quyền</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((user, i) => {
                    const rColors = roleColors[user.role] || roleColors.consumer;
                    return (
                      <tr
                        key={user._id}
                        style={{
                          borderTop: i > 0 ? `1px solid ${colors.neutral[200]}` : undefined,
                          backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff',
                        }}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{user.first_name} {user.last_name}</td>
                        <td style={{ ...tdStyle, color: colors.textSecondary }}>{user.email}</td>
                        <td style={tdStyle}>
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user, e.target.value as AdminUser['role'])}
                            style={{
                              background: rColors.bg,
                              color: rColors.text,
                              border: `1px solid ${rColors.text}30`,
                              borderRadius: borderRadius.full,
                              padding: '4px 12px 4px 8px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 12,
                              outline: 'none',
                            }}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="farmer">Farmer</option>
                            <option value="consumer">Consumer</option>
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            background: user.isActive ? '#dcfce7' : '#fef2f2',
                            color: user.isActive ? '#166534' : '#b91c1c',
                            padding: '4px 10px',
                            borderRadius: borderRadius.full,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-block',
                          }}>
                            {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: spacing[2], alignItems: 'center', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: borderRadius.full,
                                border: `1px solid ${user.isActive ? '#f59e0b' : '#10b981'}`,
                                background: user.isActive ? '#fffbeb' : '#ecfdf5',
                                color: user.isActive ? '#d97706' : '#047857',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = user.isActive ? '#fef3c7' : '#d1fae5';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = user.isActive ? '#fffbeb' : '#ecfdf5';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              {user.isActive ? <LockIcon /> : <UnlockIcon />}
                              {user.isActive ? 'Khóa' : 'Mở khóa'}
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: borderRadius.full,
                                border: '1px solid #f87171',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <TrashIcon />
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing[4] }}>
              <span style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
                Hiển thị {users.users.length} / {users.total} người dùng
              </span>
              <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.neutral[300]}`,
                    background: page <= 1 ? colors.neutral[100] : colors.surface,
                    color: page <= 1 ? colors.textMuted : colors.textSecondary,
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Trước
                </button>
                <span style={{ fontSize: typography.sizes.sm, color: colors.textPrimary, padding: '0 8px' }}>
                  Trang {page} / {users.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= users.totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.neutral[300]}`,
                    background: page >= users.totalPages ? colors.neutral[100] : colors.surface,
                    color: page >= users.totalPages ? colors.textMuted : colors.textSecondary,
                    cursor: page >= users.totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '24px 0' }}>
            Không có người dùng nào khớp với bộ lọc
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
