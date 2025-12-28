
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI, adminAPI, aiAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { RefreshCw, Download, Filter, Calendar, FileText, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const MotionDiv = motion.div as any;

export default function AdminTimetable() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sounds } = useSounds();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Filter states
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedIntake, setSelectedIntake] = useState<string>('all');
  const [availableIntakes, setAvailableIntakes] = useState<string[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  
  // AI States
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<{ conflicts: any[], suggestions: any[] } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadInitialData();
  }, [authLoading, isAdmin, router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [programsRes, timetableRes] = await Promise.all([
        adminAPI.getPrograms(),
        timetableAPI.getTimetable()
      ]);
      setPrograms(programsRes.data.programs);
      setTimetable(timetableRes.data.timetable || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeTimetable = async () => {
    setAnalyzing(true);
    sounds.click();
    try {
      const response = await aiAPI.analyzeTimetable();
      setAiReport(response.data);
      sounds.success();
      toast.success('AI Analysis complete');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      toast.error('AI analysis service is currently unavailable');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadTimetable = async (filters?: any) => {
    try {
      const params = filters || {};
      const response = await timetableAPI.getTimetable(params);
      setTimetable(response.data.timetable || []);
    } catch (error) {
      console.error('Failed to load timetable:', error);
      toast.error('Failed to load timetable');
    }
  };

  const handleGenerateTimetable = async () => {
    setGenerating(true);
    try {
      await timetableAPI.generateTimetable();
      sounds.celebrate();
      toast.success('Timetable generated successfully');
      loadTimetable();
    } catch (error: any) {
      sounds.error();
      toast.error('Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const groupedTimetable = days.reduce((acc, day) => {
    const daySlots = timetable
      .filter((block) => block && block.day === day)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    acc[day] = daySlots;
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Timetable Management</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleAnalyzeTimetable}
              disabled={analyzing || timetable.length === 0}
              className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 border-purple-200 dark:border-purple-800"
            >
              <Sparkles className={analyzing ? 'animate-pulse text-purple-500' : 'text-purple-500'} size={18} />
              <span>{analyzing ? 'AI Analyzing...' : 'AI Optimization'}</span>
            </Button>
            <Button onClick={handleGenerateTimetable} disabled={generating}>
              <RefreshCw className={generating ? 'animate-spin mr-2' : 'mr-2'} />
              <span>Generate Timetable</span>
            </Button>
          </div>
        </div>

        {/* AI Report Display */}
        <AnimatePresence>
          {aiReport && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <Card className="border-purple-500/50 bg-purple-50/30 dark:bg-purple-900/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={20} />
                    AI Timetable Report
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setAiReport(null)}>Dismiss</Button>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                        <AlertCircle size={16} /> Conflicts Identified
                      </h4>
                      <ul className="space-y-2">
                        {aiReport.conflicts.map((c, i) => (
                          <li key={i} className="text-sm bg-red-100 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                            <span className="font-medium">{c.type}:</span> {c.description}
                          </li>
                        ))}
                        {aiReport.conflicts.length === 0 && <li className="text-sm text-muted-foreground italic">No technical conflicts detected.</li>}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-600">
                        <CheckCircle2 size={16} /> Optimization Suggestions
                      </h4>
                      <div className="space-y-2">
                        {aiReport.suggestions.map((s, i) => (
                          <div key={i} className="text-sm bg-green-100 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                            <p className="font-medium">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.details}</p>
                            <Badge variant="outline" className="mt-1 text-[10px]">{s.benefit}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Filters and Timetable display (rest of code) */}
        <div className="space-y-6">
          {days.map((day) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="capitalize">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Course</th>
                        <th className="text-left p-2">Instructor</th>
                        <th className="text-left p-2">Section</th>
                        <th className="text-left p-2">Room</th>
                        <th className="text-left p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedTimetable[day]?.length > 0 ? (
                        groupedTimetable[day].map((block) => (
                          <tr key={block.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-2 font-medium">{block.slot_label}</td>
                            <td className="p-2">{block.course_code} - {block.course_name}</td>
                            <td className="p-2">{block.teacher_name}</td>
                            <td className="p-2">{block.section_name}</td>
                            <td className="p-2">{block.room_name}</td>
                            <td className="p-2">
                              <Badge variant={block.type === 'lab' ? 'secondary' : 'default'}>
                                {block.type}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted-foreground p-8">No classes scheduled for {day}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
