import api from './axios';
import { LabResponse, LabProgressResponse } from '../../types/api';

// Use shared api instance (JWT from lib/auth/token via axios interceptor)
export const apiClient = api;

// Lab API endpoints - backend at /labs
export const labsApi = {
  // Public endpoints
  getAllLabs: async (filters?: {
    provider?: 'aws' | 'azure' | 'gcp' | 'nvidia'
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    status?: string
  }): Promise<LabResponse[]> => {
    const params = new URLSearchParams()
    if (filters?.provider) params.append('provider', filters.provider)
    if (filters?.difficulty) params.append('difficulty', filters.difficulty)
    if (filters?.status) params.append('status', filters.status)
    
    const response = await apiClient.get(`/labs?${params.toString()}`)
    return response.data
  },

  getLabBySlug: async (slug: string): Promise<LabResponse> => {
    const response = await apiClient.get(`/labs/${slug}`)
    return response.data
  },

  getLabStats: async (slug: string) => {
    const response = await apiClient.get(`/labs/${slug}/stats`)
    return response.data
  },

  getProviderStats: async (provider: 'aws' | 'azure' | 'gcp' | 'nvidia') => {
    const response = await apiClient.get(`/labs/providers/${provider}/stats`)
    return response.data
  },

  // Authenticated endpoints
  getUserProgress: async (): Promise<LabProgressResponse[]> => {
    const response = await apiClient.get('/labs/my/progress')
    return response.data
  },

  getLabProgress: async (slug: string): Promise<LabProgressResponse> => {
    const response = await apiClient.get(`/labs/${slug}/progress`)
    return response.data
  },

  startLab: async (slug: string): Promise<LabProgressResponse> => {
    const response = await apiClient.post(`/labs/${slug}/start`)
    return response.data
  },

  updateLabProgress: async (slug: string, progressData: {
    completedTasks?: number[]
    isCompleted?: boolean
    notes?: {
      taskNotes?: { [taskId: number]: string }
      generalNotes?: string
    }
    timeSpent?: number
  }): Promise<LabProgressResponse> => {
    const response = await apiClient.post(`/labs/${slug}/progress`, progressData)
    return response.data
  },

  // Admin endpoints
  createLab: async (labData: any): Promise<LabResponse> => {
    const response = await apiClient.post('/labs', labData)
    return response.data
  },

  updateLab: async (slug: string, labData: any): Promise<LabResponse> => {
    const response = await apiClient.patch(`/labs/${slug}`, labData)
    return response.data
  },

  deleteLab: async (slug: string) => {
    const response = await apiClient.delete(`/labs/${slug}`)
    return response.data
  },

  seedAwsLabs: async () => {
    const response = await apiClient.post('/labs/seed/aws')
    return response.data
  }
}

// Helper functions for frontend integration
export const labHelpers = {
  // Transform backend lab data to frontend format
  transformLabData: (backendLab: any) => ({
    id: backendLab.slug,
    title: backendLab.title,
    description: backendLab.description,
    provider: backendLab.provider,
    difficulty: backendLab.difficulty.charAt(0).toUpperCase() + backendLab.difficulty.slice(1),
    duration: backendLab.estimatedTime,
    moduleTitle: backendLab.moduleTitle,
    tasks: backendLab.tasks,
    metadata: backendLab.metadata,
    slug: backendLab.slug,
    level: backendLab.metadata?.level,
    levelLabel: backendLab.metadata?.levelLabel,
    index: backendLab.metadata?.index,
    totalInLevel: backendLab.metadata?.totalInLevel,
    prevSlug: backendLab.metadata?.prevSlug,
    nextSlug: backendLab.metadata?.nextSlug,
    providerLoginUrl: backendLab.metadata?.providerLoginUrl,
    logo: backendLab.metadata?.logo,
    type: backendLab.provider, // Add type property for compatibility
  }),

  // Transform progress data
  transformProgressData: (backendProgress: any) => ({
    completedTasks: backendProgress.completedTasks,
    isCompleted: backendProgress.isCompleted,
    completedAt: backendProgress.completedAt,
    startedAt: backendProgress.startedAt,
    notes: backendProgress.notes,
    timeSpent: backendProgress.timeSpent,
  }),

  // Calculate progress percentage
  calculateProgress: (completedTasks: number[], totalTasks: number) => {
    if (totalTasks === 0) return 0
    return Math.round((completedTasks.length / totalTasks) * 100)
  },

  // Sync local storage with backend
  syncProgressWithBackend: async (labSlug: string, localProgress: any) => {
    try {
      const backendProgress = await labsApi.getLabProgress(labSlug)
      
      // Merge local and backend progress
      const mergedProgress = {
        completedTasks: [...new Set([...localProgress.completedTasks, ...backendProgress.completedTasks])],
        isCompleted: backendProgress.isCompleted || localProgress.isCompleted,
        notes: { ...backendProgress.notes, ...localProgress.notes },
        timeSpent: (backendProgress.timeSpent || 0) + (localProgress.timeSpent || 0)
      }

      // Update backend with merged progress
      await labsApi.updateLabProgress(labSlug, mergedProgress)
      
      // Update local storage
      localStorage.setItem(`lab-progress-${labSlug}`, JSON.stringify(mergedProgress))
      
      return mergedProgress
    } catch (error) {
      console.error('Error syncing progress:', error)
      return localProgress
    }
  }
}
