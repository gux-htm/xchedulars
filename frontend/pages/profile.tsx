import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Briefcase, Award, Image as ImageIcon, Camera, Save, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/select'; // Re-using separator style if available, or div

const MotionDiv = motion.div as any;
const MotionCard = motion(Card) as any;

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    specialization: '',
    profile_picture: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        department: user.department || '',
        specialization: user.metadata?.specialization || '',
        profile_picture: user.metadata?.profile_picture || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.updateProfile(formData);
      updateUser(response.data.user);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-48 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden shadow-lg"
        >
          <div className="absolute inset-0 bg-grid-white/[0.2] bg-[size:20px_20px]" />
          <div className="absolute bottom-4 left-6 text-white z-10">
             <h1 className="text-3xl font-bold">{user.name}</h1>
             <p className="opacity-90 flex items-center gap-2">
               <Shield className="w-4 h-4" /> {user.role.toUpperCase()}
             </p>
          </div>
        </MotionDiv>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-16 px-4">
          {/* Left Column: Avatar & Summary */}
          <div className="lg:col-span-1 space-y-6">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg border-t-0 rounded-t-none lg:rounded-t-xl overflow-visible">
                <CardContent className="pt-0 relative flex flex-col items-center">
                  <div className="relative -mt-16 mb-4">
                    <div className="p-1.5 bg-background rounded-full">
                      <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                        <AvatarImage 
                          src={formData.profile_picture || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                          className="object-cover"
                        />
                        <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  
                  <div className="text-center w-full space-y-4 py-2">
                    <div>
                      <h2 className="text-xl font-bold">{user.name}</h2>
                      <p className="text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    
                    <div className="w-full h-px bg-border" />
                    
                    <div className="space-y-3 text-sm text-left px-2">
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="w-4 h-4 mr-3 text-primary" /> 
                        <span className="truncate" title={user.email}>{user.email}</span>
                      </div>
                      {user.department && (
                        <div className="flex items-center text-muted-foreground">
                          <Briefcase className="w-4 h-4 mr-3 text-primary" /> 
                          <span>{user.department}</span>
                        </div>
                      )}
                      {formData.specialization && (
                        <div className="flex items-center text-muted-foreground">
                          <Award className="w-4 h-4 mr-3 text-primary" /> 
                          <span>{formData.specialization}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          </div>

          {/* Right Column: Edit Form */}
          <div className="lg:col-span-2">
            <MotionDiv
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Edit Profile
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and public profile information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">
                            <User className="w-4 h-4" />
                          </span>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="pl-9"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                          </span>
                          <Input
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="pl-9"
                            placeholder="Computer Science"
                          />
                        </div>
                      </div>

                      {user.role === 'instructor' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="specialization">Specialization</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                              <Award className="w-4 h-4" />
                            </span>
                            <Input
                              id="specialization"
                              name="specialization"
                              value={formData.specialization}
                              onChange={handleChange}
                              className="pl-9"
                              placeholder="e.g., Artificial Intelligence, Data Science, Cyber Security"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            This will be displayed to admins when assigning courses.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="profile_picture">Profile Picture URL</Label>
                        <div className="flex gap-3">
                           <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                            </span>
                            <Input
                              id="profile_picture"
                              name="profile_picture"
                              value={formData.profile_picture}
                              onChange={handleChange}
                              className="pl-9"
                              placeholder="https://example.com/my-avatar.jpg"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Provide a direct link to an image file (JPG, PNG). Gravatar or Cloudinary links work best.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end border-t">
                      <Button type="submit" disabled={loading} className="min-w-[150px]">
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save Changes
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </MotionDiv>
          </div>
        </div>
      </div>
    </Layout>
  );
}