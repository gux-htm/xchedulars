
const Joi = require('joi');
const xss = require('xss');
const validator = require('validator');

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(validator.trim(input));
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
        'any.required': 'Password is required'
      }),
    role: Joi.string().valid('admin', 'instructor', 'student').required(),
    department: Joi.string().max(100).optional().allow('', null),
    metadata: Joi.object().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  registerStudent: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    rollNumber: Joi.string().min(3).max(50).required(),
    sectionId: Joi.number().integer().positive().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required()
  }),

  verifyOtp: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only numbers'
    })
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      })
  }),

  updatePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    department: Joi.string().max(100).optional().allow('', null),
    specialization: Joi.string().max(200).optional().allow('', null),
    profile_picture: Joi.string().uri().optional().allow('', null)
  }),

  createCourse: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    code: Joi.string().min(2).max(50).required(),
    credit_hours: Joi.string().pattern(/^\d+\+\d+$/).required(),
    type: Joi.string().valid('theory', 'lab', 'both').required(),
    major_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
    applies_to_all_programs: Joi.boolean().optional()
  }),

  createSection: Joi.object({
    major_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(50).required(),
    semester: Joi.number().integer().min(1).max(8).required(),
    student_strength: Joi.number().integer().min(1).max(200).required(),
    shift: Joi.string().valid('morning', 'evening', 'weekend').required(),
    intake: Joi.string().valid('spring', 'summer', 'fall', 'winter').optional().allow('', null)
  }),

  createRoom: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('classroom', 'lab', 'both').required(),
    capacity: Joi.number().integer().min(1).max(500).required(),
    building: Joi.string().max(100).optional().allow('', null),
    floor: Joi.number().integer().optional().allow(null)
  })
};

// Validation middleware
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      console.error(`Validation schema '${schemaName}' not found`);
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    // Sanitize input first
    req.body = sanitizeInput(req.body);
    req.query = sanitizeInput(req.query);
    req.params = sanitizeInput(req.params);

    // Validate body
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    req.body = value;
    next();
  };
};

// Sanitize middleware (for routes without specific validation)
const sanitize = (req, res, next) => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
};

module.exports = { validate, sanitize, sanitizeInput };
