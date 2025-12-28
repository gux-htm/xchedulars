import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSounds } from '@/hooks/useSounds';
import { fadeIn, slideUp, scaleIn } from '@/lib/animations';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseRequest: any;
  onSuccess: () => void;
}

export default function RescheduleModal({ isOpen, onClose, courseRequest, onSuccess }: RescheduleModalProps) {
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [currentSlots, setCurrentSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [initialSlotCount, setInitialSlotCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && courseRequest) {
      fetchAvailableSlots();
      fetchCurrentSlots(); // This will also pre-select the current slots
    }
  }, [isOpen, courseRequest]);

  const fetchCurrentSlots = async () => {
    try {
      // Get current time slots for this course request
      const res = await api.get('/timetable', {
        params: {
          section_id: courseRequest.section_id,
          teacher_id: courseRequest.instructor_id,
        },
      });
      const timetable = res.data.timetable || [];
      // Filter to only this course
      const courseSlots = timetable.filter((t: any) => t.course_id === courseRequest.course_id);
      setCurrentSlots(courseSlots);
      
      // Pre-select these slots
      const currentSlotIds = courseSlots.map((slot: any) => slot.time_slot_id);
      setSelectedSlots(currentSlotIds);
      setInitialSlotCount(currentSlotIds.length);
    } catch (error) {
      console.error('Failed to fetch current slots:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const res = await api.get('/timetable/available-slots', {
        params: {
          section_id: courseRequest.section_id,
          instructor_id: courseRequest.instructor_id,
        },
      });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      toast.error('Failed to fetch available slots');
    }
  };

  const toggleSlot = (slotId: number) => {
    setSelectedSlots((prev) => {
      const isCurrentlySelected = prev.includes(slotId);
      
      if (isCurrentlySelected) {
        // Always allow unselecting
        return prev.filter((id) => id !== slotId);
      } else {
        // Only allow selecting if we haven't exceeded the initial count
        if (prev.length >= initialSlotCount) {
          toast.warning(`You can only select ${initialSlotCount} time slots. Unselect a current slot first.`);
          return prev;
        }
        return [...prev, slotId];
      }
    });
  };

  const isCurrentSlot = (slotId: number) => {
    // Check both time_slot_id and id fields to be safe
    return currentSlots.some((slot: any) => 
      slot.time_slot_id === slotId || slot.id === slotId
    );
  };

  const isNewlySelected = (slotId: number) => {
    return selectedSlots.includes(slotId) && !isCurrentSlot(slotId);
  };

  const isDeselected = (slotId: number) => {
    return isCurrentSlot(slotId) && !selectedSlots.includes(slotId);
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0) {
      toast.warn('Please select at least one time slot.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/timetable/reschedule', {
        course_request_id: courseRequest.id,
        new_schedule: selectedSlots.map(slotId => ({ time_slot_id: slotId })),
      });
      toast.success('Course rescheduled successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to reschedule course:', error);
      toast.error('Failed to reschedule course');
    } finally {
      setLoading(false);
    }
  };

  const groupSlotsByDay = (slots: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    slots.forEach((slot) => {
      const day = slot.day_of_week || 'any';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(slot);
    });
    return grouped;
  };

  const groupedSlots = groupSlotsByDay(availableSlots);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Reschedule Course</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Rescheduling</p>
            <p className="font-semibold text-lg">{courseRequest.course_name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {courseRequest.course_code} • Section {courseRequest.section_name}
            </p>
          </div>

          {/* Current Schedule - With Checkboxes to Unselect */}
          {currentSlots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-600">Current Schedule (Uncheck to remove)</h3>
              </div>
              <div className="space-y-2">
                {currentSlots.map((slot: any) => {
                  const slotId = slot.time_slot_id || slot.id;
                  const isSelected = selectedSlots.includes(slotId);
                  
                  return (
                    <label
                      key={slot.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-red-300 bg-red-50 dark:bg-red-950 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSlot(slotId)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className={`font-medium text-sm capitalize ${!isSelected ? 'line-through' : ''}`}>
                          {slot.day} - {slot.slot_label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {slot.room_name}
                        </div>
                      </div>
                      {!isSelected && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Removed</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Time Slots Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-green-600">Available Time Slots (Check to add)</h3>
            </div>
            
            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No available time slots found
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSlots).map(([day, slots]) => (
                  <div key={day} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {day}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((slot: any) => {
                        // Available slots use 'id', not 'time_slot_id'
                        const slotId = slot.time_slot_id || slot.id;
                        const isCurrent = isCurrentSlot(slotId);
                        const isNew = isNewlySelected(slotId);
                        const isRemoved = isDeselected(slotId);
                        const isSelected = selectedSlots.includes(slotId);
                        
                        return (
                          <label
                            key={slot.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-start space-x-3 ${
                              isNew
                                ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                : isRemoved
                                ? 'border-red-300 bg-red-50 dark:bg-red-950 opacity-60'
                                : isCurrent && isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : isSelected
                                ? 'border-primary bg-accent'
                                : 'border-border hover:border-primary/50 hover:bg-accent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSlot(slotId)}
                              className="mt-1 h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${isRemoved ? 'line-through' : ''}`}>
                                {slot.slot_label}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {slot.start_time} - {slot.end_time}
                              </div>
                              {isCurrent && isSelected && (
                                <span className="inline-block mt-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Current</span>
                              )}
                              {isNew && (
                                <span className="inline-block mt-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded">New</span>
                              )}
                              {isRemoved && (
                                <span className="inline-block mt-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded">Removed</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Count */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              ✓ {selectedSlots.length} / {initialSlotCount} time slots selected
            </p>
            {selectedSlots.length < initialSlotCount && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                You need to select {initialSlotCount - selectedSlots.length} more slot{initialSlotCount - selectedSlots.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedSlots.length !== initialSlotCount}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
