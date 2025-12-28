const db = require('../config/db');

// Helper to parse time string (HH:MM:SS or HH:MM) to minutes since midnight
const parseTime = (timeStr) => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1] || 0, 10);
  return hours * 60 + minutes;
};

// Helper to format minutes since midnight to time string (HH:MM:SS)
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
};

// Helper to calculate total minutes from distribution
const calculateTotalMinutes = (distribution) => {
  return distribution.reduce((total, slot) => {
    return total + (slot.len * slot.count);
  }, 0);
};

// Helper to calculate time difference in minutes
const timeDifferenceInMinutes = (startTime, endTime) => {
  return parseTime(endTime) - parseTime(startTime);
};

// Set time slot generation settings with distribution
const setTimeSlotSettings = async (req, res) => {
  try {
    const { shift, start_time, end_time, distribution } = req.body;
    
    if (!shift || !start_time || !end_time || !distribution) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const distributionJson = JSON.stringify(distribution);
    
    // Upsert settings for this shift
    await db.query(
      'INSERT INTO time_slot_generation_settings (shift, start_time, end_time, distribution_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), distribution_json = VALUES(distribution_json)',
      [shift, start_time, end_time, distributionJson]
    );
    
    res.json({ message: 'Time slot generation settings updated successfully' });
  } catch (error) {
    console.error('Set time slot settings error:', error);
    res.status(500).json({ error: 'Failed to set time slot settings' });
  }
};

// Get time slot generation settings
const getTimeSlotSettings = async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM time_slot_generation_settings ORDER BY shift');
    res.json({ settings });
  } catch (error) {
    console.error('Get time slot settings error:', error);
    res.status(500).json({ error: 'Failed to get time slot settings' });
  }
};

// Generate time slots with per-day configuration
// NEW APPROACH: Configure slots separately for each day
// Example request body:
// {
//   "start_time": "08:00:00",
//   "end_time": "17:00:00",
//   "days_config": {
//     "monday": [{ "duration": 90, "count": 5 }],
//     "tuesday": [{ "duration": 90, "count": 4 }, { "duration": 60, "count": 2 }],
//     "wednesday": [{ "duration": 60, "count": 6 }]
//   }
// }
const generateSlotsWithDistribution = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { start_time, end_time, days_config } = req.body;
    
    if (!start_time || !end_time || !days_config || typeof days_config !== 'object') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const windowMinutes = timeDifferenceInMinutes(start_time, end_time);
    const validationErrors = [];
    
    // Validate each day's configuration
    for (const [day, slotTypes] of Object.entries(days_config)) {
      if (!Array.isArray(slotTypes) || slotTypes.length === 0) continue;
      
      const dayTotalMinutes = slotTypes.reduce((sum, type) => sum + (type.duration * type.count), 0);
      const dayTotalSlots = slotTypes.reduce((sum, type) => sum + type.count, 0);
      const dayGapMinutes = Math.max(0, (dayTotalSlots - 1) * 15);
      const dayRequiredMinutes = dayTotalMinutes + dayGapMinutes;
      
      if (dayRequiredMinutes > windowMinutes) {
        validationErrors.push({
          day,
          required: dayRequiredMinutes,
          available: windowMinutes,
          suggestion: `${day}: Reduce slots or increase time window`
        });
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Some days have slots that do not fit in time window',
        details: validationErrors
      });
    }
    
    await connection.beginTransaction();
    
    try {
      // Delete all existing slots
      await connection.query('DELETE FROM time_slots');
      
      const slots = [];
      let totalSlots = 0;
      
      // Generate slots for each configured day
      for (const [day, slotTypes] of Object.entries(days_config)) {
        if (!Array.isArray(slotTypes) || slotTypes.length === 0) continue;
        
        // Create array of durations for this day
        const daySlotDurations = [];
        slotTypes.forEach(type => {
          for (let i = 0; i < type.count; i++) {
            daySlotDurations.push(type.duration);
          }
        });
        
        const daySlots = createSlotsForDayMixed(day, start_time, daySlotDurations);
        slots.push(...daySlots);
        totalSlots += daySlotDurations.length;
      }
      
      if (slots.length > 0) {
        const query = 'INSERT INTO time_slots (day_of_week, start_time, end_time, slot_length_minutes, slot_label) VALUES ?';
        await connection.query(query, [slots]);
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Time slots generated successfully',
        summary: {
          totalSlots: slots.length,
          daysConfigured: Object.keys(days_config).length,
          daysConfig: days_config
        },
        slots: slots.slice(0, 20) // Preview first 20
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Failed to generate time slots' });
  } finally {
    connection.release();
  }
};

