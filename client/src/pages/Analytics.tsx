import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Supabase import removed - using API client
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Eye,
  Download,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalSales: number;
  totalEarnings: number;
  totalReferrals: number;
  productViews: number;
  downloadCount: number;
  shareCount: number;
  recentSales: any[];
}

const Analytics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('seller_id', user?.id || '');

      if (salesError) throw salesError;

      // Fetch referral data
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_id', user?.id || '');

      if (referralsError) throw referralsError;

      // Calculate analytics
      const totalSales = sales?.length || 0;
      const totalEarnings = sales?.reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0) || 0;
      const totalReferrals = referrals?.length || 0;

      setAnalytics({
        totalSales,
        totalEarnings,
        totalReferrals,
        productViews: 0, // This would require additional tracking
        downloadCount: 0, // This would require additional tracking
        shareCount: 0, // This would require additional tracking
        recentSales: sales?.slice(0, 5) || []
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Track your performance and earnings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-primary">
                    {analytics?.totalSales || 0}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-success">
                    ₦{analytics?.totalEarnings?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referrals</p>
                  <p className="text-2xl font-bold">
                    {analytics?.totalReferrals || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Product Views</p>
                  <p className="text-2xl font-bold">
                    {analytics?.productViews || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                  <p className="text-2xl font-bold">
                    {analytics?.downloadCount || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Download className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shares</p>
                  <p className="text-2xl font-bold">
                    {analytics?.shareCount || 0}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.recentSales?.length ? (
              <div className="space-y-4">
                {analytics.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{sale.buyer_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">
                        ₦{Number(sale.commission_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Commission
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No sales data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;