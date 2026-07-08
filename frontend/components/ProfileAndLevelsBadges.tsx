'use client';

import { Badge } from '@/components/ui';
import { Brain, Cloud, Shield, Rocket } from 'lucide-react';
import { UserProfile, QuizLevelResult } from '@/services/roadmap';

interface ProfileAndLevelsBadgesProps {
  userProfile: UserProfile | null;
  quizLevels: Record<string, QuizLevelResult | null>;
}

export default function ProfileAndLevelsBadges({ userProfile, quizLevels }: ProfileAndLevelsBadgesProps) {
  if (!userProfile) return null;

  return (
    <div className="space-y-4">
      <div className="inline-block bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20 w-full sm:w-auto">
        <div className="text-xs sm:text-sm font-medium mb-2">Profile Assessment</div>
        <div className="flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-xs sm:text-sm">
          <span className="block"><strong>Primary:</strong> {userProfile.primaryProfile.toUpperCase()}</span>
          <span className="block">AI: {userProfile.scores.aiPercentage}%</span>
          <span className="block">Cloud: {userProfile.scores.cloudPercentage}%</span>
          <span className="block">Cyber: {userProfile.scores.cyberPercentage}%</span>
          {userProfile.scores.devopsPercentage !== undefined && (
            <span className="block">DevOps: {userProfile.scores.devopsPercentage}%</span>
          )}
        </div>
      </div>

      {/* Quiz Level Badges */}
      {Object.keys(quizLevels).length > 0 && (
        <div className="inline-block bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-white/20 w-full sm:w-auto">
          <div className="text-xs sm:text-sm font-medium mb-2">Quiz Levels</div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {quizLevels.ai && (
              <Badge className="bg-purple-600/30 text-purple-100 border-purple-400/40 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                <Brain className="w-3 h-3 mr-1" />
                AI: {quizLevels.ai.level}
              </Badge>
            )}
            {quizLevels.cloud && (
              <Badge className="bg-primary/30 text-primary-foreground border-primary/40 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                <Cloud className="w-3 h-3 mr-1" />
                Cloud: {quizLevels.cloud.level}
              </Badge>
            )}
            {quizLevels.cyber && (
              <Badge className="bg-red-600/30 text-red-100 border-red-400/40 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                <Shield className="w-3 h-3 mr-1" />
                Cyber: {quizLevels.cyber.level}
              </Badge>
            )}
            {quizLevels.devops && (
              <Badge className="bg-green-600/30 text-green-100 border-green-400/40 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                <Rocket className="w-3 h-3 mr-1" />
                DevOps: {quizLevels.devops.level}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
