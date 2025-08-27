import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Share2, 
  DollarSign, 
  Users, 
  ArrowRight, 
  CheckCircle, 
  Star,
  Download,
  Smartphone,
  Globe
} from 'lucide-react';
import logoImage from '@/assets/olamco-logo.png';

const Landing: React.FC = () => {
  const subscriptionPlans = [
    {
      name: "Free Plan",
      price: "₦0",
      period: "Forever",
      commission: "20%",
      features: ["Basic product sharing", "Standard referral system", "Email support"]
    },
    {
      name: "Monthly Pro",
      price: "₦2,500",
      period: "per month",
      commission: "30%",
      features: ["Premium product access", "Advanced analytics", "Priority support", "Custom referral codes"]
    },
    {
      name: "6-Month Pro",
      price: "₦5,500",
      period: "6 months",
      commission: "40%",
      features: ["Everything in Monthly", "Bulk sharing tools", "Performance insights", "Dedicated support"]
    },
    {
      name: "Annual Pro",
      price: "₦7,000",
      period: "per year",
      commission: "50%",
      features: ["Everything in 6-Month", "Maximum commission", "VIP support", "Exclusive products"]
    }
  ];

  const features = [
    {
      icon: <Share2 className="h-8 w-8" />,
      title: "Easy Social Sharing",
      description: "Share digital products across all social media platforms with your unique referral links"
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Instant Payouts",
      description: "Earn commissions up to 50% and withdraw your earnings directly to your bank account"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Real-time Analytics",
      description: "Track your sales, commissions, and performance with detailed analytics dashboard"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Referral Rewards",
      description: "Earn 15% commission on every sale made by users you refer to the platform"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <img 
                src={logoImage} 
                alt="Olamco Digital Hub" 
                className="h-20 w-auto"
              />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Earn Big
              </span>
              <br />
              Selling Digital Products
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Join thousands of entrepreneurs earning up to <span className="text-success font-semibold">50% commission</span> by sharing premium digital products with their networks
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gradient" size="xl" asChild>
                <Link to="/auth?mode=signup">
                  Start Earning Today <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/products">
                  Browse Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6">Why Choose Olamco Digital Hub?</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to build a successful digital business
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-elegant hover:shadow-xl transition-smooth">
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-primary text-white p-3 rounded-full w-fit mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">
              Higher plans unlock better commission rates and exclusive features
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {subscriptionPlans.map((plan, index) => (
              <Card key={index} className={`relative border-2 transition-smooth hover:shadow-xl ${index === 3 ? 'border-primary bg-gradient-to-b from-primary/5 to-transparent' : 'border-border'}`}>
                {index === 3 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <div className="bg-success/10 text-success px-3 py-1 rounded-full text-sm font-medium">
                      {plan.commission} Commission
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={index === 3 ? "gradient" : "outline"} 
                    className="w-full"
                    asChild
                  >
                    <Link to="/auth?mode=signup">
                      Get Started
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-xl opacity-90">Active Users</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">₦50M+</div>
              <div className="text-xl opacity-90">Paid to Users</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-xl opacity-90">Digital Products</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Earning?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of successful digital entrepreneurs today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gradient" size="xl" asChild>
                <Link to="/auth?mode=signup">
                  Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/auth">
                  Sign In to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;