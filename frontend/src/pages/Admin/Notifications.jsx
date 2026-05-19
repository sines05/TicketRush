import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import notificationService from '../../services/notificationService.js';
import userService from '../../services/userService.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Send, Users, Search, X, CheckCircle2, AlertCircle, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';

const NOTIF_TYPE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'PROMOTION', label: 'Khuyến mãi' },
  { value: 'SYSTEM', label: 'Hệ thống' },
];

const NOTIF_TYPE_LABELS = {
  SYSTEM: 'Hệ thống', ORDER: 'Đơn hàng', EVENT_REMINDER: 'Nhắc sự kiện',
  PAYMENT_REMINDER: 'Nhắc thanh toán', PROMOTION: 'Khuyến mãi', ADMIN: 'Quản trị',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminNotifications() {
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('ADMIN');
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSelectPage, setUserSelectPage] = useState(1);

  const handleSearchChange = (val) => {
    setUserSearchTerm(val);
    setUserSelectPage(1);
  };

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Users list for search
  const { data: allUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: userService.getUsers,
    staleTime: 60_000,
  });

  // Notification history
  const [historyPage, setHistoryPage] = useState(1);
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'notifications', historyPage],
    queryFn: () => notificationService.adminGetNotifications(historyPage, 15),
    refetchOnMount: 'always',
  });

  const sendMutation = useMutation({
    mutationFn: notificationService.adminSendNotification,
    onSuccess: () => {
      setFormSuccess('Gửi thông báo thành công!');
      setFormError('');
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (err) => {
      setFormError(err?.message || 'Gửi thông báo thất bại');
      setFormSuccess('');
    },
  });

  const matchingUsers = allUsers?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
  ) || [];

  const userSelectPageSize = 10;
  const totalSelectPages = Math.ceil(matchingUsers.length / userSelectPageSize) || 1;
  const currentPage = Math.min(userSelectPage, totalSelectPages);
  const displayedUsers = matchingUsers.slice((currentPage - 1) * userSelectPageSize, currentPage * userSelectPageSize);

  function handleAddUser(user) {
    setSelectedUsers((prev) => [...prev, user]);
  }

  function handleRemoveUser(userId) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleSend() {
    setFormError('');
    setFormSuccess('');

    if (!title.trim() || !message.trim()) {
      setFormError('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    sendMutation.mutate({
      user_ids: isBroadcast ? [] : selectedUsers.map((u) => u.id),
      title: title.trim(),
      message: message.trim(),
      type: notifType,
    });
  }

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-8 w-8 text-primary" /> Quản lý Thông báo
        </h1>
        <p className="text-muted-foreground">Gửi thông báo đến người dùng và xem lịch sử.</p>
      </div>

      {/* Send Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Gửi thông báo mới
          </CardTitle>
          <CardDescription>Soạn và gửi thông báo đến một hoặc nhiều người dùng, hoặc gửi cho tất cả.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(formError || formSuccess) && (
            <Alert variant={formError ? 'destructive' : 'default'} className={formSuccess ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : ''}>
              {formError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
              <AlertTitle>{formError ? 'Lỗi' : 'Thành công'}</AlertTitle>
              <AlertDescription>{formError || formSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loại thông báo</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIF_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Người nhận</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isBroadcast}
                    onChange={() => { setIsBroadcast(true); setSelectedUsers([]); }}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Tất cả người dùng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isBroadcast}
                    onChange={() => setIsBroadcast(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Cá nhân</span>
                </label>
              </div>
            </div>
          </div>

          {/* User Selection */}
          {!isBroadcast && (
            <div className="space-y-4 border border-border/50 bg-card p-4 rounded-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Tìm & Chọn người nhận cụ thể
                </h3>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Đã chọn {selectedUsers.length} người nhận
                </span>
              </div>

              {/* 1. Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo Tên, Email hoặc ID..."
                  value={userSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 2. Sub-frame list (Inline Selection Table) */}
              <div className="border border-border/40 rounded-lg overflow-hidden bg-muted/10">
                <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                  {displayedUsers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Không tìm thấy người dùng phù hợp.
                    </div>
                  ) : (
                    displayedUsers.map((u) => {
                      const isSelected = selectedUsers.some((su) => su.id === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => isSelected ? handleRemoveUser(u.id) : handleAddUser(u)}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-primary h-4 w-4 rounded border-gray-300"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium flex items-center gap-2">
                                <span>{u.full_name || 'Người dùng không tên'}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={u.id}>
                                  (ID: {u.id})
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSelected ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {isSelected ? 'Đã chọn' : 'Chưa chọn'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3. Sub-frame Pagination Footer */}
                {matchingUsers.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">
                      Hiển thị {matchingUsers.length > 0 ? (currentPage - 1) * userSelectPageSize + 1 : 0} - {Math.min(currentPage * userSelectPageSize, matchingUsers.length)} trong số {matchingUsers.length} người dùng
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={(e) => { e.stopPropagation(); setUserSelectPage(prev => Math.max(prev - 1, 1)); }}
                        disabled={currentPage === 1}
                        title="Trang trước"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs font-medium px-2 py-0.5 bg-background border rounded text-center min-w-[60px] select-none">
                        {currentPage} / {totalSelectPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={(e) => { e.stopPropagation(); setUserSelectPage(prev => Math.min(prev + 1, totalSelectPages)); }}
                        disabled={currentPage >= totalSelectPages}
                        title="Trang sau"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Display Selected Users Tray */}
              {selectedUsers.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs text-muted-foreground">Danh sách người nhận được chọn ({selectedUsers.length}):</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-border/40 rounded-lg bg-muted/5">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                      >
                        {u.full_name || u.email}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveUser(u.id); }}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                          title="Bỏ chọn"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notif-title">Tiêu đề</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Chương trình khuyến mãi đặc biệt..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-message">Nội dung</Label>
            <Textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung thông báo..."
              rows={4}
              className="resize-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {isBroadcast ? (
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Gửi đến tất cả người dùng</span>
            ) : (
              <span>{selectedUsers.length} người nhận được chọn</span>
            )}
          </p>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {sendMutation.isPending ? 'Đang gửi...' : 'Gửi thông báo'}
          </Button>
        </CardFooter>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Lịch sử thông báo
          </CardTitle>
          <CardDescription>Tổng cộng {historyData?.total || 0} thông báo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Người nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-28 animate-pulse bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-40 animate-pulse bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
                  </TableRow>
                ))
              ) : historyData?.notifications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Chưa có thông báo nào được gửi.
                  </TableCell>
                </TableRow>
              ) : (
                historyData?.notifications?.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(notif.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                        {NOTIF_TYPE_LABELS[notif.type] || notif.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {notif.is_broadcast ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Users className="h-3 w-3" /> Tất cả
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Cá nhân</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {historyData?.total > 15 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">Trang {historyPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={(historyData?.notifications?.length || 0) < 15}
              >
                Sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
