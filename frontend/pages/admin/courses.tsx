
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { adminAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, ChevronsRight, CornerUpRight, BookOpen } from 'lucide-react';
import { useSounds } from '@/hooks/useSounds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function Courses() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sounds } = useSounds();
  const [courses, setCourses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [courseLimit, setCourseLimit] = useState(10);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [courseTotalRecords, setCourseTotalRecords] = useState(0);
  const [sectionPage, setSectionPage] = useState(1);
  const [sectionLimit, setSectionLimit] = useState(10);
  const [sectionTotalPages, setSectionTotalPages] = useState(1);
  const [sectionTotalRecords, setSectionTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    credit_hours: '3+0',
    type: 'theory',
    major_ids: [] as number[],
    program_id: '',
    applies_to_all_programs: false,
  });

  const [sectionForm, setSectionForm] = useState({
    major_id: '',
    name: '',
    semester: 1,
    student_strength: 50,
    shift: 'morning',
    intake: '',
  });

  const [showAssignCoursesDialog, setShowAssignCoursesDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [assignCoursesForm, setAssignCoursesForm] = useState({
    academic_year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/login');
      return;
    }
    loadInitialData();
  }, [authLoading, isAdmin, router]);

  const loadInitialData = async () => {
    try {
      const [programsRes, majorsRes] = await Promise.all([
        adminAPI.getPrograms(),
        adminAPI.getMajors(),
      ]);
      setPrograms(programsRes.data.programs);
      setMajors(majorsRes.data.majors);
      loadCourses();
      loadSections();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const params = {
        page: coursePage,
        limit: courseLimit,
        program: selectedProgram === 'all' ? undefined : selectedProgram,
        major: selectedMajor === 'all' ? undefined : selectedMajor,
        search: searchQuery || undefined,
      };
      const coursesRes = await adminAPI.getCourses(params);
      setCourses(coursesRes.data.data);
      setCourseTotalPages(coursesRes.data.totalPages);
      setCourseTotalRecords(coursesRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const loadSections = async () => {
    try {
      const sectionsRes = await adminAPI.getSections({ page: sectionPage, limit: sectionLimit });
      console.log('Loaded sections:', sectionsRes.data.data);
      setSections(sectionsRes.data.data);
      setSectionTotalPages(sectionsRes.data.totalPages);
      setSectionTotalRecords(sectionsRes.data.totalRecords);
    } catch (error) {
      console.error('Failed to load sections:', error);
      toast.error('Failed to load sections');
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await adminAPI.updateSection(editingSection.id, sectionForm);
        toast.success('Section updated successfully');
      } else {
        await adminAPI.createSection(sectionForm);
        toast.success('Section created successfully');
      }
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning', intake: '' });
      loadSections();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save section');
    }
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      major_id: String(section.major_id || ''),
      name: section.name,
      semester: section.semester,
      student_strength: section.student_strength,
      shift: section.shift,
      intake: section.intake || '',
    });
    setShowSectionForm(true);
  };

  const handleOpenAssignCourses = (section: any) => {
    console.log('=== ASSIGN COURSES DEBUG ===');
    console.log('Full section object:', JSON.stringify(section, null, 2));
    console.log('Section keys:', Object.keys(section));
    console.log('Section.id:', section.id);
    console.log('Section ID type:', typeof section.id);
    console.log('All sections array:', sections);
    console.log('=========================');
    
    setSelectedSection(section);
    setSelectedCourseIds([]);
    setAssignCoursesForm({
      academic_year: new Date().getFullYear().toString(),
    });
    setShowAssignCoursesDialog(true);
  };

  const handleAssignCourses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || selectedCourseIds.length === 0) {
      sounds.error();
      toast.error('Please select at least one course');
      return;
    }

    try {
      console.log('Submitting with section:', selectedSection);
      console.log('Section ID before conversion:', selectedSection.id);
      
      const sectionId = Number(selectedSection.id);
      console.log('Section ID after conversion:', sectionId);
      
      if (!sectionId || sectionId === 0) {
        console.error('Invalid section ID detected:', sectionId);
        sounds.error();
        toast.error(`Invalid section ID: ${selectedSection.id}`);
        return;
      }

      await adminAPI.assignCoursesToSection(sectionId, {
        course_ids: selectedCourseIds,
        semester: selectedSection.semester,
        intake: selectedSection.intake || 'fall',
        shift: selectedSection.shift,
        academic_year: assignCoursesForm.academic_year,
      });
      sounds.success();
      toast.success('Courses assigned successfully');
      setShowAssignCoursesDialog(false);
      setSelectedSection(null);
      setSelectedCourseIds([]);
    } catch (error: any) {
      console.error('Error assigning courses:', error);
      sounds.error();
      toast.error(error.response?.data?.error || 'Failed to assign courses');
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare form data - exclude program_id as it's only for UI filtering
      const { program_id, ...courseData } = courseForm;
      
      if (editingCourse) {
        // Note: updateCourse doesn't handle major_ids, only basic course fields
        await adminAPI.updateCourse(editingCourse.id, {
          name: courseData.name,
          code: courseData.code,
          credit_hours: courseData.credit_hours,
          type: courseData.type,
        });
        sounds.success();
        toast.success('Course updated successfully');
      } else {
        await adminAPI.createCourse(courseData);
        sounds.success();
        toast.success('Course created successfully');
      }
      setShowCourseForm(false);
      setEditingCourse(null);
      setCourseForm({ name: '', code: '', credit_hours: '3+0', type: 'theory', major_ids: [], program_id: '', applies_to_all_programs: false });
      loadCourses();
    } catch (error: any) {
      sounds.error();
      toast.error(error.response?.data?.error || 'Failed to save course');
    }
  };

  const handleEditCourse = (course: any) => {
    sounds.open();
    setEditingCourse(course);
    const majorNames = course.major_names || [];
    const majorIds = Array.isArray(majorNames) 
      ? majors.filter(m => majorNames.includes(m.name)).map(m => Number(m.id))
      : [];
    setCourseForm({
      name: course.name,
      code: course.code,
      credit_hours: course.credit_hours,
      type: course.type,
      major_ids: majorIds,
      program_id: course.program_id || '',
      applies_to_all_programs: false,
    });
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await adminAPI.deleteCourse(id);
      sounds.success();
      toast.success('Course deleted successfully');
      loadCourses();
    } catch (error: any) {
      sounds.error();
      toast.error(error.response?.data?.error || 'Failed to delete course');
    }
  };

  useEffect(() => {
    loadCourses();
  }, [coursePage, courseLimit]);

  const handleFilterChange = () => {
    setCoursePage(1);
    loadCourses();
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Course Library & Sections</h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Library</CardTitle>
            <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2" /> Add Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseName">Course Name</Label>
                      <Input id="courseName" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Introduction to AI" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseCode">Course Code</Label>
                      <Input id="courseCode" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="CS-101" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="creditHours">Credit Hours</Label>
                      <Select value={courseForm.credit_hours} onValueChange={(value) => setCourseForm({ ...courseForm, credit_hours: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2+0">2+0 (Theory only)</SelectItem>
                          <SelectItem value="3+0">3+0 (Theory only)</SelectItem>
                          <SelectItem value="2+1">2+1 (Theory + Lab)</SelectItem>
                          <SelectItem value="3+1">3+1 (Theory + Lab)</SelectItem>
                          <SelectItem value="0+1">0+1 (Lab only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="courseType">Type</Label>
                      <Select value={courseForm.type} onValueChange={(value) => setCourseForm({ ...courseForm, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Theory</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select value={courseForm.program_id || 'all'} onValueChange={(value) => {
                      if (value === 'all') {
                        setCourseForm({ ...courseForm, program_id: '', major_ids: [] });
                      } else {
                        setCourseForm({ ...courseForm, program_id: value });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a program (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">None (Select majors manually)</SelectItem>
                        {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Majors</Label>
                      {courseForm.program_id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const programMajors = majors.filter(m => String(m.program_id) === String(courseForm.program_id)).map(m => Number(m.id));
                            setCourseForm({ ...courseForm, major_ids: programMajors });
                          }}
                        >
                          Select All from Program
                        </Button>
                      )}
                    </div>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {majors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No majors available</p>
                      ) : (
                        majors
                          .filter(m => !courseForm.program_id || String(m.program_id) === String(courseForm.program_id))
                          .map(m => (
                            <div key={m.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`major-${m.id}`}
                                checked={courseForm.major_ids.includes(Number(m.id))}
                                onChange={(e) => {
                                  /* Fix: Cast e.target to HTMLInputElement to access 'checked' property */
                                  const target = e.target as HTMLInputElement;
                                  const majorId = Number(m.id);
                                  if (target.checked) {
                                    setCourseForm({ ...courseForm, major_ids: [...courseForm.major_ids, majorId] });
                                  } else {
                                    setCourseForm({ ...courseForm, major_ids: courseForm.major_ids.filter(id => id !== majorId) });
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              <Label htmlFor={`major-${m.id}`} className="font-normal cursor-pointer">{m.name}</Label>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Fix: Cast e.target to HTMLInputElement for 'checked' */}
                    <input type="checkbox" id="all_programs" checked={courseForm.applies_to_all_programs} onChange={e => setCourseForm({ ...courseForm, applies_to_all_programs: (e.target as HTMLInputElement).checked })} />
                    <Label htmlFor="all_programs">Applies to all BS programs</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => { setShowCourseForm(false); setEditingCourse(null); }}>Cancel</Button>
                    <Button type="submit">{editingCourse ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Majors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Majors</SelectItem>
                  {majors.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or code" />
              <Button onClick={handleFilterChange}>Apply Filters</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credit Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Majors</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>{course.code}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.credit_hours}</TableCell>
                    <TableCell>{course.type}</TableCell>
                    <TableCell>{course.major_names}</TableCell>
                    <TableCell>{course.program_names}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditCourse(course)}><Edit /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteCourse(course.id)}><Trash2 /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sections</CardTitle>
              <Dialog open={showSectionForm} onOpenChange={setShowSectionForm}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => {
                      setEditingSection(null);
                      setSectionForm({ major_id: '', name: '', semester: 1, student_strength: 50, shift: 'morning', intake: '' });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Section</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSectionSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sectionMajor">Major</Label>
                        <Select 
                          value={sectionForm.major_id} 
                          onValueChange={(value) => setSectionForm({ ...sectionForm, major_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Major" />
                          </SelectTrigger>
                          <SelectContent>
                            {majors.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sectionName">Section Name</Label>
                        <Input 
                          id="sectionName" 
                          value={sectionForm.name} 
                          onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} 
                          placeholder="Section A" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sectionIntake">Intake</Label>
                        <Select 
                          value={sectionForm.intake} 
                          onValueChange={(value) => setSectionForm({ ...sectionForm, intake: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Intake" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spring">Spring</SelectItem>
                            <SelectItem value="summer">Summer</SelectItem>
                            <SelectItem value="fall">Fall</SelectItem>
                            <SelectItem value="winter">Winter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sectionSemester">Semester</Label>
                        <Input 
                          id="sectionSemester" 
                          type="number" 
                          value={sectionForm.semester} 
                          onChange={(e) => setSectionForm({ ...sectionForm, semester: parseInt(e.target.value) || 1 })} 
                          min="1"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sectionStrength">Student Strength</Label>
                        <Input 
                          id="sectionStrength" 
                          type="number" 
                          value={sectionForm.student_strength} 
                          onChange={(e) => setSectionForm({ ...sectionForm, student_strength: parseInt(e.target.value) || 50 })} 
                          min="1"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sectionShift">Shift</Label>
                        <Select 
                          value={sectionForm.shift} 
                          onValueChange={(value) => setSectionForm({ ...sectionForm, shift: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                            <SelectItem value="weekend">Weekend</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowSectionForm(false);
                          setEditingSection(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">{editingSection ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Major</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section, index) => (
                  <TableRow key={section.id || index}>
                    <TableCell className="font-medium">{section.name} (ID: {section.id})</TableCell>
                    <TableCell>{section.major_name}</TableCell>
                    <TableCell>{section.semester}</TableCell>
                    <TableCell>{section.student_strength}</TableCell>
                    <TableCell className="capitalize">{section.shift}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditSection(section)}
                          className="flex items-center space-x-1"
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenAssignCourses(section)}
                          className="flex items-center space-x-1"
                        >
                          <ChevronsRight size={14} />
                          <span>Assign Courses</span>
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1"><CornerUpRight size={14} /><span>Promote</span></Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/admin/sections/${section.name}/record`)}
                          className="flex items-center space-x-1"
                          title="View Record"
                        >
                          <BookOpen size={14} />
                          <span>View Record</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Courses Dialog */}
        <Dialog open={showAssignCoursesDialog} onOpenChange={setShowAssignCoursesDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Assign Courses to {selectedSection?.name} - {selectedSection?.major_name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignCourses} className="space-y-4">
              <div className="space-y-2">
                <Label>Section Details</Label>
                <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded-md">
                  <div><span className="font-medium">Section:</span> {selectedSection?.name}</div>
                  <div><span className="font-medium">Major:</span> {selectedSection?.major_name}</div>
                  <div><span className="font-medium">Semester:</span> {selectedSection?.semester}</div>
                  <div><span className="font-medium">Shift:</span> {selectedSection?.shift}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  type="number"
                  value={assignCoursesForm.academic_year}
                  onChange={(e) => setAssignCoursesForm({ ...assignCoursesForm, academic_year: e.target.value })}
                  placeholder="2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Select Courses (from {selectedSection?.major_name} major)</Label>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-2">
                  {courses
                    .filter(course => {
                      // Filter courses that belong to the section's major
                      const majorNames = course.major_names ? course.major_names.split(', ') : [];
                      return majorNames.includes(selectedSection?.major_name);
                    })
                    .map(course => (
                      <div key={course.id} className="flex items-start space-x-3 p-2 hover:bg-muted rounded">
                        <input
                          type="checkbox"
                          id={`course-${course.id}`}
                          checked={selectedCourseIds.includes(course.id)}
                          onChange={(e) => {
                            /* Fix: Cast e.target to HTMLInputElement for 'checked' */
                            if ((e.target as HTMLInputElement).checked) {
                              setSelectedCourseIds([...selectedCourseIds, course.id]);
                            } else {
                              setSelectedCourseIds(selectedCourseIds.filter(id => id !== course.id));
                            }
                          }}
                          className="mt-1 h-4 w-4"
                        />
                        <Label htmlFor={`course-${course.id}`} className="flex-1 cursor-pointer font-normal">
                          <div className="font-medium">{course.code} - {course.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {course.credit_hours} | {course.type}
                          </div>
                        </Label>
                      </div>
                    ))}
                  {courses.filter(course => {
                    const majorNames = course.major_names ? course.major_names.split(', ') : [];
                    return majorNames.includes(selectedSection?.major_name);
                  }).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No courses available for this major. Please add courses to the {selectedSection?.major_name} major first.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCourseIds.length} course(s) selected
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignCoursesDialog(false);
                    setSelectedSection(null);
                    setSelectedCourseIds([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={selectedCourseIds.length === 0}>
                  Assign {selectedCourseIds.length} Course(s)
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}