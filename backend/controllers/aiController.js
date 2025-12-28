
const { GoogleGenAI, Type } = require("@google/genai");
const db = require('../config/db');

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analyzeTimetable = async (req, res) => {
  try {
    const [timetable] = await db.query(`
      SELECT b.*, u.name as instructor, c.name as course, s.name as section, r.name as room
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
    `);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this university timetable for potential conflicts or optimization opportunities: ${JSON.stringify(timetable)}`,
      config: {
        systemInstruction: "You are an expert academic scheduler. Analyze the provided timetable data and return a JSON list of identified issues (conflicts) and optimization suggestions (better room usage, balanced instructor load).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conflicts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING }
                }
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  details: { type: Type.STRING },
                  benefit: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ error: 'AI analysis failed' });
  }
};

module.exports = { analyzeTimetable };
