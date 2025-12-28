
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { authAPI } from '@/lib/api';
import { FiUser, FiMail, FiLock, FiUsers } from 'react-icons/fi';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MotionDiv = motion.div as any;

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'instructor',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);
  const { register } = useAuth();

  useEffect(() => {
    authAPI.checkFirstAdmin().then((response) => {
      setIsFirstAdmin(response.data.isFirstAdmin);
      if (response.data.isFirstAdmin) {
        setFormData((prev) => ({ ...prev, role: 'admin' }));
      }
    }).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* Fix: Cast e.target to HTMLInputElement to access 'name' and 'value' properties */
    const { name, value } = e.target as HTMLInputElement;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData);

      if (isFirstAdmin) {
        toast.success('First admin registered successfully!');
      } else {
        toast.success('Registration successful! Awaiting admin approval.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <MotionDiv
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-primary">
              <GraduationCap className="inline-block mr-2 w-8 h-8" /> Xchedular
            </CardTitle>
            <p className="text-center text-muted-foreground">
              {isFirstAdmin ? 'First Admin Registration' : 'Create Your Account'}
            </p>
            {isFirstAdmin && (
              <p className="text-sm text-success text-center mt-2">
                As the first admin, your account will be auto-approved
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  {/* Fix: Wrap react-icons in a span with className to avoid IconBaseProps TS error */}
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <FiUser />
                  </span>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  {/* Fix: Wrap react-icons in a span with className to avoid IconBaseProps TS error */}
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <FiMail />
                  </span>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {!isFirstAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Computer Science"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-muted-foreground">
                Student?{' '}
                <Link href="/register-student" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </p>
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  );
}
