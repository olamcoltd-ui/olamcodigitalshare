import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Supabase import removed - using API client
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Award,
  Share2,
  Gift,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  referral_code: string | null;
  is_admin: boolean;
  created_at: string;
  referred_by: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  totalCommissions: number;
  activeReferrals: number;
}

const Profile: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({ totalReferrals: 0, totalCommissions: 0, activeReferrals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchProfile();
      fetchReferralStats();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralStats = async () => {
    try {
      // Fetch referral tracking data
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_id', user?.id);

      if (referralsError) throw referralsError;

      // Fetch commission data
      const { data: commissions, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('referrer_id', user?.id);

      if (commissionsError) throw commissionsError;

      const totalCommissions = commissions?.reduce((sum, comm) => sum + Number(comm.commission_amount), 0) || 0;

      setReferralStats({
        totalReferrals: referrals?.length || 0,
        totalCommissions,
        activeReferrals: referrals?.length || 0 // Simplified for now
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const referralLink = `${window.location.origin}/auth?mode=signup&ref=${profile.referral_code}`;
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const shareReferralCode = () => {
    if (profile?.referral_code) {
      const message = `Join Olamco Digital Hub and start earning! Use my referral code: ${profile.referral_code}. Sign up at: ${window.location.origin}/auth?mode=signup&ref=${profile.referral_code}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Join Olamco Digital Hub',
          text: message,
          url: `${window.location.origin}/auth?mode=signup&ref=${profile.referral_code}`
        });
      } else {
        navigator.clipboard.writeText(message);
        toast.success('Referral message copied to clipboard!');
      }
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
      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground text-lg">
            Manage your profile and track your referral performance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      value={profile.full_name || 'Not provided'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      value={profile.phone || 'Not provided'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Member Since
                    </Label>
                    <Input
                      value={new Date(profile.created_at).toLocaleDateString()}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                {profile.is_admin && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-primary">Administrator Account</span>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={() => navigate('/settings')}
                  variant="hero"
                  className="w-full md:w-auto"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={profile.account_name || 'Not provided'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={profile.account_number || 'Not provided'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={profile.bank_name || 'Not provided'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/settings')}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  Update Bank Details
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Referral Code */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <code className="text-2xl font-mono font-bold text-primary">
                    {profile.referral_code}
                  </code>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={copyReferralLink}
                    variant="hero"
                    size="sm"
                    className="w-full"
                  >
                    Copy Referral Link
                  </Button>
                  
                  <Button 
                    onClick={shareReferralCode}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Referral Stats */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Referral Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Referrals</span>
                    <span className="font-bold text-lg">{referralStats.totalReferrals}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Commissions</span>
                    <span className="font-bold text-lg text-success">
                      ₦{referralStats.totalCommissions.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Referrals</span>
                    <span className="font-bold text-lg text-primary">{referralStats.activeReferrals}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/analytics')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;