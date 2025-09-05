import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Download,
  Plus,
  Settings,
  BarChart3,
  Wallet
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    pendingWithdrawals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAdminStats();
  }, [user, navigate]);

  const fetchAdminStats = async () => {
    try {
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profile?.is_admin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Fetch statistics
      const [usersResult, productsResult, salesResult, subscriptionsResult, withdrawalsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('sales').select('amount', { count: 'exact' }),
        supabase.from('user_subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('withdrawals').select('amount', { count: 'exact' }).eq('status', 'pending')
      ]);

      // Calculate total revenue
      const { data: salesData } = await supabase
        .from('sales')
        .select('amount')
        .eq('payment_status', 'paid');

      const totalRevenue = salesData?.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalSales: salesResult.count || 0,
        totalRevenue,
        activeSubscriptions: subscriptionsResult.count || 0,
        pendingWithdrawals: withdrawalsResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to load admin statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-green-600 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Manage your OLAMCO DIGITAL platform
          </p>
          <Badge className="mt-2 bg-gradient-to-r from-purple-600 to-green-600 text-white">
            Administrator
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-purple-100 hover:border-purple-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card className="border-green-100 hover:border-green-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Digital products</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 hover:border-blue-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">Completed sales</p>
            </CardContent>
          </Card>

          <Card className="border-green-100 hover:border-green-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Gross revenue</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100 hover:border-purple-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Paying subscribers</p>
            </CardContent>
          </Card>

          <Card className="border-orange-100 hover:border-orange-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <Download className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingWithdrawals}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/admin/products')}>
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 text-purple-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Manage Products</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Add, edit, or remove digital products from the marketplace
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/admin/users')}>
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                View and manage user accounts, subscriptions, and activity
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/admin/analytics')}>
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                View detailed analytics and platform performance metrics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/admin/wallet')}>
            <CardHeader className="text-center">
              <Wallet className="h-12 w-12 text-orange-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Admin Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Manage admin earnings, withdrawals, and financial reports
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;