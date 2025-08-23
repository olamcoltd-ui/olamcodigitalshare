import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  CreditCard,
  User,
  Mail,
  Lock,
  ArrowLeft,
  Check,
  Download,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail_url: string;
  file_size_mb: number;
  tags: string[];
}

interface CheckoutFormData {
  email: string;
  full_name: string;
  referral_code?: string;
}

const Checkout: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: user?.email || '',
    full_name: '',
    referral_code: ''
  });

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }

    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode }));
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePurchase = async () => {
    try {
      if (!product) return;

      // Validate form for guest users
      if (!user) {
        if (!formData.email || !formData.full_name) {
          toast.error('Please fill in all required fields');
          return;
        }
      }

      setProcessing(true);

      // Initialize payment with Paystack
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user?.email || formData.email,
          amount: product.price,
          productId: product.id,
          referralCode: formData.referral_code,
          metadata: {
            productTitle: product.title,
            buyerName: user?.user_metadata?.full_name || formData.full_name,
            isGuest: !user
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        // Redirect to Paystack checkout
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error(data.error || 'Payment initialization failed');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleShare = () => {
    if (product) {
      const shareUrl = `${window.location.origin}/checkout/${product.id}${formData.referral_code ? `?ref=${formData.referral_code}` : ''}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Product link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button onClick={() => navigate('/products')} variant="hero">
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/products')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          
          <h1 className="text-4xl font-bold mb-2">Checkout</h1>
          <p className="text-muted-foreground text-lg">
            Complete your purchase securely
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Details */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {product.thumbnail_url ? (
                  <img
                    src={`https://wroqliryvssdljfmyjtu.supabase.co/storage/v1/object/public/product-images/${product.thumbnail_url}`}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Download className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
                <p className="text-muted-foreground mb-4">{product.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold text-success">
                    ₦{product.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {product.file_size_mb}MB
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {product.tags?.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-muted rounded-md text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {user ? 'Payment Details' : 'Your Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!user && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="referralCode">
                  Referral Code (Optional)
                </Label>
                <Input
                  id="referralCode"
                  value={formData.referral_code}
                  onChange={(e) => handleInputChange('referral_code', e.target.value)}
                  placeholder="Enter referral code if any"
                />
                {formData.referral_code && (
                  <p className="text-xs text-success">
                    ✓ Referral code applied - Referrer will earn commission
                  </p>
                )}
              </div>
              
              {!user && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Create an account for better experience
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Track purchases, manage downloads, and earn referral commissions
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => navigate('/auth?mode=signup')}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold text-success">
                    ₦{product.price.toLocaleString()}
                  </span>
                </div>
                
                <Button 
                  onClick={handlePurchase}
                  disabled={processing || (!user && (!formData.email || !formData.full_name))}
                  className="w-full"
                  variant="hero"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Pay ₦{product.price.toLocaleString()}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Secure payment powered by Paystack. Your information is protected.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;