import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Mail, Briefcase, Award, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const MotionDiv = motion.div as any;

export default function Instructors() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadInstructors();
  }, [isAdmin, router]);

  const loadInstructors = async () => {
    try {
      const response = await adminAPI.getInstructors();
      setInstructors(response.data.instructors);
    } catch (error) {
      console.error('Failed to load instructors:', error);
      toast.error('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const parseMetadata = (metadata: any) => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Faculty Directory</h1>
            <p className="text-muted-foreground mt-1">Manage and view details of {instructors.length} registered instructor(s)</p>
          </div>
        </div>

        {instructors.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <GraduationCap className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">No Instructors Found</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
              Instructors need to register and be approved by an administrator to appear here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instructor, index) => {
              const metadata = parseMetadata(instructor.metadata);
              return (
                <MotionDiv
                  key={instructor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className="h-full overflow-hidden border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                          <AvatarImage src={metadata.profile_picture || `https://ui-avatars.com/api/?name=${instructor.name}&background=random`} className="object-cover" />
                          <AvatarFallback className="text-lg bg-primary/10 text-primary">{instructor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Badge variant="outline" className="capitalize bg-muted/50">
                          Instructor
                        </Badge>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-foreground line-clamp-1" title={instructor.name}>
                          {instructor.name}
                        </h3>
                        <p className="text-sm text-primary font-medium flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          {instructor.department || 'General Faculty'}
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
                          <div className="p-1.5 bg-muted rounded group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Mail size={14} />
                          </div>
                          <span className="truncate" title={instructor.email}>{instructor.email}</span>
                        </div>
                        
                        {metadata && metadata.specialization && (
                          <div className="flex items-start space-x-2 text-sm">
                             <div className="p-1.5 bg-muted rounded mt-0.5 text-muted-foreground">
                              <Award size={14} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Specialization</p>
                              <p className="font-medium text-foreground line-clamp-2">{metadata.specialization}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </MotionDiv>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}