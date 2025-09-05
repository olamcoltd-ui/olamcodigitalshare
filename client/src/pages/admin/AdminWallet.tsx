import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Download,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface WithdrawalRequest {
  id: string;
  amount: number;
  account_name: string;
  account_number: string;
  bank_name: string;
  status: string;
  created_at: string;
  processed_at?: string;
  failure_reason?: string;
}

const AdminWallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [walletData, setWalletData] = useState({
    balance: 0,
    total_revenue: 0,
    withdrawal_fees: 0,
    subscription_revenue: 0
  });
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchWalletData();
    fetchWithdrawalRequests();
  }, [user, navigate]);

  const fetchWalletData = async () => {
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

      const { data, error } = await supabase
        .from('admin_wallet')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setWalletData({
          balance: Number(data.balance) || 0,
          total_revenue: Number(data.total_revenue) || 0,
          withdrawal_fees: Number(data.withdrawal_fees) || 0,
          subscription_revenue: Number(data.subscription_revenue) || 0
        });
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawalRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawAmount || !accountName || !accountNumber || !bankName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all withdrawal details.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0 || amount > walletData.balance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user?.id,
          amount,
          account_name: accountName,
          account_number: accountNumber,
          bank_name: bankName,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for processing.",
      });

      // Reset form
      setWithdrawAmount("");
      setAccountName("");
      setAccountNumber("");
      setBankName("");

      // Refresh data
      fetchWalletData();
      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-green-600 bg-clip-text text-transparent mb-2">
            Admin Wallet
          </h1>
          <p className="text-xl text-gray-600">
            Manage your admin earnings and withdrawals
          </p>
          <Badge className="mt-2 bg-gradient-to-r from-purple-600 to-green-600 text-white">
            Administrator
          </Badge>
        </div>

        {/* Wallet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-100 hover:border-green-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(walletData.balance)}</div>
              <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 hover:border-blue-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(walletData.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">All-time earnings</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100 hover:border-purple-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Withdrawal Fees</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(walletData.withdrawal_fees)}</div>
              <p className="text-xs text-muted-foreground">Processing fees collected</p>
            </CardContent>
          </Card>

          <Card className="border-orange-100 hover:border-orange-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(walletData.subscription_revenue)}</div>
              <p className="text-xs text-muted-foreground">From user subscriptions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Withdrawal Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-600" />
                Request Withdrawal
              </CardTitle>
              <CardDescription>
                Withdraw your admin earnings to your bank account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">Withdrawal Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={walletData.balance}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {formatCurrency(walletData.balance)}
                </p>
              </div>

              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="Enter account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Access Bank</SelectItem>
                    <SelectItem value="gtb">GTBank</SelectItem>
                    <SelectItem value="first">First Bank</SelectItem>
                    <SelectItem value="zenith">Zenith Bank</SelectItem>
                    <SelectItem value="uba">UBA</SelectItem>
                    <SelectItem value="fidelity">Fidelity Bank</SelectItem>
                    <SelectItem value="union">Union Bank</SelectItem>
                    <SelectItem value="sterling">Sterling Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleWithdrawal}
                disabled={processing || !withdrawAmount || !accountName || !accountNumber || !bankName}
                className="w-full bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
              >
                {processing ? "Processing..." : "Request Withdrawal"}
              </Button>
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>
                Track your withdrawal requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawalRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No withdrawal requests yet
                </p>
              ) : (
                <div className="space-y-4">
                  {withdrawalRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">{formatCurrency(request.amount)}</div>
                        <div className="text-sm text-gray-500">
                          {request.bank_name} - {request.account_number}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge variant={
                          request.status === 'completed' ? 'default' :
                          request.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminWallet;