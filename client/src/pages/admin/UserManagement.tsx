import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  referral_code: string | null;
  is_admin: boolean;
  created_at: string;
  wallet?: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  subscription?: {
    status: string;
    plan_name: string;
  };
}

const UserManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchUsers();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their wallet and subscription data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          wallets (*),
          user_subscriptions (
            status,
            subscription_plans (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Transform the data
      const transformedUsers = profiles?.map((profile: any) => ({
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        referral_code: profile.referral_code,
        is_admin: profile.is_admin,
        created_at: profile.created_at,
        wallet: profile.wallets?.[0] || { balance: 0, total_earned: 0, total_withdrawn: 0 },
        subscription: profile.user_subscriptions?.[0] ? {
          status: profile.user_subscriptions[0].status,
          plan_name: profile.user_subscriptions[0].subscription_plans?.name || 'Free'
        } : { status: 'free', plan_name: 'Free' }
      })) || [];

      setUsers(transformedUsers);
      setFilteredUsers(transformedUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`User ${!currentStatus ? 'promoted to' : 'removed from'} admin`);
      fetchUsers();

    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  const getSubscriptionBadge = (subscription: any) => {
    const variant = subscription.status === 'active' ? 'default' : 'secondary';
    return (
      <Badge variant={variant}>
        {subscription.plan_name}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground text-lg">
            Manage platform users and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-success">
                    {users.filter(u => u.subscription?.status === 'active').length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Free Users</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.subscription?.status !== 'active').length}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold text-primary">
                    {users.filter(u => u.is_admin).length}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-elegant mb-8">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email, name, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userData) => (
                    <TableRow key={userData.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{userData.full_name || 'No name'}</span>
                            {userData.is_admin && (
                              <Crown className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{userData.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(userData.subscription)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-success">
                          ₦{userData.wallet?.balance?.toLocaleString() || '0'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ₦{userData.wallet?.total_earned?.toLocaleString() || '0'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {userData.referral_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(userData.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={userData.is_admin ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleAdminStatus(userData.user_id, userData.is_admin)}
                          disabled={userData.user_id === user?.id}
                        >
                          {userData.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'No users have joined yet'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;