import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoadmap, RoadmapModule, UserProfile } from './entities/roadmap.entity';
import { CreateRoadmapDto, UpdateRoadmapProgressDto } from './dto/create-roadmap.dto';
import { QuizResultsService } from '../quiz-results/quiz-results.service';

@Injectable()
export class RoadmapService {
  constructor(
    @InjectRepository(UserRoadmap)
    private readonly userRoadmapRepository: Repository<UserRoadmap>,
    private readonly quizResultsService: QuizResultsService,
  ) {}

  async generatePersonalizedRoadmap(userId: number): Promise<UserRoadmap> {
    const latestAssessment = await this.quizResultsService.findLatestAssessmentResult(userId);
    const quizLevelResults = await this.quizResultsService.findAllQuizLevelResults(userId);

    if (!latestAssessment) {
      return this.getDefaultRoadmap(userId);
    }

    const modules = this.generateModules(latestAssessment, quizLevelResults);
    
    const totalProgress = this.calculateTotalProgress(modules);
    const userLevel = this.calculateUserLevel(totalProgress, latestAssessment, quizLevelResults);
    const totalXP = this.calculateTotalXP(modules);

    let roadmap = await this.findUserRoadmap(userId);
    
    if (roadmap) {
      roadmap.modules = modules;
      roadmap.userProfile = {
        primaryProfile: latestAssessment.primaryProfile,
        hybridProfiles: latestAssessment.hybridProfiles,
        scores: latestAssessment.scores
      };
      roadmap.totalProgress = totalProgress;
      roadmap.userLevel = userLevel;
      roadmap.totalXP = totalXP;
      roadmap.updatedAt = new Date();
    } else {
      roadmap = this.userRoadmapRepository.create({
        userId,
        modules,
        userProfile: {
          primaryProfile: latestAssessment.primaryProfile,
          hybridProfiles: latestAssessment.hybridProfiles,
          scores: latestAssessment.scores
        },
        totalProgress,
        userLevel,
        totalXP,
      });
    }

    return this.userRoadmapRepository.save(roadmap);
  }

  async getUserRoadmap(userId: number): Promise<UserRoadmap> {
    let roadmap = await this.findUserRoadmap(userId);
    
    if (!roadmap) {
      roadmap = await this.generatePersonalizedRoadmap(userId);
    }
    
    return roadmap;
  }

  async updateModuleProgress(userId: number, moduleId: string, updateDto: UpdateRoadmapProgressDto): Promise<UserRoadmap> {
    const roadmap = await this.findUserRoadmap(userId);
    
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found for user');
    }

    const module = roadmap.modules.find(m => m.id === moduleId);
    if (!module) {
      throw new NotFoundException('Module not found in roadmap');
    }

    module.progress = updateDto.progress;
    module.status = updateDto.status;

    const quizResults = await this.quizResultsService.findAllQuizLevelResults(userId);

    roadmap.totalProgress = this.calculateTotalProgress(roadmap.modules);
    roadmap.userLevel = this.calculateUserLevel(roadmap.totalProgress, roadmap.userProfile, quizResults);
    roadmap.totalXP = this.calculateTotalXP(roadmap.modules);
    roadmap.updatedAt = new Date();

