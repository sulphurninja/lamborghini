'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, LogOut, Users, Search, Coins } from 'lucide-react';

interface User {
  id: string;
  key: string;
  role: string;
  credits: number;
  pricing: {
    seller_creation_cost: number;
    user_creation_cost: number;
  };
  plan_expiry: string;
  status: string;
  remainingDays: number;
  createdAt: string;
  createdBy?: {
    key: string;
    role: string;
  };
}

export default function SuperSellerDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const [formData, setFormData] = useState({
    key: '',
    role: 'seller',
    credits: 0,
    seller_creation_cost: 0,
    user_creation_cost: 0,
    plan_expiry: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    if (user.role !== 'super-seller') {
      router.push('/login');
      return;
    }
    
    setCurrentUser(user);
    fetchUsers();
  }, [page, search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter to show only users created by current super-seller
        const myUsers = data.users.filter((user: User) => 
          user.createdBy?.key === currentUser?.key || user.role === 'user'
        );
        setUsers(myUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formData.key,
          role: formData.role,
          credits: formData.credits,
          pricing: {
            seller_creation_cost: formData.seller_creation_cost,
            user_creation_cost: formData.user_creation_cost
          },
          plan_expiry: formData.plan_expiry,
          createdBy: currentUser.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCreateDialog(false);
        resetForm();
        fetchUsers();
        // Refresh current user to update credits
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formData.key,
          role: formData.role,
          credits: formData.credits,
          pricing: {
            seller_creation_cost: formData.seller_creation_cost,
            user_creation_cost: formData.user_creation_cost
          },
          plan_expiry: formData.plan_expiry
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEditDialog(false);
        resetForm();
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      role: 'seller',
      credits: 0,
      seller_creation_cost: 0,
      user_creation_cost: 0,
      plan_expiry: ''
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      key: user.key,
      role: user.role,
      credits: user.credits,
      seller_creation_cost: user.pricing.seller_creation_cost,
      user_creation_cost: user.pricing.user_creation_cost,
      plan_expiry: user.plan_expiry.split('T')[0]
    });
    setEditDialog(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'seller': return 'bg-blue-500';
      case 'user': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-red-500';
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Seller Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {currentUser?.key}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Card className="p-3">
                <div className="flex items-center space-x-2">
                  <Coins className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Credits</p>
                    <p className="text-lg font-bold text-purple-600">{currentUser?.credits || 0}</p>
                  </div>
                </div>
              </Card>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'seller').length}
              </div>
              <div className="text-sm text-gray-500">Sellers Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500">Active Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {currentUser?.credits || 0}
              </div>
              <div className="text-sm text-gray-500">Available Credits</div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Pricing Settings</CardTitle>
            <CardDescription>
              Your cost structure for creating new users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Seller Creation Cost</div>
                <div className="text-2xl font-bold text-blue-600">
                  {currentUser?.pricing?.seller_creation_cost || 0} credits
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">User Creation Cost</div>
                <div className="text-2xl font-bold text-green-600">
                  {currentUser?.pricing?.user_creation_cost || 0} credits
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Create Button */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by key..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setCreateDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new seller or user. Credits will be deducted based on your pricing.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="key">Key</Label>
                        <Input
                          id="key"
                          value={formData.key}
                          onChange={(e) => setFormData({...formData, key: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="credits">Credits</Label>
                        <Input
                          id="credits"
                          type="number"
                          value={formData.credits}
                          onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="plan_expiry">Plan Expiry</Label>
                        <Input
                          id="plan_expiry"
                          type="date"
                          value={formData.plan_expiry}
                          onChange={(e) => setFormData({...formData, plan_expiry: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    {formData.role === 'seller' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="seller_cost">Seller Creation Cost</Label>
                          <Input
                            id="seller_cost"
                            type="number"
                            value={formData.seller_creation_cost}
                            onChange={(e) => setFormData({...formData, seller_creation_cost: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user_cost">User Creation Cost</Label>
                          <Input
                            id="user_cost"
                            type="number"
                            value={formData.user_creation_cost}
                            onChange={(e) => setFormData({...formData, user_creation_cost: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Cost:</strong> {' '}
                        {formData.role === 'seller' 
                          ? `${currentUser?.pricing?.seller_creation_cost || 0} credits`
                          : `${currentUser?.pricing?.user_creation_cost || 0} credits`
                        }
                      </p>
                      <p className="text-sm text-yellow-800">
                        <strong>Remaining after creation:</strong> {' '}
                        {(currentUser?.credits || 0) - (formData.role === 'seller' 
                          ? (currentUser?.pricing?.seller_creation_cost || 0)
                          : (currentUser?.pricing?.user_creation_cost || 0)
                        )} credits
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create User
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Users</CardTitle>
            <CardDescription>
              Manage users you've created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.key.substring(0, 20)}...
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.credits}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(user.status)} text-white`}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.remainingDays}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-key">Key</Label>
                <Input
                  id="edit-key"
                  value={formData.key}
                  onChange={(e) => setFormData({...formData, key: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-credits">Credits</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-expiry">Plan Expiry</Label>
                <Input
                  id="edit-plan-expiry"
                  type="date"
                  value={formData.plan_expiry}
                  onChange={(e) => setFormData({...formData, plan_expiry: e.target.value})}
                  required
                />
              </div>
            </div>

            {formData.role === 'seller' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-seller-cost">Seller Creation Cost</Label>
                  <Input
                    id="edit-seller-cost"
                    type="number"
                    value={formData.seller_creation_cost}
                    onChange={(e) => setFormData({...formData, seller_creation_cost: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-user-cost">User Creation Cost</Label>
                  <Input
                    id="edit-user-cost"
                    type="number"
                    value={formData.user_creation_cost}
                    onChange={(e) => setFormData({...formData, user_creation_cost: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}