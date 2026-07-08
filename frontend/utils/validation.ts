
// XSS Protection
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/.+\..+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  name: /^[a-zA-Z\s'-]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Validation functions
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!VALIDATION_PATTERNS.email.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password || password.length === 0) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!VALIDATION_PATTERNS.password.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }
  
  return { isValid: errors.length === 0, errors };
};

export const validateName = (name: string, fieldName: string = 'Name'): { isValid: boolean; error?: string } => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: `${fieldName} must be less than 100 characters` };
  }
  
  if (!VALIDATION_PATTERNS.name.test(name)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { isValid: true };
};

export const validateTitle = (title: string): { isValid: boolean; error?: string } => {
  if (!title || title.trim() === '') {
    return { isValid: false, error: 'Title is required' };
  }
  
  if (title.length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters long' };
  }
  
  if (title.length > 200) {
    return { isValid: false, error: 'Title must be less than 200 characters' };
  }
  
  const sanitized = sanitizeInput(title);
  if (sanitized !== title) {
    return { isValid: false, error: 'Title contains invalid characters' };
  }
  
  return { isValid: true };
};

export const validateDescription = (description: string): { isValid: boolean; error?: string } => {
  if (!description || description.trim() === '') {
    return { isValid: false, error: 'Description is required' };
  }
  
  if (description.length > 2000) {
    return { isValid: false, error: 'Description must be less than 2000 characters' };
  }
  
  const sanitized = sanitizeInput(description);
  if (sanitized !== description) {
    return { isValid: false, error: 'Description contains invalid characters' };
  }
  
  return { isValid: true };
};

export const validateGoalData = (data: {
  title: string;
  description: string;
  category: string;
  priority: string;
  successCriteria: string;
  deadline: string;
  motivation: string;
  milestones: string[];
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title validation
  const titleValidation = validateTitle(data.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error!;
  }
  
  // Description validation
  const descValidation = validateDescription(data.description);
  if (!descValidation.isValid) {
    errors.description = descValidation.error!;
  }
  
  // Category validation
  const validCategories = ['certification', 'course', 'skill', 'career'];
  if (!validCategories.includes(data.category)) {
    errors.category = 'Invalid category selected';
  }
  
  // Priority validation
  const validPriorities = ['high', 'medium', 'low'];
  if (!validPriorities.includes(data.priority)) {
    errors.priority = 'Invalid priority selected';
  }
  
  // Success criteria validation
  if (!data.successCriteria || data.successCriteria.trim() === '') {
    errors.successCriteria = 'Success criteria is required';
  } else if (data.successCriteria.length > 500) {
    errors.successCriteria = 'Success criteria must be less than 500 characters';
  }
  
  // Deadline validation
  if (data.deadline) {
    const deadlineDate = new Date(data.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today) {
      errors.deadline = 'Deadline must be in the future';
    }
  }
  
  // Motivation validation
  if (data.motivation && data.motivation.length > 200) {
    errors.motivation = 'Motivation must be less than 200 characters';
  }
  
  // Milestones validation
  if (data.milestones && data.milestones.length > 0) {
    const invalidMilestones = data.milestones.filter(m => !m || m.trim() === '' || m.length > 100);
    if (invalidMilestones.length > 0) {
      errors.milestones = 'All milestones must be between 1-100 characters';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateDailyGoalData = (data: {
  title: string;
  points: number;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title validation
  const titleValidation = validateTitle(data.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error!;
  }
  
  // Points validation
  if (isNaN(data.points) || data.points < 1 || data.points > 100) {
    errors.points = 'Points must be between 1 and 100';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateWeeklyGoalData = (data: {
  title: string;
  description: string;
  category: string;
  progress: number;
  target: number;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title validation
  const titleValidation = validateTitle(data.title);
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error!;
  }
  
  // Description validation
  const descValidation = validateDescription(data.description);
  if (!descValidation.isValid) {
    errors.description = descValidation.error!;
  }
  
  // Category validation
  const validCategories = ['certification', 'course', 'skill', 'career'];
  if (!validCategories.includes(data.category)) {
    errors.category = 'Invalid category selected';
  }
  
  // Progress validation
  if (isNaN(data.progress) || data.progress < 0 || data.progress > 100) {
    errors.progress = 'Progress must be between 0 and 100';
  }
  
  // Target validation
  if (isNaN(data.target) || data.target < 1 || data.target > 100) {
    errors.target = 'Target must be between 1 and 100';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Rate limiting helper
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests: number[] = [];
  
  return (requestId?: string): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }
    
    // Check if under limit
    if (requests.length < maxRequests) {
      requests.push(now);
      return true;
    }
    
    return false;
  };
};

// CSRF protection helper
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken;
};

export default {
  sanitizeInput,
  sanitizeHtml,
  validateEmail,
  validatePassword,
  validateName,
  validateTitle,
  validateDescription,
  validateGoalData,
  validateDailyGoalData,
  validateWeeklyGoalData,
  createRateLimiter,
  generateCSRFToken,
  validateCSRFToken,
  VALIDATION_PATTERNS
};
