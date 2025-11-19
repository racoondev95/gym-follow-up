const { getDB } = require('../config/database');

class User {
  static async findByEmailOrUsername(emailOrUsername) {
    const db = getDB();
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );
    return users.length > 0 ? users[0] : null;
  }

  static async findById(id) {
    const db = getDB();
    const [users] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  }

  static async findAll() {
    const db = getDB();
    const [rows] = await db.query(
      'SELECT id, email, username, firstName, lastName, userRole, profilePicturePath, createdAt, updatedAt FROM users'
    );
    return rows;
  }

  static async create(userData) {
    const db = getDB();
    const { email, username, password, firstName, lastName, userRole, profilePicturePath } = userData;
    const [result] = await db.query(
      'INSERT INTO users (email, username, password, firstName, lastName, userRole, profilePicturePath) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, username, password, firstName, lastName, userRole || 'user', profilePicturePath]
    );
    return await this.findById(result.insertId);
  }

  static async update(id, updateData) {
    const db = getDB();
    const updateFields = [];
    const updateValues = [];

    if (updateData.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(updateData.email);
    }
    if (updateData.username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(updateData.username);
    }
    if (updateData.password !== undefined) {
      updateFields.push('password = ?');
      updateValues.push(updateData.password);
    }
    if (updateData.firstName !== undefined) {
      updateFields.push('firstName = ?');
      updateValues.push(updateData.firstName);
    }
    if (updateData.lastName !== undefined) {
      updateFields.push('lastName = ?');
      updateValues.push(updateData.lastName);
    }
    if (updateData.userRole !== undefined) {
      updateFields.push('userRole = ?');
      updateValues.push(updateData.userRole);
    }
    if (updateData.profilePicturePath !== undefined) {
      updateFields.push('profilePicturePath = ?');
      updateValues.push(updateData.profilePicturePath);
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    updateValues.push(id);
    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    return await this.findById(id);
  }

  static async delete(id) {
    const db = getDB();
    const [user] = await db.query('SELECT profilePicturePath FROM users WHERE id = ?', [id]);
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return user.length > 0 ? user[0] : null;
  }
}

module.exports = User;

