/**
 * Validation middleware
 * Placeholder for input validation rules
 */

module.exports = {
  validateImageUpload: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    next();
  },

  validateOperations: (req, res, next) => {
    if (!req.body.operations) {
      return res.status(400).json({ error: 'Operations are required' });
    }
    next();
  }
};
