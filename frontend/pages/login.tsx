
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FiMail, FiLock } from 'react-icons/fi';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedGhost } from '@/components/AnimatedGhost';
import { authAPI } from '@/lib/api';

const MotionDiv = motion.div as any;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusState, setFocusState] = useState<'idle' | 'email' | 'password'>('idle');
  const [loginState, setLoginState] = useState<'success' | 'error' | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginState(null);

    try {
      // Attempt login first to validate credentials
      const response = await authAPI.login({ email, password });

      // If successful, show success animation
      setLoginState('success');
      toast.success('Login successful!');

      // Store credentials immediately
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Wait 1 second to show ghost reaction
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use router to navigate (this will trigger AuthContext to update)
      if (userData.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (userData.role === 'instructor') {
        window.location.href = '/instructor/dashboard';
      } else {
        window.location.href = '/student/dashboard';
      }
    } catch (error: any) {
      setLoginState('error');
      toast.error(error.response?.data?.error || 'Login failed');
      // Reset after animation
      setTimeout(() => setLoginState(null), 1500);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <MotionDiv
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Animated Ghost */}
        <div className="mb-8">
          <AnimatedGhost focusState={focusState} loginState={loginState} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-primary">
              <GraduationCap className="inline-block mr-2 w-8 h-8" /> Xchedular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  {/* Fix: Wrap react-icons in a span with className to avoid IconBaseProps TS error */}
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <FiMail />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusState('email')}
                    onBlur={() => setFocusState('idle')}
                    className="pl-10"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  {/* Fix: Wrap react-icons in a span with className to avoid IconBaseProps TS error */}
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <FiLock />
                  </span>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusState('password')}
                    onBlur={() => setFocusState('idle')}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  );
}
