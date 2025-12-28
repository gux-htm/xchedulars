import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Calendar, Clock, MapPin, Users, Book, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSounds } from '@/hooks/useSounds';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function InstructorTimetable() {
  const { user, isInstructor, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sounds } = useSounds();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedTimetable, setGroupedTimetable] = useState<any>({});
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Check if user is authorized
    if (!user || !isInstructor) {
      router.push('/login');
      return;
    }

    loadTimetable();
  }, [authLoading, isInstructor, user, router]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      // Use the dedicated instructor schedule endpoint (no ID needed, uses logged-in user)
      const response = await timetableAPI.getInstructorSchedule();
      const timetableData = response.data.schedule || [];
      
      console.log('Raw timetable data:', timetableData);
      
      // Transform the schedule data to match the expected format
      const transformedData = timetableData.map((item: any) => {
        // Capitalize the day name (backend returns lowercase like "monday")
        const dayCapitalized = item.day_of_week 
          ? item.day_of_week.charAt(0).toUpperCase() + item.day_of_week.slice(1).toLowerCase()
          : '';
        
        return {
          ...item,
          day: dayCapitalized,
          course_name: item.course_name,
          course_code: item.course_code,
          type: item.course_type,
          section_name: item.section_name,
          semester: item.semester,
          shift: item.shift,
          major_name: item.major_name,
          room_name: item.room_name,
          start_time: item.start_time,
          end_time: item.end_time
        };
      });
      
      console.log('Transformed timetable data:', transformedData);
      
      setTimetable(transformedData);
      
      // Group by day
      const grouped = groupByDay(transformedData);
      console.log('Grouped timetable:', grouped);
      setGroupedTimetable(grouped);
    } catch (error: any) {
      console.error('Failed to load timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = (data: any[]) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const grouped: any = {};

    days.forEach(day => {
      grouped[day] = data
        .filter(item => item.day === day)
        .sort((a, b) => {
          // Sort by start time
          const timeA = a.start_time || '';
          const timeB = b.start_time || '';
          return timeA.localeCompare(timeB);
        });
    });

    return grouped;
  };

  const handleRefresh = () => {
    sounds.whoosh();
    loadTimetable();
  };

  const handleDayToggle = (day: string) => {
    sounds.toggle();
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSelectAllDays = () => {
    sounds.toggle();
    const activeDays = days.filter(day => (groupedTimetable[day] || []).length > 0);
    if (selectedDays.length === activeDays.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(activeDays);
    }
  };

  const handleClearFilters = () => {
    sounds.click();
    setSelectedDays([]);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (timetable.length === 0) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
              <p className="text-muted-foreground mt-1">Your weekly class schedule</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Classes Scheduled</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have any classes scheduled yet. Once the admin generates the timetable and assigns courses to you, they will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
            <p className="text-muted-foreground mt-1">Your weekly class schedule</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                  <p className="text-2xl font-bold text-foreground">{timetable.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Courses</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(timetable.map(t => t.course_code)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teaching Days</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Object.values(groupedTimetable).filter((classes: any) => classes.length > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-primary" />
                <span>Filter by Day</span>
              </span>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAllDays}
                >
                  {selectedDays.length === days.filter(d => (groupedTimetable[d] || []).length > 0).length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </Button>
                {selectedDays.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {days.map(day => {
                const dayClasses = groupedTimetable[day] || [];
                const isActive = dayClasses.length > 0;
                const isSelected = selectedDays.includes(day);
                
                if (!isActive) return null;

                return (
                  <MotionButton
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day}
                    <span className="ml-2 text-xs opacity-75">
                      ({dayClasses.length})
                    </span>
                  </MotionButton>
                );
              })}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing {selectedDays.length} {selectedDays.length === 1 ? 'day' : 'days'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timetable by Day */}
        <div className="space-y-6">
          {days.map((day, dayIndex) => {
            const dayClasses = groupedTimetable[day] || [];
            
            // Filter logic: show if no filter selected OR day is selected
            if (dayClasses.length === 0) return null;
            if (selectedDays.length > 0 && !selectedDays.includes(day)) return null;

            return (
              <MotionDiv
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span>{day}</span>
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayClasses.map((classItem: any, index: number) => (
                        <MotionDiv
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg text-foreground">
                                  {classItem.course_name}
                                </h3>
                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                                  {classItem.course_code}
                                </span>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  classItem.type === 'lab' 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}>
                                  {classItem.type}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center space-x-2 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {classItem.start_time?.substring(0, 5)} - {classItem.end_time?.substring(0, 5)}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{classItem.room_name || 'TBA'}</span>
                                </div>

                                <div className="flex items-center space-x-2 text-muted-foreground">
                                  <Users className="h-4 w-4" />
                                  <span>
                                    {classItem.section_name} ({classItem.major_name})
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 text-muted-foreground">
                                  <Book className="h-4 w-4" />
                                  <span>Semester {classItem.semester}</span>
                                </div>
                              </div>

                              {classItem.shift && (
                                <div className="mt-2">
                                  <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                                    {classItem.shift.charAt(0).toUpperCase() + classItem.shift.slice(1)} Shift
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </MotionDiv>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Timetable Information</h3>
                <p className="text-sm text-muted-foreground">
                  This is your personal teaching schedule. If you need to reschedule a class, please contact the admin or use the reschedule feature in the Course Requests section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
