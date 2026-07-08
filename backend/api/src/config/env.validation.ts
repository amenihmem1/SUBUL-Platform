import * as Joi from 'joi';

const forbiddenJwtSecrets = ['subul-jwt-secret-change-in-production', 'subul-platform-super-secret-jwt-key'];

const productionSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.string().default('5434'),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),

  // In production, reject copy-pasted example secrets. Development/Docker may use .env.example values.
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(16)
      .required()
      .invalid(...forbiddenJwtSecrets)
      .messages({
        'any.invalid':
          'JWT_SECRET must not use a documented dev default; set a strong unique secret',
      }),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  SESSION_SECRET: Joi.string().min(16).required(),

  FRONTEND_URL: Joi.string().uri().required(),
  /** Comma-separated extra browser origins for CORS (e.g. https://subul.uk,https://www.subul.uk) */
  CORS_ORIGINS: Joi.string().allow('').optional(),
  /** When true, log public /plans response slugs (debug) */
  LOG_PUBLIC_PLANS: Joi.string().valid('true', 'false').optional(),
  BACKEND_URL: Joi.string().uri().required(),
  EMAIL_VERIFICATION_LOCALE: Joi.string().length(2).default('en'),

  // Amazon SES SMTP (MailService / nodemailer). Not Microsoft Graph.
  SMTP_HOST: Joi.string().min(1).default('email-smtp.eu-central-1.amazonaws.com'),
  SMTP_PORT: Joi.string()
    .empty('')
    .pattern(/^\d+$/)
    .default('587')
    .messages({ 'string.pattern.base': 'SMTP_PORT must be a numeric string (e.g. 587)' }),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SMTP_PASS: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  MAIL_FROM: Joi.string().email().default('subul@smartovate.com'),
  MAIL_FROM_NAME: Joi.string().default('Subul Platform'),
}).unknown(true);

/**
 * Validates process.env at startup. Fails fast with readable messages.
 * Production requires SMTP_USER + SMTP_PASS for transactional email.
 */
export const envValidationSchema =
  process.env.NODE_ENV === 'test' ? Joi.object({}).unknown(true) : productionSchema;
