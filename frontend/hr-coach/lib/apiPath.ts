const HR_COACH_BASE_PATH = "/hr-coach-app";

export function rhApiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${HR_COACH_BASE_PATH}${normalizedPath}`;
}
