import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from './entities/assessment-result.entity';
import { QuizLevelResult } from './entities/quiz-level-result.entity';
import { CreateAssessmentResultDto } from './dto/create-assessment-result.dto';
import { CreateQuizLevelResultDto } from './dto/create-quiz-level-result.dto';

@Injectable()
export class QuizResultsService {
  constructor(
    @InjectRepository(AssessmentResult)
    private readonly assessmentResultRepository: Repository<AssessmentResult>,
    @InjectRepository(QuizLevelResult)
    private readonly quizLevelResultRepository: Repository<QuizLevelResult>,
  ) {}

  async createAssessmentResult(createAssessmentResultDto: CreateAssessmentResultDto): Promise<AssessmentResult> {
    const existingAttempts = await this.assessmentResultRepository.count({
      where: { userId: createAssessmentResultDto.userId }
    });

    await this.assessmentResultRepository.update(
      { userId: createAssessmentResultDto.userId, isLatest: true },
      { isLatest: false }
    );

    const assessmentResult = this.assessmentResultRepository.create({
      ...createAssessmentResultDto,
      attemptNumber: existingAttempts + 1,
      isLatest: true
    });

    try {
      return await this.assessmentResultRepository.save(assessmentResult);
    } catch (err: any) {
      // Sequence out-of-sync after data migration — reset and retry once.
      if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
        await this.assessmentResultRepository.manager.query(
          `SELECT setval(pg_get_serial_sequence('assessment_results', 'id'), COALESCE((SELECT MAX(id) FROM assessment_results), 1))`,
        );
        return this.assessmentResultRepository.save(assessmentResult);
      }
      throw err;
    }
  }

  async deleteAssessmentById(assessmentId: number, userId: number): Promise<void> {
    await this.assessmentResultRepository.delete({
      id: assessmentId,
      userId: userId
    });
  }

  async findLatestAssessmentResult(userId: number): Promise<AssessmentResult | null> {
    return this.assessmentResultRepository.findOne({
      where: { userId, isLatest: true },
    });
  }

  async findAllAssessmentResults(userId: number): Promise<AssessmentResult[]> {
    return this.assessmentResultRepository.find({
      where: { userId },
      order: { completedAt: 'DESC' },
    });
  }

  async getAssessmentAttemptsCount(userId: number): Promise<number> {
    return this.assessmentResultRepository.count({
      where: { userId }
    });
  }

  async createQuizLevelResult(createQuizLevelResultDto: CreateQuizLevelResultDto): Promise<QuizLevelResult> {
    const quizLevelResult = this.quizLevelResultRepository.create(createQuizLevelResultDto);
    return this.quizLevelResultRepository.save(quizLevelResult);
  }

  async findLatestQuizLevelResult(userId: number, domain?: string): Promise<QuizLevelResult | null> {
    const whereCondition: any = { userId };
    if (domain) {
      whereCondition.domain = domain;
    }
    
    return this.quizLevelResultRepository.findOne({
      where: whereCondition,
      order: { completedAt: 'DESC' },
    });
  }

  async findAllQuizLevelResults(userId: number, domain?: string): Promise<QuizLevelResult[]> {
    const whereCondition: any = { userId };
    if (domain) {
      whereCondition.domain = domain;
    }

    return this.quizLevelResultRepository.find({
      where: whereCondition,
      order: { completedAt: 'DESC' },
    });
  }

  /** Admin: list all assessment results across users (with user relation) with pagination. */
  async findAllAssessmentResultsForAdmin(options?: { page?: number; limit?: number }): Promise<{ data: AssessmentResult[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.assessmentResultRepository.findAndCount({
      relations: ['user'],
      order: { completedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Admin: list all quiz-level results across users (with user relation) with pagination. */
  async findAllQuizLevelResultsForAdmin(domain?: string, options?: { page?: number; limit?: number }): Promise<{ data: QuizLevelResult[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (domain) where.domain = domain;

    const [data, total] = await this.quizLevelResultRepository.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      relations: ['user'],
      order: { completedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserQuizHistory(userId: number) {
    const assessmentResults = await this.findAllAssessmentResults(userId);
    const quizLevelResults = await this.findAllQuizLevelResults(userId);

    return {
      assessmentResults,
      quizLevelResults,
    };
  }

  async generatePersonalizedRoadmap(userId: number) {
    const latestAssessment = await this.findLatestAssessmentResult(userId);
    const quizLevelResults = await this.findAllQuizLevelResults(userId);

    if (!latestAssessment) {
      return this.getDefaultRoadmap();
    }

    const baseModules = [
      {
        id: 'foundation',
        title: 'Foundation',
        description: 'Build your fundamentals',
        status: 'completed' as const,
        duration: '4 weeks',
        difficulty: 'Beginner' as const,
        topics: this.getFoundationTopics(latestAssessment.primaryProfile),
        progress: 100,
        estimatedHours: 40,
        skills: this.getFoundationSkills(latestAssessment.primaryProfile),
        color: this.getDomainColor(latestAssessment.primaryProfile),
        icon: 'Brain'
      }
    ];

    const domainModules = this.getDomainModules(latestAssessment, quizLevelResults);
    
    const advancedModules = this.getAdvancedModules(latestAssessment, quizLevelResults);

    const allModules = [...baseModules, ...domainModules, ...advancedModules];

    this.updateModuleStatusesFromQuizResults(allModules, quizLevelResults);

    return {
      modules: allModules,
      userProfile: {
        primaryProfile: latestAssessment.primaryProfile,
        hybridProfiles: latestAssessment.hybridProfiles,
        scores: latestAssessment.scores
      },
      totalProgress: this.calculateTotalProgress(allModules)
    };
  }

  private getDefaultRoadmap() {
    return {
      modules: [
        {
          id: 'foundation',
          title: 'Foundation',
          description: 'Build your fundamentals',
          status: 'upcoming' as const,
          duration: '4 weeks',
          difficulty: 'Beginner' as const,
          topics: ['Basic Concepts', 'Introduction', 'Getting Started'],
          progress: 0,
          estimatedHours: 40,
          skills: ['Fundamentals'],
          color: 'from-gray-500 to-gray-600',
          icon: 'Brain'
        }
      ],
      userProfile: null,
      totalProgress: 0
    };
  }

  private getFoundationTopics(primaryProfile: string): string[] {
    const topicMap: Record<string, string[]> = {
      'ai': ['Python Basics', 'Mathematics', 'Statistics', 'Data Structures'],
      'cloud': ['Networking Basics', 'Operating Systems', 'Virtualization', 'Security Fundamentals'],
      'cyber': ['Computer Networks', 'Security Principles', 'Operating Systems', 'Cryptography Basics'],
      'devops': ['Linux Basics', 'Version Control', 'Networking', 'Scripting']
    };
    return topicMap[primaryProfile] || topicMap['ai'];
  }

  private getFoundationSkills(primaryProfile: string): string[] {
    const skillMap: Record<string, string[]> = {
      'ai': ['Python', 'Statistics', 'Linear Algebra'],
      'cloud': ['AWS/Azure', 'Networking', 'Virtualization'],
      'cyber': ['Security Tools', 'Network Analysis', 'Risk Assessment'],
      'devops': ['Git', 'Docker', 'CI/CD']
    };
    return skillMap[primaryProfile] || skillMap['ai'];
  }

  private getDomainColor(primaryProfile: string): string {
    const colorMap: Record<string, string> = {
      'ai': 'from-purple-500 to-pink-600',
      'cloud': 'from-blue-500 to-cyan-600',
      'cyber': 'from-red-500 to-orange-600',
      'devops': 'from-green-500 to-emerald-600'
    };
    return colorMap[primaryProfile] || colorMap['ai'];
  }

  private getDomainModules(assessment: any, quizResults: any[]) {
    const modules = [];
    
    if (assessment.primaryProfile === 'ai') {
      modules.push(
        {
          id: 'machine-learning',
          title: 'Machine Learning',
          description: 'Core ML algorithms and techniques',
          status: 'current' as const,
          duration: '6 weeks',
          difficulty: 'Intermediate' as const,
          topics: ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation'],
          progress: this.getModuleProgress('machine-learning', quizResults),
          estimatedHours: 60,
          skills: ['Scikit-learn', 'Pandas', 'NumPy'],
          color: 'from-blue-500 to-cyan-600',
          icon: 'Code'
        },
        {
          id: 'deep-learning',
          title: 'Deep Learning',
          description: 'Neural networks and advanced architectures',
          status: 'upcoming' as const,
          duration: '8 weeks',
          difficulty: 'Advanced' as const,
          topics: ['Neural Networks', 'CNN', 'RNN', 'Transformers'],
          progress: this.getModuleProgress('deep-learning', quizResults),
          estimatedHours: 80,
          skills: ['TensorFlow', 'PyTorch', 'Keras'],
          color: 'from-purple-500 to-pink-600',
          icon: 'Zap'
        }
      );
    } else if (assessment.primaryProfile === 'cloud') {
      modules.push(
        {
          id: 'cloud-fundamentals',
          title: 'Cloud Fundamentals',
          description: 'Master cloud computing basics',
          status: 'current' as const,
          duration: '6 weeks',
          difficulty: 'Intermediate' as const,
          topics: ['Cloud Architecture', 'Storage', 'Networking', 'Security'],
          progress: this.getModuleProgress('cloud-fundamentals', quizResults),
          estimatedHours: 60,
          skills: ['AWS/Azure', 'Cloud Storage', 'CDN'],
          color: 'from-blue-500 to-cyan-600',
          icon: 'Cloud'
        }
      );
    }
    
    return modules;
  }

  private getAdvancedModules(assessment: any, quizResults: any[]) {
    const modules = [];
    
    const hasGoodPerformance = quizResults.some(result => result.score.percentage >= 70);
    
    if (hasGoodPerformance) {
      modules.push(
        {
          id: 'capstone',
          title: 'Capstone Project',
          description: 'Build your portfolio project',
          status: 'locked' as const,
          duration: '8 weeks',
          difficulty: 'Advanced' as const,
          topics: ['Project Planning', 'Implementation', 'Deployment', 'Presentation'],
          progress: 0,
          estimatedHours: 80,
          skills: ['Full Stack', 'Project Management'],
          color: 'from-yellow-500 to-amber-600',
          icon: 'Trophy'
        }
      );
    }
    
    return modules;
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

  private updateModuleStatusesFromQuizResults(modules: any[], quizResults: any[]) {
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

  private calculateTotalProgress(modules: any[]): number {
    if (modules.length === 0) return 0;
    const totalProgress = modules.reduce((sum, module) => sum + (module.progress || 0), 0);
    return Math.round(totalProgress / modules.length);
  }
}