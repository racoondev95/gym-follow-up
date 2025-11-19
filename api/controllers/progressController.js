const { getDB } = require('../config/database');

const getProgressData = async (req, res) => {
  try {
    const userId = req.user.userRole === 'admin' && req.query.userId 
      ? req.query.userId 
      : req.user.userId;
    
    const db = getDB();
    
    // Query pentru a obține datele agregate pe luni
    // Intensitate: număr de sesiuni pe lună
    // Greutate medie: media greutății (weightOnLastSeries) din exerciții pentru fiecare lună
    const [progressData] = await db.query(`
      SELECT 
        DATE_FORMAT(s.sessionDate, '%Y-%m') as month,
        DATE_FORMAT(s.sessionDate, '%M %Y') as monthLabel,
        COUNT(DISTINCT s.id) as intensity,
        AVG(e.weightOnLastSeries) as averageWeight
      FROM sessions s
      LEFT JOIN exercises e ON s.id = e.sessionId AND e.weightOnLastSeries IS NOT NULL
      WHERE s.userId = ?
      GROUP BY DATE_FORMAT(s.sessionDate, '%Y-%m'), DATE_FORMAT(s.sessionDate, '%M %Y')
      ORDER BY DATE_FORMAT(s.sessionDate, '%Y-%m') ASC
    `, [userId]);
    
    // Formatează datele pentru chart
    const months = progressData.map(item => item.monthLabel);
    const intensity = progressData.map(item => item.intensity || 0);
    const averageWeight = progressData.map(item => {
      if (!item.averageWeight) return 0;
      // Convert to number first (MySQL returns Decimal objects)
      const weight = Number(item.averageWeight);
      return isNaN(weight) ? 0 : parseFloat(weight.toFixed(2));
    });
    
    res.json({
      months,
      intensity,
      averageWeight
    });
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProgressData
};

