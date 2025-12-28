
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FiUser, FiMail, FiHash, FiUsers } from 'react-icons/fi';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const MotionDiv = motion.div as any;

export default function RegisterStudent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    sectionId: '',
  });
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadMajors(selectedProgram);
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedMajor) {
      loadSections(selectedMajor);
    }
  }, [selectedMajor]);

  const loadPrograms = async () => {
    try {
      console.log('Loading programs from:', `${API_URL}/students/programs`);
      const response = await axios.get(`${API_URL}/students/programs`);
      console.log('Programs response:', response.data);
      setPrograms(response.data.programs || []);
    } catch (error) {
      console.error('Failed to load programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const loadMajors = async (programId: string) => {
    try {
      console.log('Loading majors for program:', programId);
      const response = await axios.get(`${API_URL}/students/majors?program_id=${programId}`);
      console.log('Majors response:', response.data);
      setMajors(response.data.majors || []);
      setSelectedMajor(''); // Reset major selection
      setFormData({ ...formData, sectionId: '' }); // Reset section
    } catch (error) {
      console.error('Failed to load majors:', error);
      toast.error('Failed to load majors');
    }
  };

  const loadSections = async (majorId: string) => {
    try {
      console.log('Loading sections for major:', majorId);
      const response = await axios.get(`${API_URL}/students/sections?major_id=${majorId}`);
      console.log('Sections response:', response.data);
      setSections(response.data.sections || []);
      setFormData({ ...formData, sectionId: '' }); // Reset section selection
    } catch (error) {
      console.error('Failed to load sections:', error);
      toast.error('Failed to load sections');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* Fix: Cast e.target to HTMLInputElement to access 'name' and 'value' properties */
    const { name, value } = e.target as HTMLInputElement;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the selected section to determine semester
      const selectedSection = sections.find(s => s.id.toString() === formData.sectionId);

      const payload = {
        roll_number: formData.rollNumber,
        name: formData.name,
        email: formData.email,
        section_id: parseInt(formData.sectionId),
        semester: selectedSection?.semester || 1,
      };

      await axios.post(`${API_URL}/students/register`, payload);
      toast.success('Registration successful! You will receive your timetable via email.');
      setFormData({ name: '', email: '', rollNumber: '', sectionId: '' });
      setSelectedProgram('');
      setSelectedMajor('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <MotionDiv
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-primary">
              <GraduationCap className="inline-block mr-2 w-8 h-8" /> Xchedular
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Student Registration
            </p>
            <p className="text-sm text-center mt-2 text-muted-foreground">
              Register to receive your timetable via email
            </p>
          </CardHeader>
          <CardContent className="overflow-visible">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                <Label htmlFor="rollNumber">Roll Number</Label>
                <div className="relative">
                  {/* Fix: Wrap react-icons in a span with className to avoid IconBaseProps TS error */}
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    <FiHash />
                  </span>
                  <Input
                    id="rollNumber"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="2024-CS-001"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Select onValueChange={setSelectedProgram} value={selectedProgram}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-50">
                    {programs.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No programs available</div>
                    ) : (
                      programs.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name} ({program.shift})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProgram && (
                <div className="space-y-2">
                  <Label htmlFor="major">Major</Label>
                  <Select onValueChange={setSelectedMajor} value={selectedMajor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select major" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-50">
                      {majors.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No majors available</div>
                      ) : (
                        majors.map((major) => (
                          <SelectItem key={major.id} value={major.id.toString()}>
                            {major.name} ({major.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMajor && (
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select
                    onValueChange={(value) => setFormData({ ...formData, sectionId: value })}
                    value={formData.sectionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-50">
                      {sections.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No sections available</div>
                      ) : (
                        sections.map((section) => (
                          <SelectItem key={section.id} value={section.id.toString()}>
                            Section {section.name} - Semester {section.semester} ({section.shift})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" disabled={loading || !formData.sectionId} className="w-full">
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-muted-foreground">
                Staff member?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </p>
              <p className="text-muted-foreground">
                Already registered?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  );
}
