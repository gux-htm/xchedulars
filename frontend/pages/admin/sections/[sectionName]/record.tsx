import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { adminAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import { Edit, Trash2, Plus, ArrowLeft, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

export default function SectionRecord() {
  const router = useRouter();
  const { sectionName } = router.query;
  const [loading, setLoading] = useState(true);
  const [completedRecords, setCompletedRecords] = useState<any[]>([]);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [sectionInfo, setSectionInfo] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    course_id: '',
    semester: 1,
    instructor_id: '',
  });

  const fetchRecord = async () => {
    if (!sectionName) return;
    try {
      const res = await adminAPI.getSectionRecord(sectionName as string);
      console.log('API Response:', res.data);
      
      // Flatten completed records
      const flatRecords: any[] = [];
      if (res.data.completedCourses && res.data.completedCourses.length > 0) {
        res.data.completedCourses.forEach((semesterData: any) => {
          semesterData.courses.forEach((course: any) => {
            flatRecords.push({
              ...course,
              semester: semesterData.semester
            });
          });
        });
      }
      
      setCompletedRecords(flatRecords);
      setPendingCourses(res.data.pendingCourses || []);
      setSectionInfo(res.data.section);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch section record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sectionName) {
      fetchRecord();
      adminAPI.getInstructors().then(res => setInstructors(res.data.instructors || [])).catch(() => {});
      adminAPI.getCourses().then(res => setCourses(res.data.data || [])).catch(() => {});
    }
  }, [sectionName]);

  const handleEdit = (course: any) => {
    setEditingRecord(course);
    setShowEditModal(true);
  };

  const handleDelete = async (recordId: number) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteSectionRecord(recordId);
      toast.success('Record deleted successfully');
      fetchRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete record');
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await adminAPI.updateSectionRecord(editingRecord.recordId, {
        instructor_id: editingRecord.instructorId || null,
        semester: editingRecord.semester
      });
      toast.success('Record updated successfully');
      setShowEditModal(false);
      setEditingRecord(null);
      fetchRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update record');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionInfo?.id) return;
    try {
      await adminAPI.createSectionRecord({
        section_id: sectionInfo.id,
        course_id: parseInt(newRecord.course_id),
        semester: newRecord.semester,
        instructor_id: newRecord.instructor_id || null,
      });
      toast.success('Record added successfully');
      setShowAddModal(false);
      setNewRecord({ course_id: '', semester: 1, instructor_id: '' });
      fetchRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add record');
    }
  };

  // Calculations for Progress
  const totalCourses = completedRecords.length + pendingCourses.length;
  const progressPercentage = totalCourses > 0 ? Math.round((completedRecords.length / totalCourses) * 100) : 0;
  
  if (loading) return <Layout><div className="flex items-center justify-center h-96"><div className="spinner"></div></div></Layout>;
  if (!sectionInfo) return <Layout><div className="p-8 text-center">No section found.</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" onClick={() => router.back()}>
               <ArrowLeft className="h-4 w-4" />
             </Button>
             <div>
               <h1 className="text-3xl font-bold tracking-tight">Academic Record</h1>
               <p className="text-muted-foreground">{sectionInfo.name} • {sectionInfo.major}</p>
             </div>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Manually Add Record
          </Button>
        </div>

        {/* Progress & Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Degree Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>{progressPercentage}% Completed</span>
                    <span>{completedRecords.length} / {totalCourses} Courses</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                        <p className="text-xs text-muted-foreground">Current Semester</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{sectionInfo.currentSemester}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{sectionInfo.studentCount}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground">Program Duration</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{sectionInfo.totalSemesters} Sem</p>
                    </div>
                </div>
              </CardContent>
           </Card>
           
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-lg">Quick Stats</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                   <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                   </div>
                   <span className="font-bold">{completedRecords.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                   <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Pending</span>
                   </div>
                   <span className="font-bold">{pendingCourses.length}</span>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Completed Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-primary" />
               Completed / Active Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 italic">No active or completed courses found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Sem</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Cr. Hrs</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRecords.map((record, idx) => (
                    <MotionDiv 
                        key={record.recordId || idx}
                        as="tr" // Render as tr to keep table semantic valid
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-muted/30 transition-colors border-b last:border-0"
                    >
                      <TableCell className="font-medium text-center bg-muted/20">{record.semester}</TableCell>
                      <TableCell className="font-mono text-sm">{record.courseCode}</TableCell>
                      <TableCell className="font-medium">{record.courseName}</TableCell>
                      <TableCell>{record.creditHours}</TableCell>
                      <TableCell>
                          {record.instructor !== 'N/A' ? (
                             <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {record.instructor.charAt(0)}
                                </span>
                                {record.instructor}
                             </div>
                          ) : (
                             <span className="text-muted-foreground italic text-sm">Unassigned</span>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                          {record.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(record.recordId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </MotionDiv>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Courses List */}
        {pendingCourses.length > 0 && (
          <Card className="border-dashed">
             <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Pending Major Courses</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {pendingCourses.map((course, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 opacity-75 hover:opacity-100 transition-opacity">
                         <div>
                            <p className="font-medium text-sm">{course.courseName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{course.courseCode}</p>
                         </div>
                         <Badge variant="outline">{course.creditHours}</Badge>
                      </div>
                   ))}
                </div>
             </CardContent>
          </Card>
        )}
      </div>

      {/* Add Record Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Course Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRecord} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Select 
                value={newRecord.course_id} 
                onValueChange={(value) => setNewRecord({ ...newRecord, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester Completed</Label>
              <Input
                id="semester"
                type="number"
                value={newRecord.semester}
                onChange={(e) => setNewRecord({ ...newRecord, semester: parseInt(e.target.value) || 1 })}
                min="1"
                max={sectionInfo?.totalSemesters || 8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor (Optional)</Label>
              <Select 
                value={newRecord.instructor_id || 'none'} 
                onValueChange={(value) => setNewRecord({ ...newRecord, instructor_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Instructor</SelectItem>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={String(inst.id)}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Add Record</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleUpdateRecord} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <div className="p-2 bg-muted rounded text-sm font-medium">
                  {editingRecord.courseCode} - {editingRecord.courseName}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSemester">Semester</Label>
                <Input
                  id="editSemester"
                  type="number"
                  value={editingRecord.semester}
                  onChange={(e) => setEditingRecord({ ...editingRecord, semester: parseInt(e.target.value) || 1 })}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editInstructor">Instructor</Label>
                <Select 
                  value={editingRecord.instructorId ? String(editingRecord.instructorId) : 'none'} 
                  onValueChange={(value) => setEditingRecord({ ...editingRecord, instructorId: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Instructor</SelectItem>
                    {instructors.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}