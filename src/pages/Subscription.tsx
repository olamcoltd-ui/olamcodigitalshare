import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Crown, 
  Check,
  Star,
  Zap,
  Users,
  TrendingUp,
  Shield,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  commission_rate: number;
  created_at: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

const Subscription: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchPlans();
      fetchUserSubscription();
    }
  }, [user, authLoading, navigate]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    }
  };

  const fetchUserSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserSubscription(data);
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      setProcessing(true);
      console.log('Initializing subscription for plan:', plan.name);

      // Initialize payment with Paystack
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user?.email,
          amount: plan.price,
          planId: plan.id,
          metadata: {
            planName: plan.name,
            subscriptionType: 'monthly',
            isSubscription: true
          }
        }
      });

      console.log('Paystack response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data && data.success && data.data?.authorization_url) {
        console.log('Redirecting to Paystack checkout...');
        // Redirect to Paystack checkout with callback URL
        const callbackUrl = `${window.location.origin}/payment-success?type=subscription&reference=${data.data.reference}`;
        window.location.href = `${data.data.authorization_url}&callback_url=${encodeURIComponent(callbackUrl)}`;
      } else {
        console.error('Invalid response format:', data);
        throw new Error(data?.error || 'Payment initialization failed - invalid response');
      }

    } catch (error) {
      console.error('Subscription error:', error);
      const errorMessage = error.message || 'Failed to initialize subscription. Please try again.';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const baseFeatures = [
      'Access to all digital products',
      'Instant download access',
      'Product sharing capabilities',
      'Basic analytics dashboard'
    ];

    if (plan.commission_rate >= 0.15) {
      return [
        ...baseFeatures,
        `${(plan.commission_rate * 100).toFixed(0)}% referral commission`,
        'Priority customer support',
        'Advanced analytics',
        'Withdrawal management'
      ];
    }

    if (plan.commission_rate >= 0.10) {
      return [
        ...baseFeatures,
        `${(plan.commission_rate * 100).toFixed(0)}% referral commission`,
        'Standard customer support',
        'Basic withdrawal options'
      ];
    }

    return [
      ...baseFeatures,
      `${(plan.commission_rate * 100).toFixed(0)}% referral commission`,
      'Email support'
    ];
  };

  const getPlanIcon = (index: number) => {
    const icons = [Users, Star, Crown];
    const Icon = icons[index] || Zap;
    return Icon;
  };

  const getPlanColor = (index: number) => {
    const colors = ['text-blue-500', 'text-purple-500', 'text-amber-500'];
    return colors[index] || 'text-primary';
  };

  const isCurrentPlan = (planId: string) => {
    return userSubscription?.plan_id === planId;
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
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Choose Your 
            <span className="bg-gradient-primary bg-clip-text text-transparent ml-3">
              Success Plan
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock higher earning potential with our subscription plans. 
            Get better commission rates and exclusive features.
          </p>
        </div>

        {/* Current Subscription Status */}
        {userSubscription && (
          <Card className="mb-8 shadow-elegant border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-success/10 p-2 rounded-full">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-success">Active Subscription</p>
                    <p className="text-sm text-muted-foreground">
                      Expires on {new Date(userSubscription.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  Premium Member
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => {
            const Icon = getPlanIcon(index);
            const iconColor = getPlanColor(index);
            const features = getPlanFeatures(plan);
            const isPopular = index === 1;
            const isCurrent = isCurrentPlan(plan.id);

            return (
              <Card 
                key={plan.id} 
                className={`shadow-elegant relative ${
                  isPopular ? 'border-primary shadow-xl scale-105' : ''
                } ${isCurrent ? 'border-success' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-success text-white px-4 py-1">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className={`mx-auto mb-4 p-3 rounded-full bg-muted ${iconColor}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold">₦{plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground">/{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</span>
                  </div>
                  
                  <Badge 
                    variant="secondary" 
                    className="bg-gradient-primary text-white"
                  >
                    {(plan.commission_rate * 100).toFixed(0)}% Commission Rate
                  </Badge>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-6">
                    {features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className="bg-success/10 p-1 rounded-full">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing || isCurrent}
                    variant={isPopular ? "hero" : "outline"}
                    size="lg"
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      'Subscribe Now'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="shadow-elegant text-center">
            <CardContent className="p-6">
              <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Higher Earnings</h3>
              <p className="text-sm text-muted-foreground">
                Earn more with increased commission rates on every referral sale
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant text-center">
            <CardContent className="p-6">
              <div className="bg-success/10 p-3 rounded-full w-fit mx-auto mb-4">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Get priority customer support and faster response times
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant text-center">
            <CardContent className="p-6">
              <div className="bg-amber-500/10 p-3 rounded-full w-fit mx-auto mb-4">
                <Gift className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Exclusive Access</h3>
              <p className="text-sm text-muted-foreground">
                Access to premium features and advanced analytics dashboard
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;