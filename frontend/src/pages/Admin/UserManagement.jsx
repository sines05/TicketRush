import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import userService from '../../services/userService.js';
import membershipService from '../../services/membershipService.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLES } from '../../constants/roles.js';
import { Search, Users, ShieldAlert, BadgeCheck, MoreHorizontal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <div className="container mx-auto py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" /> Quản lý người dùng
          </h1>
          <p className="text-muted-foreground">Quản lý vai trò và hạng thành viên của người dùng hệ thống.</p>
        </div>
      </div>

      {usersError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            {usersError?.message || 'Có lỗi xảy ra khi tải danh sách người dùng.'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Danh sách người dùng</CardTitle>
              <CardDescription>Tổng cộng {filteredUsers?.length || 0} người dùng được tìm thấy.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Hạng thành viên</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 animate-pulse bg-muted rounded mb-2"></div>
                      <div className="h-3 w-24 animate-pulse bg-muted rounded"></div>
                    </TableCell>
                    <TableCell><div className="h-8 w-24 animate-pulse bg-muted rounded"></div></TableCell>
                    <TableCell><div className="h-8 w-24 animate-pulse bg-muted rounded"></div></TableCell>
                    <TableCell className="text-right"><div className="h-8 w-16 animate-pulse bg-muted rounded ml-auto"></div></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy người dùng nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => roleMutation.mutate({ userId: user.id, role: value })}
                        disabled={roleMutation.isPending}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROLES.CUSTOMER}>CUSTOMER</SelectItem>
                          <SelectItem value={ROLES.ADMIN}>ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.membership_tier}
                        onValueChange={(value) => tierMutation.mutate({ userId: user.id, tierId: value })}
                        disabled={tierMutation.isPending}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiers?.map((tier) => (
                            <SelectItem key={tier.id} value={tier.name}>{tier.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
