import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  Download,
  DollarSign,
  Plus,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WalletData {
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  processing_fee: number;
}

interface Bank {
  name: string;
  code: string;
  id: number;
}

const Wallet: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [verifying, setVerifying] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchWalletData();
      fetchWithdrawals();
      fetchBanks();
    }
  }, [user, authLoading, navigate]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Failed to load wallet data');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawal history');
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      console.log('Fetching banks list...');
      const { data, error } = await supabase.functions.invoke('get-paystack-banks');
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Banks response:', data);
      
      if (data && data.success && Array.isArray(data.data)) {
        setBanks(data.data);
        console.log('Banks loaded successfully:', data.data.length);
      } else {
        throw new Error(data?.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast.error('Failed to load banks list. Please try again.');
      setBanks([]);
    }
  };

  const verifyBankAccount = async () => {
    if (!accountNumber || !bankCode) {
      toast.error('Please select bank and enter account number');
      return;
    }

    try {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke('verify-bank-details', {
        body: {
          account_number: accountNumber,
          bank_code: bankCode
        }
      });

      if (error) throw error;

      if (data.success) {
        setAccountName(data.data.account_name);
        setBankName(data.data.bank_name);
        toast.success('Account verified successfully!');
      } else {
        throw new Error(data.error || 'Account verification failed');
      }
    } catch (error) {
      console.error('Bank verification error:', error);
      toast.error('Failed to verify account. Please check details.');
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdrawal = async () => {
    try {
      const withdrawalAmount = parseFloat(amount);
      const processingFee = 50;
      const netAmount = withdrawalAmount - processingFee;

      if (!withdrawalAmount || withdrawalAmount < processingFee) {
        toast.error(`Minimum withdrawal is ₦${processingFee + 1}`);
        return;
      }

      if (withdrawalAmount > (wallet?.balance || 0)) {
        toast.error('Insufficient balance');
        return;
      }

      if (!accountName || !accountNumber || !bankName) {
        toast.error('Please fill all account details');
        return;
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user?.id,
          amount: withdrawalAmount,
          net_amount: netAmount,
          account_name: accountName,
          account_number: accountNumber,
          bank_name: bankName,
          processing_fee: processingFee,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully');
      setWithdrawalOpen(false);
      
      // Reset form
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setBankCode('');
      setBankName('');
      
      // Refresh data
      fetchWalletData();
      fetchWithdrawals();

    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Failed to submit withdrawal request');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
          <h1 className="text-4xl font-bold mb-2">Wallet</h1>
          <p className="text-muted-foreground text-lg">
            Manage your earnings and withdrawals
          </p>
        </div>

        {/* Wallet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-success">
                    ₦{wallet?.balance?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <WalletIcon className="h-6 w-6 text-success" />
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

        {/* Withdrawal Button */}
        <div className="mb-8">
          <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg" className="w-full md:w-auto">
                <Minus className="h-5 w-5 mr-2" />
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Processing fee: ₦50 | Net amount: ₦{amount ? Math.max(0, parseFloat(amount) - 50) : 0}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="bankCode">Select Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border shadow-elegant max-h-[200px] overflow-y-auto">
                      {banks.length > 0 ? (
                        banks.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground text-sm">
                          {banks.length === 0 ? 'Loading banks...' : 'No banks available'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {banks.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Banks list is loading. Please wait...
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      maxLength={10}
                    />
                    <Button 
                      type="button"
                      onClick={verifyBankAccount}
                      disabled={!accountNumber || !bankCode || verifying}
                      variant="outline"
                    >
                      {verifying ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </div>
                
                {accountName && (
                  <div>
                    <Label>Account Name</Label>
                    <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="font-medium text-success">{accountName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{bankName}</p>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleWithdrawal} 
                  className="w-full" 
                  variant="hero"
                  disabled={!accountName || !bankName}
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Withdrawal History */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length > 0 ? (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(withdrawal.status)}
                      <div>
                        <p className="font-medium">₦{withdrawal.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Net: ₦{withdrawal.net_amount.toLocaleString()} • {withdrawal.bank_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium capitalize">{withdrawal.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No withdrawal history yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;