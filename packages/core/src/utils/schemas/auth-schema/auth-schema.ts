import * as z from 'zod';

export const getLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email(t('validation.emailInvalid') || 'Please enter a valid email address'),
    password: z.string().min(6, t('validation.passwordMin') || 'Password must be at least 6 characters'),
  });

export const getSignUpSchema = (t: (key: string) => string) =>
  z.object({
    username: z.string().min(3, t('validation.usernameMin') || 'Username must be at least 3 characters'),
    email: z.string().email(t('validation.emailInvalid') || 'Please enter a valid email address'),
    password: z.string().min(6, t('validation.passwordMin') || 'Password must be at least 6 characters'),
  });

export type LoginFormData = z.infer<ReturnType<typeof getLoginSchema>>;
export type SignUpFormData = z.infer<ReturnType<typeof getSignUpSchema>>;
