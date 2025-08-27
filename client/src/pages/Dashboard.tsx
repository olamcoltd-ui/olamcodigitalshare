import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Supabase import removed - using API client
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Download,
  Share2,
  Eye,
  Wallet,
  Plus,
  Settings as SettingsIcon,
  BarChart3,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  is_admin: boolean;
}

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('Failed to load profile data');
      } else {
        setProfile(profileData);
      }

      // Fetch wallet data
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
        // Create wallet if it doesn't exist
        const { error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user?.id });
        
        if (!createError) {
          setWallet({ balance: 0, total_earned: 0, total_withdrawn: 0 });
        }
      } else {
        setWallet(walletData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const referralLink = `${window.location.origin}/auth?mode=signup&ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
          <Button onClick={() => navigate('/auth')} variant="hero">
            Sign In Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile.full_name || 'Digital Entrepreneur'}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's your earning dashboard overview
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-success">
                    ₦{wallet?.balance?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <Wallet className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                  <p className="text-3xl font-bold text-primary">
                    ₦{wallet?.total_earned?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Withdrawn</p>
                  <p className="text-3xl font-bold">
                    ₦{wallet?.total_withdrawn?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Download className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Section */}
        <Card className="mb-8 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Your Referral Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-lg font-mono font-bold text-primary">
                    {profile.referral_code}
                  </code>
                </div>
              </div>
              <Button onClick={copyReferralLink} variant="hero">
                Copy Link
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share your referral code and earn 15% commission on every sale made by referred users!
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/products')}
          >
            <Eye className="h-6 w-6" />
            Browse Products
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/analytics')}
          >
            <BarChart3 className="h-6 w-6" />
            Analytics
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/wallet')}
          >
            <Wallet className="h-6 w-6" />
            Wallet
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/settings')}
          >
            <SettingsIcon className="h-6 w-6" />
            Settings
          </Button>

          <Button 
            variant="hero" 
            size="lg" 
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/subscription')}
          >
            <Plus className="h-6 w-6" />
            Upgrade Plan
          </Button>
        </div>

        {/* Admin Panel Access */}
        {profile.is_admin && (
          <Card className="shadow-elegant border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Admin Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="hero" 
                  onClick={() => navigate('/admin/products')}
                  className="h-20 flex-col gap-2"
                >
                  <Plus className="h-6 w-6" />
                  Manage Products
                </Button>
                
                <Button 
                  variant="hero" 
                  onClick={() => navigate('/admin/users')}
                  className="h-20 flex-col gap-2"
                >
                  <Users className="h-6 w-6" />
                  Manage Users
                </Button>
                
                <Button 
                  variant="hero" 
                  onClick={() => navigate('/admin/analytics')}
                  className="h-20 flex-col gap-2"
                >
                  <BarChart3 className="h-6 w-6" />
                  Admin Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;