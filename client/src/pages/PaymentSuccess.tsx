import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Download, 
  Home, 
  ShoppingBag, 
  User,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<'product' | 'subscription' | null>(null);
  
  useEffect(() => {
    // Get payment details from URL parameters
    const reference = searchParams.get('reference');
    const type = searchParams.get('type'); // 'product' or 'subscription'
    
    if (reference) {
      setPaymentType(type as 'product' | 'subscription');
      toast.success('Payment completed successfully!');
    }
    
    setLoading(false);
  }, [searchParams]);

  const handleRedirect = () => {
    if (paymentType === 'product') {
      navigate('/dashboard');
    } else if (paymentType === 'subscription') {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <div className="container max-w-md px-4">
        <Card className="shadow-elegant text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl text-success">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {paymentType === 'product' 
                ? 'Your purchase was completed successfully. You can now access your digital product.'
                : paymentType === 'subscription'
                ? 'Your subscription has been activated successfully. Enjoy your premium benefits!'
                : 'Your payment has been processed successfully.'
              }
            </p>

            <div className="space-y-3">
              {paymentType === 'product' && (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="hero"
                  size="lg"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  View My Purchases
                </Button>
              )}
              
              {paymentType === 'subscription' && (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="hero"
                  size="lg"
                  className="w-full"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Access Dashboard
                </Button>
              )}
              
              <Button 
                onClick={() => navigate('/products')}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse More Products
              </Button>
              
              <Button 
                onClick={() => navigate('/')}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team or check your email for purchase details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;