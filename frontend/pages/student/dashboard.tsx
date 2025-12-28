import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { Book, Calendar, Clock, MapPin, User, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const MotionDiv = motion.div as any;

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [authLoading, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Student's timetable is usually accessed via their section_id
      const response = await timetableAPI.getTimetable();
      setTimetable(response.data.timetable || []);
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  // Use 'long' for weekday then convert to lowercase for comparison
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todaysClasses = timetable.filter(t => t.day.toLowerCase() === today);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Hub</h1>
            <p className="text-muted-foreground mt-1">Academic overview for {user?.name}</p>
          </div>
          <Badge variant="outline" className="text-sm py-1 px-3">
            Active Semester
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="text-primary" size={16} /> Classes Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysClasses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Book className="text-blue-500" size={16} /> Enrolled Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(timetable.map(t => t.course_id)).size}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="text-green-500" size={16} /> Student ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">S-{user?.id.substring(0, 5).toUpperCase()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-primary" /> Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaysClasses.length > 0 ? (
                <div className="space-y-4">
                  {todaysClasses.map((cls, i) => (
                    <MotionDiv
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-lg">{cls.course_name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock size={14} /> {cls.slot_label}</span>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {cls.room_name}</span>
                        </div>
                      </div>
                      <Badge variant={cls.type === 'lab' ? 'secondary' : 'default'}>{cls.type}</Badge>
                    </MotionDiv>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Info className="mx-auto text-muted-foreground mb-4" size={40} />
                  <p className="text-muted-foreground font-medium">No classes scheduled for today.</p>
                  <p className="text-sm text-muted-foreground mt-1">Enjoy your day off or catch up on studies!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="text-blue-500" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md text-sm">
                  <p className="font-semibold text-blue-800 dark:text-blue-300">Timetable Published</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">The final timetable for Spring 2025 has been released.</p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md text-sm">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300">Exam Schedule Coming Soon</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Midterm dates will be announced next week.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
