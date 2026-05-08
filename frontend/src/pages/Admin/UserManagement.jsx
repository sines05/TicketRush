import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import userService from '../../services/userService.js';
import membershipService from '../../services/membershipService.js';
import Button from '../../components/common/Button.jsx';
import { ROLES } from '../../constants/roles.js';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: userService.getUsers
  });

  const { data: tiers } = useQuery({
    queryKey: ['membership', 'tiers'],
    queryFn: membershipService.getTiers
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => userService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const tierMutation = useMutation({
    mutationFn: ({ userId, tierId }) => userService.updateUserMembership(userId, tierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const filteredUsers = users?.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-2xl border border-text/10 bg-surface/50 backdrop-blur-md p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Quản lý người dùng</h1>
            <p className="mt-1 text-sm text-muted">Quản lý vai trò và hạng thành viên của người dùng hệ thống.</p>
          </div>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-text/10 bg-bg/50 px-4 py-2.5 pl-10 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
            <svg
              className="absolute left-3 top-3 h-4.5 w-4.5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {usersError && (
          <div className="mt-6 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {usersError?.message || 'Có lỗi xảy ra khi tải danh sách người dùng.'}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-xl border border-text/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-text/5 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-6 py-4">Người dùng</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Hạng thành viên</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {usersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 rounded bg-text/5"></div>
                      <div className="mt-2 h-3 w-24 rounded bg-text/5"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-text/5"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-text/5"></div></td>
                    <td className="px-6 py-4 text-right"><div className="ml-auto h-8 w-20 rounded bg-text/5"></div></td>
                  </tr>
                ))
              ) : filteredUsers?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-muted">Không tìm thấy người dùng nào.</td>
                </tr>
              ) : (
                filteredUsers?.map((user) => (
                  <tr key={user.id} className="hover:bg-text/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text group-hover:text-brand-600 transition-colors">{user.full_name}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => roleMutation.mutate({ userId: user.id, role: e.target.value })}
                        disabled={roleMutation.isPending}
                        className="bg-transparent border-none text-xs font-medium focus:ring-0 cursor-pointer hover:text-brand-600 transition-colors"
                      >
                        <option value={ROLES.CUSTOMER}>CUSTOMER</option>
                        <option value={ROLES.ADMIN}>ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.membership_tier}
                        onChange={(e) => tierMutation.mutate({ userId: user.id, tierId: e.target.value })}
                        disabled={tierMutation.isPending}
                        className="bg-transparent border-none text-xs font-medium focus:ring-0 cursor-pointer hover:text-brand-600 transition-colors"
                      >
                        {tiers?.map((tier) => (
                          <option key={tier.id} value={tier.name}>{tier.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
