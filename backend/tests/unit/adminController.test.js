const adminController = require('../../controllers/adminController');
const db = require('../../config/db');

// Mock db
jest.mock('../../config/db', () => {
  const mockConnection = {
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  return {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    // Also mock query on the pool itself if needed, but adminController uses getConnection for this function
    query: jest.fn(),
  };
});

describe('promoteSection Performance Benchmark', () => {
  let mockConnection;
  let req;
  let res;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection = await db.getConnection();

    // Setup request and response
    req = {
      params: { id: 1 },
      body: {
        new_semester: 2,
        promote_courses: true
      },
      user: { id: 999 }
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  test('should execute constant number of queries (Optimized)', async () => {
    const numberOfOfferings = 10;
    const mockOfferings = Array.from({ length: numberOfOfferings }, (_, i) => ({
      id: i + 1,
      course_id: 100 + i,
      section_id: 1,
      semester: 1,
      intake: 'A',
      shift: 'Morning',
      academic_year: '2023'
    }));

    // Setup mock return values
    mockConnection.query
      .mockResolvedValueOnce([mockOfferings]) // SELECT * FROM course_offerings
      .mockResolvedValueOnce([{ insertId: 200, affectedRows: numberOfOfferings }]) // Bulk INSERT course_offerings
      .mockResolvedValueOnce([{ affectedRows: numberOfOfferings }]) // Bulk INSERT section_course_history
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE sections

    await adminController.promoteSection(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Section promoted successfully' });

    // Calculate expected query count:
    // 1. SELECT current offerings
    // 2. Bulk INSERT offering
    // 3. Bulk INSERT history
    // 4. UPDATE section
    // Total: 4 queries

    const queryCalls = mockConnection.query.mock.calls.length;
    console.log(`Total queries executed: ${queryCalls}`);
    expect(queryCalls).toBe(4);
  });
});
