/**
 * Input Validation Utility
 * Provides schema-based validation with type checking, length limits, and rejection of unexpected fields
 * Following OWASP input validation best practices
 */

/**
 * Core validator for different types
 */
const validators = {
  string: (value, constraints = {}) => {
    if (typeof value !== 'string') {
      throw new Error(`Expected string, got ${typeof value}`);
    }
    
    const { minLength = 0, maxLength = 255, pattern, trim = true } = constraints;
    
    let str = trim ? value.trim() : value;
    
    if (str.length < minLength) {
      throw new Error(`String length ${str.length} is less than minimum ${minLength}`);
    }
    
    if (str.length > maxLength) {
      throw new Error(`String length exceeds maximum of ${maxLength}`);
    }
    
    if (pattern && !pattern.test(str)) {
      throw new Error(`String does not match required pattern`);
    }
    
    return str;
  },

  email: (value, constraints = {}) => {
    const str = validators.string(value, { maxLength: 254, ...constraints });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(str)) {
      throw new Error('Invalid email format');
    }
    
    return str.toLowerCase();
  },

  number: (value, constraints = {}) => {
    const { min, max, integer = false } = constraints;
    
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Expected number, got ${typeof value}`);
    }
    
    if (integer && !Number.isInteger(value)) {
      throw new Error('Expected integer');
    }
    
    if (min !== undefined && value < min) {
      throw new Error(`Number ${value} is less than minimum ${min}`);
    }
    
    if (max !== undefined && value > max) {
      throw new Error(`Number ${value} exceeds maximum ${max}`);
    }
    
    return value;
  },

  boolean: (value) => {
    if (typeof value !== 'boolean') {
      throw new Error(`Expected boolean, got ${typeof value}`);
    }
    return value;
  },

  enum: (value, constraints = {}) => {
    const { values = [] } = constraints;
    
    if (!values.includes(value)) {
      throw new Error(`Value must be one of: ${values.join(', ')}`);
    }
    
    return value;
  },

  url: (value, constraints = {}) => {
    const str = validators.string(value, { maxLength: 2048, ...constraints });
    
    try {
      const url = new URL(str);
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }
      return str;
    } catch (e) {
      throw new Error('Invalid URL format');
    }
  },

  array: (value, constraints = {}) => {
    const { itemSchema, maxItems = 100 } = constraints;
    
    if (!Array.isArray(value)) {
      throw new Error(`Expected array, got ${typeof value}`);
    }
    
    if (value.length > maxItems) {
      throw new Error(`Array length ${value.length} exceeds maximum of ${maxItems}`);
    }
    
    if (itemSchema) {
      return value.map((item, idx) => {
        try {
          return validateValue(item, itemSchema);
        } catch (e) {
          throw new Error(`Array item ${idx}: ${e.message}`);
        }
      });
    }
    
    return value;
  },

  object: (value, constraints = {}) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Expected object, got ${typeof value}`);
    }
    return value;
  }
};

/**
 * Validate a single value against a schema
 * @param {*} value - The value to validate
 * @param {Object} schema - The validation schema
 * @returns {*} The validated (and possibly transformed) value
 * @throws {Error} If validation fails
 */
function validateValue(value, schema) {
  if (schema.required && (value === undefined || value === null)) {
    throw new Error('Field is required');
  }

  if (!schema.required && (value === undefined || value === null)) {
    return value;
  }

  const type = schema.type;
  const validator = validators[type];

  if (!validator) {
    throw new Error(`Unknown type: ${type}`);
  }

  return validator(value, schema);
}

/**
 * Validate an object against a schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The validation schema defining allowed fields
 * @param {Object} options - Validation options
 * @returns {Object} The validated and sanitized data
 * @throws {Error} If validation fails
 */
export function validate(data, schema, options = {}) {
  const { strict = true, throwOnUnexpected = true } = options;
  
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Expected object as root value');
  }

  const validated = {};
  const errors = [];

  // Validate defined fields
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = data[fieldName];
    
    try {
      validated[fieldName] = validateValue(value, fieldSchema);
    } catch (error) {
      errors.push(`${fieldName}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }

  // Check for unexpected fields
  if (strict) {
    const unexpectedFields = Object.keys(data).filter(key => !(key in schema));
    
    if (unexpectedFields.length > 0) {
      if (throwOnUnexpected) {
        throw new Error(`Unexpected fields: ${unexpectedFields.join(', ')}`);
      }
      // Silently ignore unexpected fields if not throwing
    }
  }

  return validated;
}

/**
 * Create validation schema helper
 */
export const schema = {
  string: (constraints = {}) => ({ type: 'string', required: false, ...constraints }),
  requiredString: (constraints = {}) => ({ type: 'string', required: true, ...constraints }),
  
  email: (constraints = {}) => ({ type: 'email', required: false, ...constraints }),
  requiredEmail: (constraints = {}) => ({ type: 'email', required: true, ...constraints }),
  
  number: (constraints = {}) => ({ type: 'number', required: false, ...constraints }),
  requiredNumber: (constraints = {}) => ({ type: 'number', required: true, ...constraints }),
  
  boolean: () => ({ type: 'boolean', required: false }),
  requiredBoolean: () => ({ type: 'boolean', required: true }),
  
  enum: (values, constraints = {}) => ({ type: 'enum', required: false, values, ...constraints }),
  requiredEnum: (values, constraints = {}) => ({ type: 'enum', required: true, values, ...constraints }),
  
  url: (constraints = {}) => ({ type: 'url', required: false, ...constraints }),
  requiredUrl: (constraints = {}) => ({ type: 'url', required: true, ...constraints }),
  
  array: (itemSchema, constraints = {}) => ({ type: 'array', required: false, itemSchema, ...constraints }),
  requiredArray: (itemSchema, constraints = {}) => ({ type: 'array', required: true, itemSchema, ...constraints }),
  
  object: () => ({ type: 'object', required: false }),
  requiredObject: () => ({ type: 'object', required: true })
};