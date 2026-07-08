import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const cvKeys = {
  all: ['cv'] as const,
  extract: () => [...cvKeys.all, 'extract'] as const,
  save: () => [...cvKeys.all, 'save'] as const,
  boost: () => [...cvKeys.all, 'boost'] as const,
  applyFormat: () => [...cvKeys.all, 'apply-format'] as const,
  platformData: () => [...cvKeys.all, 'platform-data'] as const,
  status: () => [...cvKeys.all, 'status'] as const,
  document: () => [...cvKeys.all, 'document'] as const,
};

export type CvDocument = {
  exists: boolean;
  hasContent: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  linkedin?: string;
  role?: string;
  seniority?: string;
  years_exp?: string;
  industry?: string;
  education?: string;
  skills?: string;
  summary?: string;
  bullets?: string;
  languages?: string;
  cv_file_name?: string;
  updated_at?: string;
  full_text?: string;
  full_text_truncated?: boolean;
};

export type CvStatus = {
  hasCv: boolean;
  status: 'ready' | 'processing' | 'error' | 'missing';
  lastUploadedAt?: string | null;
  fileName?: string | null;
  cvPreview?: {
    role?: string | null;
    yearsExp?: string | null;
    domain?: string | null;
    skillsCount?: number;
  } | null;
};

function getAuthHeader(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  // Try to read JSON first; fall back to text. Avoid throwing on invalid JSON.
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as any;
      if (typeof data === 'string') return data;
      if (data?.message) return String(data.message);
      if (data?.detail) return String(data.detail);
      return JSON.stringify(data);
    }
  } catch {
    // ignore
  }
  try {
    const t = await response.text();
    return t || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export function useCvExtract() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/extract', {
        method: 'POST',
        body: formData,
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to extract CV (${response.status}): ${msg}`);
      }

      return response.json();
    },
  });
}

export function useCvSave() {
  return useMutation({
    mutationFn: async ({
      file,
      quizData,
      labsData,
      certsData,
      extraData,
    }: {
      file: File;
      quizData?: any;
      labsData?: any[];
      certsData?: any[];
      extraData?: any;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (quizData) formData.append('quiz_data', JSON.stringify(quizData));
      if (labsData) formData.append('labs_data', JSON.stringify(labsData));
      if (certsData) formData.append('certs_data', JSON.stringify(certsData));
      if (extraData) formData.append('extra_data', JSON.stringify(extraData));

      const response = await fetch('/api/cv/save', {
        method: 'POST',
        body: formData,
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to save CV (${response.status}): ${msg}`);
      }

      return response.json();
    },
  });
}

export function useCvBoost() {
  return useMutation({
    mutationFn: async ({
      file,
      cvFormat = 'ats',
      includeQuiz = true,
      includeLabs = [],
      includeCerts = [],
      extraData = {},
      skippedSections = [],
    }: {
      file: File;
      cvFormat?: string;
      includeQuiz?: boolean;
      includeLabs?: any[];
      includeCerts?: any[];
      extraData?: any;
      skippedSections?: string[];
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cv_format', cvFormat);
      formData.append('include_quiz', String(includeQuiz));
      formData.append('include_labs', JSON.stringify(includeLabs));
      formData.append('include_certs', JSON.stringify(includeCerts));
      formData.append('extra_data', JSON.stringify(extraData));
      formData.append('skipped_sections', JSON.stringify(skippedSections));

      const response = await fetch('/api/cv/boost', {
        method: 'POST',
        body: formData,
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to boost CV (${response.status}): ${msg}`);
      }

      return response.json();
    },
  });
}

export function useCvApplyFormat() {
  return useMutation({
    mutationFn: async ({
      parsedCv,
      cvFormat,
      photoBase64,
    }: {
      parsedCv: string;
      cvFormat: string;
      photoBase64?: string;
    }) => {
      const response = await fetch('/api/cv/apply-format', {
        method: 'POST',
        body: JSON.stringify({
          parsed_cv: parsedCv,
          cv_format: cvFormat,
          photo_base64: photoBase64,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to apply CV format (${response.status}): ${msg}`);
      }

      return response.blob();
    },
  });
}

export function useCvDocument(enabled = true) {
  return useQuery<CvDocument>({
    queryKey: cvKeys.document(),
    enabled,
    queryFn: async () => {
      const response = await fetch('/api/cv/document', {
        method: 'GET',
        headers: getAuthHeader(),
      });
      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to load CV (${response.status}): ${msg}`);
      }
      return response.json() as Promise<CvDocument>;
    },
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCvStatus() {
  return useQuery<CvStatus>({
    queryKey: cvKeys.status(),
    queryFn: async () => {
      const response = await fetch('/api/cv/status', {
        method: 'GET',
        headers: getAuthHeader(),
      });
      if (!response.ok) {
        const msg = await readErrorMessage(response);
        throw new Error(`Failed to load CV status (${response.status}): ${msg}`);
      }
      const data = (await response.json()) as Partial<CvStatus>;
      const status = data.status ?? 'missing';
      const allowed = new Set(['ready', 'processing', 'error', 'missing']);
      return {
        hasCv: Boolean(data.hasCv),
        status: allowed.has(status) ? (status as CvStatus['status']) : 'missing',
        lastUploadedAt: data.lastUploadedAt ?? null,
        fileName: data.fileName ?? null,
        cvPreview: data.cvPreview ?? null,
      };
    },
    staleTime: 15_000,
    retry: 1,
  });
}

export function invalidateCvStatus(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: cvKeys.status() });
}