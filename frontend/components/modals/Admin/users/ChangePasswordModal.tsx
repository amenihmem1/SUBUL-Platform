'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPassword: string) => void | Promise<void>;
  userName: string;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSave,
  userName,
}: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;

  const getStrengthColor = () => {
    if (strengthScore <= 2) return 'bg-red-500';
    if (strengthScore <= 3) return 'bg-yellow-500';
    if (strengthScore <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strengthScore <= 2) return t('password.weak') || 'Faible';
    if (strengthScore <= 3) return t('password.medium') || 'Moyen';
    if (strengthScore <= 4) return t('password.strong') || 'Fort';
    return t('password.veryStrong') || 'Tr\u00e8s fort';
  };

  const handleSubmit = async () => {
    if (!passwordsMatch || strengthScore < 3) return;

    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(newPassword));
      setSuccess(true);
      handleClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200"
        >
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          {/* Success Overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3 }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t('password.changed') || 'Mot de passe modifi\u00e9'}</h3>
                  <p className="text-slate-600">{t('password.successMessage') || 'Le mot de passe a \u00e9t\u00e9 chang\u00e9 avec succ\u00e8s'}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="relative p-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('password.changePassword') || 'Modifier le mot de passe'}</h2>
                <p className="text-sm text-slate-500">{userName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="relative p-6 space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                {t('password.newPassword') || 'Nouveau mot de passe'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {newPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(strengthScore / 5) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full ${getStrengthColor()} rounded-full`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      strengthScore <= 2 ? 'text-red-500' :
                      strengthScore <= 3 ? 'text-yellow-600' :
                      strengthScore <= 4 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {getStrengthLabel()}
                    </span>
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { check: hasMinLength, label: t('password.minLength') || '8+ caract\u00e8res' },
                      { check: hasUppercase, label: t('password.uppercase') || 'Majuscule' },
                      { check: hasLowercase, label: t('password.lowercase') || 'Minuscule' },
                      { check: hasNumber, label: t('password.number') || 'Chiffre' },
                      { check: hasSpecialChar, label: t('password.special') || 'Caract\u00e8re sp\u00e9cial' },
                    ].map((req, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-1.5 ${req.check ? 'text-green-600' : 'text-slate-400'}`}
                      >
                        <CheckCircle className={`w-3.5 h-3.5 ${req.check ? 'text-green-600' : 'text-slate-300'}`} />
                        {req.label}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                {t('password.confirmPassword') || 'Confirmer le mot de passe'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className={`w-full pl-12 pr-12 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-500 focus:ring-red-500'
                      : confirmPassword && passwordsMatch
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-slate-200 focus:ring-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('password.noMatch') || 'Les mots de passe ne correspondent pas'}
                </motion.p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="relative p-6 border-t border-slate-200 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel') || 'Annuler'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!passwordsMatch || strengthScore < 3 || isSubmitting}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                t('common.save') || 'Enregistrer'
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
