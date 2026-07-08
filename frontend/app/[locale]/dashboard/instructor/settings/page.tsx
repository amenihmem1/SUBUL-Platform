'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cog, User, Bell, Shield, Mail, Save } from 'lucide-react';

export default function InstructorSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Mohammed Instructor',
    email: 'instructor@subul.dev',
    bio: 'Expert en cloud computing avec plus de 10 ans d\'expérience dans la formation professionnelle.',
    specialty: 'Cloud Computing',
    linkedIn: 'https://linkedin.com/in/instructor',
  });

  const [notifications, setNotifications] = useState({
    emailNewStudent: true,
    emailNewAssessment: true,
    emailCompletion: true,
    emailMessage: false,
    pushNewStudent: true,
    pushNewAssessment: true,
  });

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-1">
      <motion.div
        className="bg-card rounded-2xl p-8 border border-border shadow-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <Cog className="w-8 h-8 text-primary" />
          <div>
            <p className="text-slate-500 text-sm">Paramètres</p>
            <h1 className="text-2xl font-bold text-foreground">Paramètres du compte</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-primary text-primary-foreground">
                  MI
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profileData.fullName}</p>
                  <p className="text-sm text-muted-foreground">{profileData.email}</p>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {activeTab === 'profile' && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Informations du profil</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nom complet</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Spécialité</label>
                  <input
                    type="text"
                    value={profileData.specialty}
                    onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bio</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">LinkedIn</label>
                  <input
                    type="url"
                    value={profileData.linkedIn}
                    onChange={(e) => setProfileData({ ...profileData, linkedIn: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Préférences de notification</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Notifications par email</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'emailNewStudent', label: 'Nouvel étudiant inscrit' },
                      { key: 'emailNewAssessment', label: 'Nouveau quiz à évaluer' },
                      { key: 'emailCompletion', label: 'Étudiant termine une formation' },
                      { key: 'emailMessage', label: 'Nouveau message' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                          className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Sécurité</h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Changer le mot de passe</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <button className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                    <Shield className="w-4 h-4" />
                    Mettre à jour le mot de passe
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
