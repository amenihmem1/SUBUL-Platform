export const COURSE_LEVELS = ['Fundamentals', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];
