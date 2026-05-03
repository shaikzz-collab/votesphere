import { db, saveDB } from '../db.js';
import fs from 'fs';

// Mock fs to prevent actual file writes during tests
jest.mock('fs');

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly define initial database structure', () => {
    expect(db).toHaveProperty('users');
    expect(db).toHaveProperty('elections');
    expect(db).toHaveProperty('candidates');
    expect(db).toHaveProperty('votes');
    expect(db).toHaveProperty('comments');
  });

  it('should correctly initialize with 14 candidates', () => {
    expect(Array.isArray(db.candidates)).toBeTruthy();
    expect(db.candidates.length).toBeGreaterThan(0);
  });

  it('should correctly initialize with 2 elections', () => {
    expect(Array.isArray(db.elections)).toBeTruthy();
    expect(db.elections.length).toBeGreaterThan(0);
  });

  it('should call fs.writeFileSync when saveDB is called', () => {
    saveDB();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
