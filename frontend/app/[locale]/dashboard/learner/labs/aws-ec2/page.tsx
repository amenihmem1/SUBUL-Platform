'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FlaskConical, CheckSquare, Eye, ArrowLeft, Target, Zap, Award, ExternalLink } from 'lucide-react'
import { PageLoader } from '@/components/ui/loading'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/contexts/LanguageContext'
import { useCourse } from '@/hooks/api/useCourses'
import { AWS_EC2_FULL_COURSE } from '@/data/courses/aws-ec2'
import { cn } from '@/lib/utils'

const AWS_EC2_COURSE_ID = 'AWS-EC2-BASICS'
const AWS_THEME = {
  primary: '#FF9900',
  gradient: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
  bg: 'bg-orange-50',
  text: 'text-orange-700',
  border: 'border-orange-200',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } }
}

export default function AwsEC2LabsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'fr'
  const { data: course, isLoading, error } = useCourse(AWS_EC2_COURSE_ID)

  const ALL_LABS = useMemo(() => {
    const source = (course?.levels?.some((l) => (l.labs ?? []).length > 0) ? course : AWS_EC2_FULL_COURSE) ?? AWS_EC2_FULL_COURSE
    if (!source?.levels) return []
    return source.levels.flatMap((lvl) =>
      (lvl.labs || []).map((lab) => ({
        ...lab,
        level: lvl.level as 'beginner' | 'intermediate',
        levelLabel: lvl.label,
        slug: `aws-ec2-${lvl.level}-${lab.id}`,
      }))
    )
  }, [course])

  const [activeLevel, setActiveLevel] = useState<'all' | 'beginner' | 'intermediate'>('all')

  const filtered = activeLevel === 'all'
    ? ALL_LABS
    : ALL_LABS.filter((l) => l.level === activeLevel)

  const beginnerCount = ALL_LABS.filter((l) => l.level === 'beginner').length
  const intermediateCount = ALL_LABS.filter((l) => l.level === 'intermediate').length

  if (isLoading) {
    return <PageLoader className="min-h-[200px]" />
  }
  const hasLabs = ALL_LABS.length > 0
  if (!hasLabs && (error || !course)) {
    return (
      <div className="learner-page-shell space-y-4">
        <button
          onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('learnerLabs.backToLabs')}
        </button>
        <p className="text-destructive">{t('learnerLabs.courseNotFound') || 'Cours introuvable.'}</p>
      </div>
    )
  }
  if (!hasLabs) {
    return (
      <div className="learner-page-shell space-y-4">
        <button
          onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('learnerLabs.backToLabs')}
        </button>
        <p className="text-muted-foreground">{t('learnerLabs.noLabs') || 'Aucun labo pour ce cours.'}</p>
      </div>
    )
  }

  return (
    <div className="learner-page-shell space-y-8">
      {/* Header — matches main Labs layout */}
      <div className="py-4 sm:py-5 border-b border-border">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <button
            onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('learnerLabs.backToLabs')}
          </button>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border', AWS_THEME.bg, AWS_THEME.text)} style={{ borderColor: AWS_THEME.primary }}>
              <Target className="h-3 w-3" /> {ALL_LABS.length} {t('learnerLabs.labsTotal')}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border', AWS_THEME.bg, AWS_THEME.text)} style={{ borderColor: AWS_THEME.primary }}>
              <Zap className="h-3 w-3" /> {beginnerCount} {t('learnerLabs.beginner')}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border', AWS_THEME.bg, AWS_THEME.text)} style={{ borderColor: AWS_THEME.primary }}>
              <Award className="h-3 w-3" /> {intermediateCount} {t('learnerLabs.intermediate')}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('learnerLabs.awsEc2Subtitle')}</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-card rounded-lg p-1.5 border border-border gap-2">
          {[
            { key: 'all', labelKey: 'learnerLabs.all', count: ALL_LABS.length, icon: <Target className="h-4 w-4" /> },
            { key: 'beginner', labelKey: 'learnerLabs.beginner', count: beginnerCount, icon: <Zap className="h-4 w-4" /> },
            { key: 'intermediate', labelKey: 'learnerLabs.intermediate', count: intermediateCount, icon: <Award className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveLevel(tab.key as typeof activeLevel)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeLevel === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.icon}
              {t(tab.labelKey)} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Lab Cards — Card layout matching main Labs page */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLevel}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filtered.map((lab) => {
            const isBeginner = lab.level === 'beginner'

            return (
              <motion.div key={lab.slug} variants={cardVariants} className="group">
                <Card
                  className={cn(
                    'h-full overflow-hidden border-2 transition-all duration-200 relative',
                    AWS_THEME.border,
                    'bg-white/80 backdrop-blur-sm hover:border-opacity-100'
                  )}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    borderColor: AWS_THEME.primary,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: AWS_THEME.gradient }}
                  />
                  <CardHeader className="pb-4 sm:pb-6 relative z-10">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow"
                        style={{
                          background: AWS_THEME.gradient,
                          boxShadow: `0 8px 32px ${AWS_THEME.primary}20`,
                        }}
                      >
                        <div className="text-white flex items-center justify-center">
                          <FlaskConical className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={cn(
                              'text-xs font-bold px-3 py-1.5 rounded-full border',
                              AWS_THEME.bg,
                              AWS_THEME.text
                            )}
                            style={{ borderColor: AWS_THEME.primary }}
                          >
                            {isBeginner ? t('learnerLabs.beginner') : t('learnerLabs.intermediate')}
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
                          {lab.title}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {lab.moduleTitle} · {lab.tasks.length} tâches
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5 relative z-10">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-gray-600">{lab.tasks.length} tâches pratiques</span>
                    </div>
                    <ul className="space-y-2">
                      {lab.tasks.slice(0, 3).map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                          <span className="truncate">{task}</span>
                        </li>
                      ))}
                      {lab.tasks.length > 3 && (
                        <li className="text-sm text-orange-600 font-medium pl-3.5">+{lab.tasks.length - 3} autres tâches…</li>
                      )}
                    </ul>
                    <Button
                      className="w-full font-semibold"
                      style={{ background: AWS_THEME.gradient }}
                      onClick={() => router.push(`/${locale}/dashboard/learner/labs/${lab.slug}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('learnerLabs.exploreLabs') || 'Voir le Lab'}
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
