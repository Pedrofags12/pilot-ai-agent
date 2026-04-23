import { z } from "zod";

// === AUTH SCHEMAS ===
export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128, "Senha muito longa"),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  phone: z.string().regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Telefone inválido. Use: (11) 99999-9999"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128, "Senha muito longa"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
});

// === ONBOARDING SCHEMAS ===
export const companySchema = z.object({
  companyName: z.string().trim().min(2, "Nome da empresa muito curto").max(200, "Nome muito longo"),
  cnpj: z.string().optional().refine(
    (val) => !val || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(val),
    "CNPJ inválido. Use: 00.000.000/0000-00"
  ),
  commercialPhone: z.string().optional().refine(
    (val) => !val || /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val),
    "Telefone inválido"
  ),
  address: z.string().max(300, "Endereço muito longo").optional(),
});

export const aiConfigSchema = z.object({
  aiPrompt: z.string().trim().min(20, "Instruções muito curtas (mínimo 20 caracteres)").max(5000, "Instruções muito longas"),
});

// === PROFILE SCHEMAS ===
export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  phone: z.string().refine(
    (val) => !val || /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val),
    "Telefone inválido"
  ).optional(),
});

export const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128, "Senha muito longa"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

// === CLIENT SCHEMAS ===
export const clientSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(150, "Nome muito longo"),
  phone: z.string().optional().refine(
    (val) => !val || /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val),
    "Telefone inválido"
  ),
  region: z.string().max(200, "Região muito longa").optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type AIConfigFormData = z.infer<typeof aiConfigSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
