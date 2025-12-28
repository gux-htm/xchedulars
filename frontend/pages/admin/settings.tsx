import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { timingAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [slotGeneration, setSlotGeneration] = useState({
    start_time: '08:00',
    end_time: '17:00',
    days_config: {
      monday: [{ duration: 90, count: 5 }],
      tuesday: [{ duration: 90, count: 5 }],
      wednesday: [{ duration: 90, count: 5 }],
      thursday: [{ duration: 90, count: 5 }],
      friday: [{ duration: 90, count: 5 }],
    } as Record<string, Array<{ duration: number; count: number }>>,
  });
  
  const [selectedDay, setSelectedDay] = useState<string>('monday');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/login');
    }
  }, [isAdmin]);

  const handleGenerateSlots = async () => {
    try {
      setGenerating(true);
      console.log('Generating slots with:', {
        start_time: slotGeneration.start_time + ':00',
        end_time: slotGeneration.end_time + ':00',
        days_config: slotGeneration.days_config,
      });
      
      const response = await timingAPI.generateSlots({
        start_time: slotGeneration.start_time + ':00',
        end_time: slotGeneration.end_time + ':00',
        days_config: slotGeneration.days_config,
      });
      
      console.log('Generation response:', response.data);
      toast.success(`✅ Generated ${response.data.summary.totalSlots} time slots successfully!`);
    } catch (error: any) {
      console.error('Error generating slots:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || 'Failed to generate time slots';
      const details = error.response?.data?.details;
      if (details) {
        toast.error(`${errorMsg}`, { autoClose: 8000 });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setGenerating(false);
    }
  };
  
  // Calculate time metrics
  /* Fix: Add explicit typing to the reduce accumulator 'sum' as 'number' to fix the 'unknown' operator error */
  const totalWeeklySlots = Object.values(slotGeneration.days_config).reduce((sum: number, daySlots) => {
    return sum + (daySlots as Array<{ duration: number; count: number }>).reduce((daySum, type) => daySum + type.count, 0);
  }, 0);
  
  const activeDays = Object.keys(slotGeneration.days_config);
  
  const calculateMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const availableMinutesPerDay = slotGeneration.start_time && slotGeneration.end_time
    ? calculateMinutes(slotGeneration.end_time) - calculateMinutes(slotGeneration.start_time)
    : 0;
  
  const availableMinutesPerWeek = availableMinutesPerDay * activeDays.length;
  
  // Calculate required minutes for selected day
  const selectedDaySlots = slotGeneration.days_config[selectedDay] || [];
  const selectedDayTotalMinutes = selectedDaySlots.reduce((sum, type) => sum + (type.duration * type.count), 0);
  const selectedDayTotalSlots = selectedDaySlots.reduce((sum, type) => sum + type.count, 0);
  const selectedDayGapMinutes = Math.max(0, (selectedDayTotalSlots - 1) * 15);
  const selectedDayRequiredMinutes = selectedDayTotalMinutes + selectedDayGapMinutes;
  
  const fitsInWindow = selectedDayRequiredMinutes <= availableMinutesPerDay;
  
  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">University Settings</h1>
        </div>

        {/* Dynamic Slot Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Zap />
              <span>Dynamic Time Slot Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerateSlots(); }} className="space-y-6">
              <div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Per-Day Slot Configuration:</strong> Configure time slots separately for each day. Each day can have different numbers and types of slots.
                  <br />Example: Monday 5×90min, Tuesday 4×90min + 2×60min, etc.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>University Opening Time</Label>
                  <Input type="time" value={slotGeneration.start_time} onChange={(e) => setSlotGeneration({ ...slotGeneration, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>University Closing Time</Label>
                  <Input type="time" value={slotGeneration.end_time} onChange={(e) => setSlotGeneration({ ...slotGeneration, end_time: e.target.value })} />
                </div>
              </div>
              
              {/* Time Window Summary */}
              {availableMinutesPerDay > 0 && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm">⏰ Available Time Window</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Per Day:</p>
                      <p className="font-bold text-lg">{formatMinutes(availableMinutesPerDay)}</p>
                      <p className="text-xs text-gray-500">({availableMinutesPerDay} minutes)</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Total Configured:</p>
                      <p className="font-bold text-lg">{totalWeeklySlots} slots</p>
                      <p className="text-xs text-gray-500">across {activeDays.length} days</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Day Tabs */}
              <div className="space-y-4">
                <Label>Configure Slots Per Day</Label>
                
                {/* Day Selector Tabs */}
                <div className="flex flex-wrap gap-2 border-b pb-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const isActive = selectedDay === day;
                    const hasConfig = slotGeneration.days_config[day] && slotGeneration.days_config[day].length > 0;
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                        className="relative"
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                        {hasConfig && !isActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Selected Day Configuration */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold capitalize">{selectedDay} Slots</h3>
                    {slotGeneration.days_config[selectedDay] && slotGeneration.days_config[selectedDay].length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newConfig = { ...slotGeneration.days_config };
                          delete newConfig[selectedDay];
                          setSlotGeneration({ ...slotGeneration, days_config: newConfig });
                        }}
                      >
                        Clear Day
                      </Button>
                    )}
                  </div>
                  
                  {/* Slot Types for Selected Day */}
                  <div className="space-y-2">
                    {(slotGeneration.days_config[selectedDay] || []).map((slotType, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select 
                          value={slotType.duration.toString()} 
                          onValueChange={(value) => {
                            const newConfig = { ...slotGeneration.days_config };
                            if (!newConfig[selectedDay]) newConfig[selectedDay] = [];
                            newConfig[selectedDay][idx].duration = parseInt(value);
                            setSlotGeneration({ ...slotGeneration, days_config: newConfig });
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                            <SelectItem value="120">120 min</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>×</span>
                        <Input 
                          type="number" 
                          min="1"
                          value={slotType.count} 
                          onChange={(e) => {
                            const newConfig = { ...slotGeneration.days_config };
                            if (!newConfig[selectedDay]) newConfig[selectedDay] = [];
                            newConfig[selectedDay][idx].count = parseInt(e.target.value) || 0;
                            setSlotGeneration({ ...slotGeneration, days_config: newConfig });
                          }} 
                          placeholder="Count"
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">slots</span>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            const newConfig = { ...slotGeneration.days_config };
                            newConfig[selectedDay] = newConfig[selectedDay].filter((_, i) => i !== idx);
                            if (newConfig[selectedDay].length === 0) delete newConfig[selectedDay];
                            setSlotGeneration({ ...slotGeneration, days_config: newConfig });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newConfig = { ...slotGeneration.days_config };
                        if (!newConfig[selectedDay]) newConfig[selectedDay] = [];
                        newConfig[selectedDay].push({ duration: 90, count: 5 });
                        setSlotGeneration({ ...slotGeneration, days_config: newConfig });
                      }}
                    >
                      + Add Slot Type
                    </Button>
                  </div>
                  
                  {/* Day Summary */}
                  {selectedDayTotalSlots > 0 && (
                    <div className={`rounded-lg p-3 ${fitsInWindow ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold">{selectedDay} Total:</span>
                        <span>{selectedDayTotalSlots} slots = {formatMinutes(selectedDayRequiredMinutes)}</span>
                      </div>
                      {fitsInWindow ? (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          ✓ Fits! {formatMinutes(availableMinutesPerDay - selectedDayRequiredMinutes)} remaining
                        </p>
                      ) : (
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          ✗ Need {formatMinutes(selectedDayRequiredMinutes - availableMinutesPerDay)} more time
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={generating || totalWeeklySlots === 0}>
                  {generating ? 'Generating...' : 'Generate Time Slots'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setSlotGeneration({ 
                      start_time: '08:00', 
                      end_time: '17:00', 
                      days_config: {
                        monday: [{ duration: 90, count: 5 }],
                        tuesday: [{ duration: 90, count: 5 }],
                        wednesday: [{ duration: 90, count: 5 }],
                        thursday: [{ duration: 90, count: 5 }],
                        friday: [{ duration: 90, count: 5 }],
                      },
                    });
                    setSelectedDay('monday');
                  }}
                >
                  Reset to Default
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
