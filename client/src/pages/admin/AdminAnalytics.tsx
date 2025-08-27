import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download,
  Share2,
  Crown,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminAnalytics {
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCommissionsPaid: number;
  totalWithdrawals: number;
  activeSubscriptions: number;
  pendingWithdrawals: number;
  recentActivity: any[];
}

const AdminAnalytics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchAnalytics();
    }
  }, [user, authLoading, navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*');

      if (salesError) throw salesError;

      // Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*');

      if (withdrawalsError) throw withdrawalsError;

      // Fetch active subscriptions
      const { count: activeSubsCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate metrics
      const totalSales = sales?.length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.sale_amount || 0), 0) || 0;
      const totalCommissionsPaid = sales?.reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0) || 0;
      
      const completedWithdrawals = withdrawals?.filter(w => w.status === 'completed') || [];
      const totalWithdrawals = completedWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
      
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;

      setAnalytics({
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        totalSales,
        totalRevenue,
        totalCommissionsPaid,
        totalWithdrawals,
        activeSubscriptions: activeSubsCount || 0,
        pendingWithdrawals,
        recentActivity: sales?.slice(0, 10) || []
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const adminRevenue = analytics ? analytics.totalRevenue - analytics.totalCommissionsPaid : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Analytics</h1>
          <p className="text-muted-foreground text-lg">
            Platform performance and revenue insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-elegant border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Revenue</p>
                  <p className="text-3xl font-bold text-success">
                    ₦{adminRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <Crown className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-primary">
                    ₦{analytics?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">
                    {analytics?.totalUsers || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-3xl font-bold">
                    {analytics?.totalProducts || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">
                    {analytics?.totalSales || 0}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Commissions Paid</p>
                  <p className="text-2xl font-bold text-warning">
                    ₦{analytics?.totalCommissionsPaid?.toLocaleString() || '0'}
                  </p>
                </div>
                <Share2 className="h-6 w-6 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-success">
                    {analytics?.activeSubscriptions || 0}
                  </p>
                </div>
                <Users className="h-6 w-6 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-destructive">
                    {analytics?.pendingWithdrawals || 0}
                  </p>
                </div>
                <Download className="h-6 w-6 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Sales Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.recentActivity?.length ? (
              <div className="space-y-4">
                {analytics.recentActivity.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{sale.buyer_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString()} • 
                        Sale Amount: ₦{Number(sale.sale_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">
                        ₦{(Number(sale.sale_amount || 0) - Number(sale.commission_amount || 0)).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Admin Revenue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No sales activity yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;