    return this.userRoadmapRepository.save(roadmap);
  }

  async getRoadmapAnalytics(userId: number): Promise<any> {
    const roadmap = await this.getUserRoadmap(userId);
    const quizHistory = await this.quizResultsService.getUserQuizHistory(userId);

    return {
      roadmap,
      analytics: {
        completedModules: roadmap.modules.filter(m => m.status === 'completed').length,
        currentModules: roadmap.modules.filter(m => m.status === 'current').length,
        totalModules: roadmap.modules.length,
        estimatedTotalHours: roadmap.modules.reduce((sum, m) => sum + m.estimatedHours, 0),
        completedHours: roadmap.modules
          .filter(m => m.status === 'completed')
          .reduce((sum, m) => sum + m.estimatedHours, 0),
        averageQuizScore: this.calculateAverageQuizScore(quizHistory.quizLevelResults),
        strengths: this.identifyStrengths(roadmap.userProfile, quizHistory.quizLevelResults),
        recommendedNextSteps: this.getRecommendedNextSteps(roadmap)
      }
    };
  }

  private async findUserRoadmap(userId: number): Promise<UserRoadmap | null> {
    return this.userRoadmapRepository.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  private getDefaultRoadmap(userId: number): UserRoadmap {
    return this.userRoadmapRepository.create({
      userId,
      modules: [this.getFoundationModule()],
      userProfile: undefined,
      totalProgress: 0,
      userLevel: 0,
      totalXP: 0,
    });
  }

  private generateModules(assessment: any, quizResults: any[]): RoadmapModule[] {
    const modules: RoadmapModule[] = [];

    const foundationModule = this.getFoundationModule(assessment.primaryProfile);
    modules.push(foundationModule);

    const domainModules = this.getDomainModules(assessment, quizResults);
    modules.push(...domainModules);

    const advancedModules = this.getAdvancedModules(assessment, quizResults);
    modules.push(...advancedModules);

    this.updateModuleStatusesFromQuizResults(modules, quizResults);

    return modules;
  }

  private getFoundationModule(primaryProfile?: string): RoadmapModule {
    const foundationTopics = this.getFoundationTopics(primaryProfile);
    const foundationSkills = this.getFoundationSkills(primaryProfile);
    const domainColor = this.getDomainColor(primaryProfile);

    return {
      id: 'foundation',
      title: 'Foundation',
      description: `Build your ${primaryProfile || 'technology'} fundamentals`,
      status: 'completed',
      duration: '4 weeks',
      difficulty: 'Beginner',
      topics: foundationTopics,
      progress: 100,
      icon: 'Brain',
      color: domainColor,
      estimatedHours: 40,
      skills: foundationSkills,
    };
  }

  private getDomainModules(assessment: any, quizResults: any[]): RoadmapModule[] {
    const modules: RoadmapModule[] = [];
    const primaryProfile = assessment.primaryProfile;

    if (primaryProfile === 'ai') {
      modules.push(
        {
          id: 'machine-learning',
          title: 'Machine Learning',
          description: 'Core ML algorithms and techniques',
          status: 'current',
          duration: '6 weeks',
          difficulty: 'Intermediate',
          topics: ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'Feature Engineering'],
          progress: this.getModuleProgress('machine-learning', quizResults),
          icon: 'Code',
          color: 'from-blue-500 to-cyan-600',
          estimatedHours: 60,
          skills: ['Scikit-learn', 'Pandas', 'NumPy', 'MLflow'],
          prerequisites: ['foundation']
        },
        {
          id: 'deep-learning',
          title: 'Deep Learning',
          description: 'Neural networks and advanced architectures',
          status: 'upcoming',
          duration: '8 weeks',
          difficulty: 'Advanced',
          topics: ['Neural Networks', 'CNN', 'RNN', 'Transformers', 'GANs'],
          progress: this.getModuleProgress('deep-learning', quizResults),
          icon: 'Zap',
          color: 'from-purple-500 to-pink-600',
          estimatedHours: 80,
          skills: ['TensorFlow', 'PyTorch', 'Keras', 'Hugging Face'],
          prerequisites: ['machine-learning']
        },
        {
          id: 'nlp',
          title: 'Natural Language Processing',
          description: 'Language models and text processing',
          status: 'upcoming',
          duration: '6 weeks',
          difficulty: 'Advanced',
          topics: ['Text Preprocessing', 'BERT', 'GPT', 'Fine-tuning', 'Text Generation'],
          progress: this.getModuleProgress('nlp', quizResults),
          icon: 'MessageSquare',
          color: 'from-indigo-500 to-purple-600',
          estimatedHours: 60,
          skills: ['Hugging Face', 'spaCy', 'NLTK', 'LangChain'],
          prerequisites: ['deep-learning']
        }
      );
    } else if (primaryProfile === 'cloud') {
      modules.push(
        {
          id: 'cloud-fundamentals',
          title: 'Cloud Fundamentals',
          description: 'Master cloud computing basics',
          status: 'current',
          duration: '6 weeks',
          difficulty: 'Intermediate',
          topics: ['Cloud Architecture', 'Storage', 'Networking', 'Security', 'IAM'],
          progress: this.getModuleProgress('cloud-fundamentals', quizResults),
          icon: 'Cloud',
          color: 'from-blue-500 to-cyan-600',
          estimatedHours: 60,
          skills: ['AWS/Azure', 'Cloud Storage', 'CDN', 'Load Balancing'],
          prerequisites: ['foundation']
        },
        {
          id: 'devops',
          title: 'DevOps & Deployment',
          description: 'CI/CD and deployment strategies',
          status: 'upcoming',
          duration: '6 weeks',
          difficulty: 'Advanced',
          topics: ['Docker', 'Kubernetes', 'CI/CD', 'Infrastructure as Code'],
          progress: this.getModuleProgress('devops', quizResults),
          icon: 'Rocket',
          color: 'from-green-500 to-emerald-600',
          estimatedHours: 60,
          skills: ['Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
          prerequisites: ['cloud-fundamentals']
        }
      );
    } else if (primaryProfile === 'cyber') {
      modules.push(
        {
          id: 'security-fundamentals',
          title: 'Security Fundamentals',
          description: 'Core cybersecurity concepts',
          status: 'current',
          duration: '6 weeks',
          difficulty: 'Intermediate',
          topics: ['Network Security', 'Encryption', 'Risk Assessment', 'Security Policies'],
          progress: this.getModuleProgress('security-fundamentals', quizResults),
          icon: 'Shield',
          color: 'from-red-500 to-orange-600',
          estimatedHours: 60,
          skills: ['Firewall Configuration', 'VPN', 'SIEM', 'Penetration Testing'],
          prerequisites: ['foundation']
        },
        {
          id: 'advanced-security',
          title: 'Advanced Security',
          description: 'Advanced cybersecurity techniques',
          status: 'upcoming',
          duration: '8 weeks',
          difficulty: 'Advanced',
          topics: ['Ethical Hacking', 'Malware Analysis', 'Digital Forensics', 'Security Architecture'],
          progress: this.getModuleProgress('advanced-security', quizResults),
          icon: 'Lock',
          color: 'from-red-600 to-pink-600',
          estimatedHours: 80,
          skills: ['Metasploit', 'Wireshark', 'Autopsy', 'OSSEC'],
          prerequisites: ['security-fundamentals']
        }
      );
    }

    return modules;
  }

  private getAdvancedModules(assessment: any, quizResults: any[]): RoadmapModule[] {
    const modules: RoadmapModule[] = [];
    
    const hasGoodPerformance = quizResults.some(result => result.score.percentage >= 70);
    
    if (hasGoodPerformance) {
      modules.push(
        {
          id: 'capstone',
          title: 'Capstone Project',
          description: 'Build your portfolio project',
          status: 'locked',
          duration: '8 weeks',
          difficulty: 'Advanced',
          topics: ['Project Planning', 'Implementation', 'Deployment', 'Presentation'],
          progress: 0,
          icon: 'Trophy',
          color: 'from-yellow-500 to-amber-600',
          estimatedHours: 80,
          skills: ['Full Stack Development', 'Project Management', 'Documentation'],
          prerequisites: this.getCapstonePrerequisites(assessment.primaryProfile)
        }
      );
    }
    
    return modules;
  }

  private getCapstonePrerequisites(primaryProfile: string): string[] {
    const prereqMap: Record<string, string[]> = {
      'ai': ['deep-learning', 'nlp'],
      'cloud': ['cloud-fundamentals', 'devops'],
      'cyber': ['security-fundamentals', 'advanced-security'],
      'devops': ['cloud-fundamentals', 'devops']
    };
    return prereqMap[primaryProfile] || ['foundation'];
  }

  private getFoundationTopics(primaryProfile?: string): string[] {
    const topicMap: Record<string, string[]> = {
      'ai': ['Python Basics', 'Mathematics', 'Statistics', 'Data Structures'],
      'cloud': ['Networking Basics', 'Operating Systems', 'Virtualization', 'Security Fundamentals'],
      'cyber': ['Computer Networks', 'Security Principles', 'Operating Systems', 'Cryptography Basics'],
      'devops': ['Linux Basics', 'Version Control', 'Networking', 'Scripting']
    };
    return topicMap[primaryProfile || ''] || ['Basic Concepts', 'Introduction', 'Getting Started'];
  }

  private getFoundationSkills(primaryProfile?: string): string[] {
    const skillMap: Record<string, string[]> = {
      'ai': ['Python', 'Statistics', 'Linear Algebra'],
      'cloud': ['AWS/Azure', 'Networking', 'Virtualization'],
      'cyber': ['Security Tools', 'Network Analysis', 'Risk Assessment'],
      'devops': ['Git', 'Docker', 'CI/CD']
    };
    return skillMap[primaryProfile || ''] || ['Fundamentals'];
  }

  private getDomainColor(primaryProfile?: string): string {
    const colorMap: Record<string, string> = {
      'ai': 'from-purple-500 to-pink-600',
      'cloud': 'from-blue-500 to-cyan-600',
      'cyber': 'from-red-500 to-orange-600',
      'devops': 'from-green-500 to-emerald-600'
    };
    return colorMap[primaryProfile || ''] || 'from-gray-500 to-gray-600';
  }

  private getModuleProgress(moduleId: string, quizResults: any[]): number {
    const moduleResults = quizResults.filter(result => 
      result.questions.some((q: any) => q.domain === moduleId)
    );
    
    if (moduleResults.length === 0) return 0;
    
    const averageScore = moduleResults.reduce((sum, result) => 
      sum + result.score.percentage, 0) / moduleResults.length;
    
    return Math.round(averageScore);
  }

  private updateModuleStatusesFromQuizResults(modules: RoadmapModule[], quizResults: any[]): void {
    modules.forEach(module => {
      const progress = this.getModuleProgress(module.id, quizResults);
      module.progress = progress;
      
      if (progress >= 90) {
        module.status = 'completed';
      } else if (progress > 0) {
        module.status = 'current';
      } else if (module.status === 'current') {
        module.status = 'upcoming';
      }
    });
  }

  private calculateTotalProgress(modules: RoadmapModule[]): number {
    if (modules.length === 0) return 0;
    const totalProgress = modules.reduce((sum, module) => sum + (module.progress || 0), 0);
    return Math.round(totalProgress / modules.length);
  }

  private calculateUserLevel(totalProgress: number, userProfile?: UserProfile, quizResults?: any[]): number {
    let progressLevel = 0;
    if (totalProgress >= 80) progressLevel = 4;
    else if (totalProgress >= 60) progressLevel = 3;
    else if (totalProgress >= 40) progressLevel = 2;
    else if (totalProgress >= 20) progressLevel = 1;

    let assessmentLevel = 0;
    if (userProfile) {
      const scores = userProfile.scores;
      const maxScore = Math.max(
        scores.aiPercentage,
        scores.cloudPercentage,
        scores.cyberPercentage,
        scores.devopsPercentage || 0
      );
      
      if (maxScore >= 85) assessmentLevel = 4;
      else if (maxScore >= 70) assessmentLevel = 3;
      else if (maxScore >= 55) assessmentLevel = 2;
      else if (maxScore >= 40) assessmentLevel = 1;
    }

    let quizLevel = 0;
    if (quizResults && quizResults.length > 0) {
      const averageQuizScore = quizResults.reduce((sum, result) => sum + result.score.percentage, 0) / quizResults.length;
      
      if (averageQuizScore >= 85) quizLevel = 4;
      else if (averageQuizScore >= 70) quizLevel = 3;
      else if (averageQuizScore >= 55) quizLevel = 2;
      else if (averageQuizScore >= 40) quizLevel = 1;
    }

    const allLevels = [progressLevel, assessmentLevel, quizLevel].filter(level => level > 0);
    
    if (allLevels.length === 0) return 0;
    
    if (progressLevel === 0 && (assessmentLevel > 0 || quizLevel > 0)) {
      const maxNonProgressLevel = Math.max(assessmentLevel, quizLevel);
      return Math.min(maxNonProgressLevel, 2);
    }
    
    return Math.max(progressLevel, assessmentLevel, quizLevel);
  }

  private calculateTotalXP(modules: RoadmapModule[]): number {
    return modules
      .filter(module => module.status === 'completed')
      .reduce((sum, module) => sum + (module.estimatedHours * 2), 0);
  }

  private calculateAverageQuizScore(quizResults: any[]): number {
    if (quizResults.length === 0) return 0;
    const totalScore = quizResults.reduce((sum, result) => sum + result.score.percentage, 0);
    return Math.round(totalScore / quizResults.length);
  }

  private identifyStrengths(userProfile: UserProfile | undefined, quizResults: any[]): string[] {
    const strengths: string[] = [];
    
    if (!userProfile) return strengths;
    
    if (userProfile.scores.aiPercentage >= 70) strengths.push('AI/ML');
    if (userProfile.scores.cloudPercentage >= 70) strengths.push('Cloud Computing');
    if (userProfile.scores.cyberPercentage >= 70) strengths.push('Cybersecurity');
    if (userProfile.scores.devopsPercentage && userProfile.scores.devopsPercentage >= 70) strengths.push('DevOps');
    
    return strengths;
  }

  private getRecommendedNextSteps(roadmap: UserRoadmap): string[] {
    const steps: string[] = [];
    const currentModule = roadmap.modules.find(m => m.status === 'current');
    
    if (currentModule) {
      steps.push(`Continue with ${currentModule.title} - ${currentModule.progress}% complete`);
    } else {
      const nextModule = roadmap.modules.find(m => m.status === 'upcoming');
      if (nextModule) {
        steps.push(`Start ${nextModule.title} to advance your learning`);
      }
    }
    
    if (roadmap.totalProgress >= 50) {
      steps.push('Consider taking advanced certification exams');
    }
    
    return steps;
  }
}