// Helper function to create slots for a single day (old method - kept for backward compatibility)
const createSlotsForDay = (shift, day, startTime, endTime, distribution) => {
  const slots = [];
  let currentTime = parseTime(startTime);
  const endTimeMinutes = parseTime(endTime);
  
  for (const slot of distribution) {
    const { len, count } = slot;
    
    for (let i = 0; i < count; i++) {
      if (currentTime + len > endTimeMinutes) break;
      
      const startStr = formatTime(currentTime);
      const endStr = formatTime(currentTime + len);
      const label = `${formatTime12Hour(currentTime)} - ${formatTime12Hour(currentTime + len)}`;
      
      // No shift column - just [day, start, end, duration, label]
      slots.push([day, startStr, endStr, len, label]);
      currentTime += len;
      
      // Add small gap between different slot types
      if (i < count - 1) {
        currentTime += 15; // 15-minute gap
      }
    }
  }
  
  return slots;
};

// Helper to convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (minutes) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12; // Convert 0 to 12 for midnight
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

// Helper function to create slots for a single day (weekly distribution)
const createSlotsForDayWeekly = (day, startTime, slotDuration, slotsCount) => {
  const slots = [];
  let currentTime = parseTime(startTime);
  
  for (let i = 0; i < slotsCount; i++) {
    const startStr = formatTime(currentTime);
    const endStr = formatTime(currentTime + slotDuration);
    const label = `${formatTime12Hour(currentTime)} - ${formatTime12Hour(currentTime + slotDuration)}`;
    
    // No shift column - just [day, start, end, duration, label]
    slots.push([day, startStr, endStr, slotDuration, label]);
    currentTime += slotDuration + 15; // Add 15-minute gap between slots
  }
  
  return slots;
};

// Helper function to create slots for a single day with mixed durations
const createSlotsForDayMixed = (day, startTime, slotDurations) => {
  const slots = [];
  let currentTime = parseTime(startTime);
  
  for (const duration of slotDurations) {
    const startStr = formatTime(currentTime);
    const endStr = formatTime(currentTime + duration);
    const label = `${formatTime12Hour(currentTime)} - ${formatTime12Hour(currentTime + duration)}`;
    
    // No shift column - just [day, start, end, duration, label]
    slots.push([day, startStr, endStr, duration, label]);
    currentTime += duration + 15; // Add 15-minute gap between slots
  }
  
  return slots;
};

// Get time slots
const getTimeSlots = async (req, res) => {
  try {
    const { shift, day_of_week } = req.query;
    
    let query = 'SELECT * FROM time_slots WHERE 1=1';
    const params = [];
    
    if (shift) {
      query += ' AND shift = ?';
      params.push(shift);
    }
    
    if (day_of_week) {
      query += ' AND day_of_week = ?';
      params.push(day_of_week);
    }
    
    query += ' ORDER BY day_of_week, start_time';
    
    const [slots] = await db.query(query, params);
    res.json({ slots });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ error: 'Failed to get time slots' });
  }
};

module.exports = {
  getTimeSlots,
  setTimeSlotSettings,
  getTimeSlotSettings,
  generateSlotsWithDistribution
};
