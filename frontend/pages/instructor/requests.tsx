import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timetableAPI, timingAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Check, X, Send, Clock, Edit } from 'lucide-react';
import RescheduleModal from '@/components/RescheduleModal';
import { cardVariants, staggerContainer, listItemVariants, buttonHover, buttonTap } from '@/lib/animations';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function CourseRequests() {
  const { user, isInstructor, loading: authLoading } = useAuth();
  const router = useRouter();

  // FIX: missing states
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [requestToReschedule, setRequestToReschedule] = useState<any>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Check if user is authorized
    if (!user || !isInstructor) {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [authLoading, isInstructor, user, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      // Get all pending requests (available for instructors to accept)
      const pendingRes = await timetableAPI.getCourseRequests({ status: 'pending' });
      const pendingRequests = pendingRes.data.requests || [];
      
      // Get requests already accepted by this instructor
      const acceptedRes = await timetableAPI.getCourseRequests({ 
        status: 'accepted', 
        instructor_id: user?.id 
      });
      const acceptedRequests = acceptedRes.data.requests || [];

      setRequests(pendingRequests); // For backward compatibility
      setPendingRequests(pendingRequests);
      setAcceptedRequests(acceptedRequests);

    } catch (error) {
      console.error('Failed to load course requests:', error);
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (shift: string) => {
    try {
      // Load all available slots (no shift filtering)
      const response = await timingAPI.getTimeSlots();
      console.log('Available slots:', response.data.slots);
      setAvailableSlots(response.data.slots || []);
      
      if (response.data.slots.length === 0) {
        toast.warning('No time slots available. Admin needs to generate time slots first.');
      }
    } catch (error) {
      console.error('Failed to load available slots:', error);
      toast.error('Failed to load available slots');
    }
  };

  const handleSelectRequest = (request: any) => {
    setSelectedRequest(request);
    setSelectedSlots([]);
    loadAvailableSlots(request.shift);
  };

  const toggleSlot = (slotId: number) => {
    setSelectedSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const handleAccept = async () => {
    if (!selectedRequest || selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    try {
      await timetableAPI.selectSlots({
        request_id: selectedRequest.id,
        time_slots: selectedSlots,
      });

      toast.success('Course request accepted successfully!');
      setSelectedRequest(null);
      setSelectedSlots([]);
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept request');
    }
  };

  if (loading) return <Layout><div className="spinner"></div></Layout>;

  const groupSlotsByDay = (slots: any[]) => {
    return slots.reduce((acc, slot) => {
      const day = slot.day_of_week || 'Available';
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    }, {} as Record<string, any[]>);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Course Requests</h1>

        {/* Course Requests */}
        {pendingRequests.length === 0 && acceptedRequests.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center py-12">
            <p className="text-muted-foreground text-lg">No course requests available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* PENDING REQUESTS */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Course Requests</h2>

              {pendingRequests.map((request, index) => (
                <MotionDiv
                  key={request.id}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  whileTap="tap"
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card border border-border rounded-lg p-4 shadow-sm cursor-pointer ${
                    selectedRequest?.id === request.id ? 'ring-2 ring-primary shadow-xl' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="cursor-pointer" onClick={() => handleSelectRequest(request)}>
                      <h3 className="font-bold text-lg text-card-foreground">
                        {request.course_name || 'Unnamed Course'}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">{request.course_code}</p>
                    </div>

                    {/* Course Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted border border-border p-3 rounded-md">
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Section:</span> {request.section_name}</div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Semester:</span> {request.semester}</div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Major:</span> {request.major_name}</div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Program:</span> {request.program_name}</div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Shift:</span> <span className="capitalize">{request.shift}</span></div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground">Intake:</span> <span className="capitalize">{request.intake || 'N/A'}</span></div>
                    </div>

                    <div className="pt-2 border-t">
                      <MotionButton
                        onClick={() => handleSelectRequest(request)}
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                      >
                        <Check /> <span>Accept & Select Slots</span>
                      </MotionButton>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>

            {/* RIGHT PANEL */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {selectedRequest ? (
                <>
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">
                      Select Time Slots for {selectedRequest.course_name}
                    </h2>
                    
                    {/* Course Details in Right Panel */}
                    <div className="bg-accent p-4 rounded-lg border border-border">
                      <h3 className="font-semibold text-accent-foreground mb-2">Course Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Course:</span> {selectedRequest.course_code}</div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Section:</span> {selectedRequest.section_name}</div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Semester:</span> {selectedRequest.semester}</div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Major:</span> {selectedRequest.major_name}</div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Program:</span> {selectedRequest.program_name}</div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Shift:</span> <span className="capitalize">{selectedRequest.shift}</span></div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Intake:</span> <span className="capitalize">{selectedRequest.intake || 'N/A'}</span></div>
                        <div className="text-muted-foreground"><span className="font-medium text-foreground">Academic Year:</span> {selectedRequest.academic_year || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {Object.entries(groupSlotsByDay(availableSlots)).map(([day, slots]) => (
                    <div key={day}>
                      <h3 className="font-semibold mb-2"><Clock className="inline mr-2" />{day}</h3>

                      {(slots as any[]).map((slot: any, idx: number) => (
                        <MotionButton
                          key={slot.id}
                          onClick={() => toggleSlot(slot.id)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full p-3 mb-2 rounded-lg border-2 transition-all ${
                            selectedSlots.includes(slot.id) 
                              ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
                              : 'bg-card text-card-foreground border-border hover:border-primary hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{slot.slot_label}</span>
                            {selectedSlots.includes(slot.id) && (
                              <MotionDiv
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              >
                                <Check className="w-5 h-5" />
                              </MotionDiv>
                            )}
                          </div>
                        </MotionButton>
                      ))}
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-muted-foreground">
                        {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} selected
                      </span>
                      {selectedSlots.length > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ✓ Ready to accept
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAccept}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                          selectedSlots.length === 0
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 shadow-lg'
                        }`}
                        disabled={selectedSlots.length === 0}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Check className="w-5 h-5" />
                          <span>Accept Course</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedRequest(null)}
                        className="px-4 py-3 border border-border rounded-lg text-foreground hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-12 text-muted-foreground">
                    Select a course to view available time slots.
                  </div>

                  <h2 className="text-xl font-bold text-foreground">Accepted Courses</h2>
                  {acceptedRequests.map((request, index) => (
                    <MotionDiv
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-lg transition-shadow"
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-bold text-lg text-card-foreground">{request.course_name}</h3>
                          <p className="text-sm text-muted-foreground font-medium">{request.course_code}</p>
                        </div>

                        {/* Course Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded-md">
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Section:</span> {request.section_name}</div>
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Semester:</span> {request.semester}</div>
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Major:</span> {request.major_name}</div>
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Program:</span> {request.program_name}</div>
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Shift:</span> <span className="capitalize">{request.shift}</span></div>
                          <div className="text-green-800 dark:text-green-200"><span className="font-medium text-green-900 dark:text-green-100">Intake:</span> <span className="capitalize">{request.intake || 'N/A'}</span></div>
                        </div>

                        <div className="pt-2 border-t">
                          <button
                            onClick={() => {
                              setRequestToReschedule(request);
                              setIsRescheduleModalOpen(true);
                            }}
                            className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                          >
                            <Edit /> <span>Reschedule</span>
                          </button>
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {requestToReschedule && (
        <RescheduleModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          courseRequest={requestToReschedule}
          onSuccess={() => {
            setIsRescheduleModalOpen(false);
            loadRequests();
          }}
        />
      )}
    </Layout>
  );
}
