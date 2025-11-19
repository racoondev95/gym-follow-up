const { getDB } = require('../config/database');

class Exercise {
  static async findById(id) {
    const db = getDB();
    const [exercises] = await db.query('SELECT * FROM exercises WHERE id = ?', [id]);
    return exercises.length > 0 ? exercises[0] : null;
  }

  static async findBySessionId(sessionId) {
    const db = getDB();
    const [rows] = await db.query(
      'SELECT * FROM exercises WHERE sessionId = ? ORDER BY createdAt ASC',
      [sessionId]
    );
    return rows;
  }

  static async findAll(userId = null) {
    const db = getDB();
    let query = 'SELECT e.* FROM exercises e';
    let params = [];
    
    if (userId) {
      query += ' INNER JOIN sessions s ON e.sessionId = s.id WHERE s.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY e.createdAt DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  static async create(exerciseData) {
    const db = getDB();
    const { sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries } = exerciseData;
    
    const [result] = await db.query(
      'INSERT INTO exercises (sessionId, name, numberOfSeries, rangeRepsPerSeries, weightOnLastSeries, repsOnLastSeries) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, name, numberOfSeries || null, rangeRepsPerSeries || null, weightOnLastSeries || null, repsOnLastSeries || null]
    );
    return await this.findById(result.insertId);
  }

  static async update(id, updateData) {
    const db = getDB();
    const updateFields = [];
    const updateValues = [];
    
    if (updateData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updateData.name);
    }
    if (updateData.numberOfSeries !== undefined) {
      updateFields.push('numberOfSeries = ?');
      updateValues.push(updateData.numberOfSeries);
    }
    if (updateData.rangeRepsPerSeries !== undefined) {
      updateFields.push('rangeRepsPerSeries = ?');
      updateValues.push(updateData.rangeRepsPerSeries);
    }
    if (updateData.weightOnLastSeries !== undefined) {
      updateFields.push('weightOnLastSeries = ?');
      updateValues.push(updateData.weightOnLastSeries);
    }
    if (updateData.repsOnLastSeries !== undefined) {
      updateFields.push('repsOnLastSeries = ?');
      updateValues.push(updateData.repsOnLastSeries);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(
        `UPDATE exercises SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    return await this.findById(id);
  }

  static async delete(id) {
    const db = getDB();
    await db.query('DELETE FROM exercises WHERE id = ?', [id]);
  }

  static async deleteBySessionId(sessionId) {
    const db = getDB();
    await db.query('DELETE FROM exercises WHERE sessionId = ?', [sessionId]);
  }
}

module.exports = Exercise;

