const { getDB } = require('../config/database');

class Session {
  static async findById(id) {
    const db = getDB();
    const [sessions] = await db.query('SELECT * FROM sessions WHERE id = ?', [id]);
    return sessions.length > 0 ? sessions[0] : null;
  }

  static async findByUserId(userId) {
    const db = getDB();
    const [rows] = await db.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM exercises WHERE sessionId = s.id) as exerciseCount
       FROM sessions s
       WHERE s.userId = ?
       ORDER BY s.sessionDate DESC`,
      [userId]
    );
    return rows;
  }

  static async findAll(userId = null) {
    const db = getDB();
    let query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM exercises WHERE sessionId = s.id) as exerciseCount
      FROM sessions s
    `;
    let params = [];
    
    if (userId) {
      query += ' WHERE s.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY s.sessionDate DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  }

  static async create(sessionData) {
    const db = getDB();
    const { userId, name, sessionDate } = sessionData;
    
    // Convert ISO date string to MySQL DATETIME format
    let mysqlDateTime = sessionDate;
    if (sessionDate) {
      const date = new Date(sessionDate);
      if (!isNaN(date.getTime())) {
        mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    
    const [result] = await db.query(
      'INSERT INTO sessions (userId, name, sessionDate) VALUES (?, ?, ?)',
      [userId, name || null, mysqlDateTime]
    );
    return await this.findById(result.insertId);
  }

  static async update(id, updateData) {
    const db = getDB();
    const updateFields = [];
    const updateValues = [];
    
    if (updateData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updateData.name || null);
    }
    
    if (updateData.sessionDate) {
      let mysqlDateTime = updateData.sessionDate;
      const date = new Date(updateData.sessionDate);
      if (!isNaN(date.getTime())) {
        mysqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
      }
      updateFields.push('sessionDate = ?');
      updateValues.push(mysqlDateTime);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(
        `UPDATE sessions SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    return await this.findById(id);
  }

  static async delete(id) {
    const db = getDB();
    await db.query('DELETE FROM sessions WHERE id = ?', [id]);
  }
}

module.exports = Session;

