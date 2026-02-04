const examController = require('../../controllers/examController');
const db = require('../../config/db');

// Mock db
jest.mock('../../config/db');

describe('Exam Controller Performance - Reset Exams', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { type: 'invigilators' },
      query: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('measures query count for resetting invigilators', async () => {
    // Setup data
    const NUM_EXAMS = 100;
    const NUM_INSTRUCTORS = 5;

    const mockExams = Array.from({ length: NUM_EXAMS }, (_, i) => ({ id: i + 1 }));
    const mockInstructors = Array.from({ length: NUM_INSTRUCTORS }, (_, i) => ({ id: i + 100 }));

    // Mock DB responses
    // 1. SELECT exams
    // 2. SELECT instructors
    // 3. UPDATE query (batch)
    db.query
      .mockResolvedValueOnce([mockExams])
      .mockResolvedValueOnce([mockInstructors]);

    // For subsequent update calls, just return success
    db.query.mockResolvedValue([{ affectedRows: 1 }]);

    console.log(`\n--- Starting Benchmark with ${NUM_EXAMS} exams ---`);
    const start = Date.now();

    await examController.resetExams(req, res);

    const duration = Date.now() - start;
    const queryCount = db.query.mock.calls.length;

    console.log(`Execution time (mocked DB): ${duration}ms`);
    console.log(`Total DB queries: ${queryCount}`);

    // Assertion:
    // With 100 exams and batch size 1000, we expect exactly 3 queries:
    // 1. SELECT exams
    // 2. SELECT instructors
    // 3. ONE Batch UPDATE

    // If we had N+1, it would be 102 queries.
    expect(queryCount).toBeLessThan(10);
    expect(queryCount).toBe(3);

    // Verify correct response
    expect(res.json).toHaveBeenCalledWith({ message: 'Invigilators reassigned successfully' });
  });
});
