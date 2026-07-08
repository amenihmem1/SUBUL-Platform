import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInstructorDashboard,
  getInstructorCourses,
  getInstructorCourse,
  getInstructorStudents,
  getInstructorStudent,
  getInstructorAssessments,
  updateAssessment,
  getInstructorMessages,
  markMessageRead,
  getInstructorAnalytics,
  type InstructorCourse,
  type InstructorStudent,
  type InstructorAssessment,
  type InstructorDashboard,
} from '@/services/instructorApi';

export const instructorKeys = {
  all: ['instructor'] as const,
  dashboard: () => [...instructorKeys.all, 'dashboard'] as const,
  courses: (params?: { page?: number; limit?: number }) => [...instructorKeys.all, 'courses', params] as const,
  course: (id: string) => [...instructorKeys.all, 'courses', id] as const,
  students: (params?: { page?: number; limit?: number; search?: string; courseId?: string }) => 
    [...instructorKeys.all, 'students', params] as const,
  student: (id: number) => [...instructorKeys.all, 'students', id] as const,
  assessments: (params?: { page?: number; limit?: number; status?: string }) => 
    [...instructorKeys.all, 'assessments', params] as const,
  messages: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => 
    [...instructorKeys.all, 'messages', params] as const,
  analytics: (params?: { startDate?: string; endDate?: string; courseId?: string }) => 
    [...instructorKeys.all, 'analytics', params] as const,
};

export function useInstructorDashboard() {
  return useQuery({
    queryKey: instructorKeys.dashboard(),
    queryFn: getInstructorDashboard,
  });
}

export function useInstructorCourses(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: instructorKeys.courses(params),
    queryFn: () => getInstructorCourses(params),
  });
}

export function useInstructorCourse(id: string | null, enabled = true) {
  return useQuery({
    queryKey: instructorKeys.course(id ?? ''),
    queryFn: () => getInstructorCourse(id!),
    enabled: enabled && !!id,
  });
}

export function useInstructorStudents(params?: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  courseId?: string;
}) {
  return useQuery({
    queryKey: instructorKeys.students(params),
    queryFn: () => getInstructorStudents(params),
  });
}

export function useInstructorStudent(id: number | null, enabled = true) {
  return useQuery({
    queryKey: instructorKeys.student(id ?? 0),
    queryFn: () => getInstructorStudent(id!),
    enabled: enabled && !!id,
  });
}

export function useInstructorAssessments(params?: { 
  page?: number; 
  limit?: number; 
  status?: string;
}) {
  return useQuery({
    queryKey: instructorKeys.assessments(params),
    queryFn: () => getInstructorAssessments(params),
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { score?: number; feedback?: string; status?: string } }) =>
      updateAssessment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructorKeys.assessments() });
    },
  });
}

export function useInstructorMessages(params?: { 
  page?: number; 
  limit?: number; 
  unreadOnly?: boolean;
}) {
  return useQuery({
    queryKey: instructorKeys.messages(params),
    queryFn: () => getInstructorMessages(params),
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markMessageRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instructorKeys.messages() });
    },
  });
}

export function useInstructorAnalytics(params?: { 
  startDate?: string; 
  endDate?: string; 
  courseId?: string;
}) {
  return useQuery({
    queryKey: instructorKeys.analytics(params),
    queryFn: () => getInstructorAnalytics(params),
  });
}
