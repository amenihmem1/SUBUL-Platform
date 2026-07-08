
export interface ProviderImageConfig {
  [key: string]: {
    src: string;
    alt: string;
    height?: string;
  };
}

export const providerImages: ProviderImageConfig = {
  'AWS': {
    src: '/AWS.png',
    alt: 'AWS Logo',
    height: 'h-16'
  },
  'Amazon Web Services': {
    src: '/AWS.png',
    alt: 'AWS Logo',
    height: 'h-16'
  },
  'Microsoft': {
    src: '/MIC.png',
    alt: 'Microsoft Logo',
    height: 'h-16'
  },
  'Microsoft Azure': {
    src: '/MIC.png',
    alt: 'Microsoft Azure Logo',
    height: 'h-16'
  },
  'Kubernetes': {
    src: '/Kubernetes.png',
    alt: 'Kubernetes Logo',
    height: 'h-16'
  },
  'Terraform': {
    src: '/tf.png',
    alt: 'Terraform Logo',
    height: 'h-20'
  },
  'Google': {
    src: '/gcp.png',
    alt: 'Google Cloud Logo',
    height: 'h-16'
  },
  'Google Cloud': {
    src: '/gcp.png',
    alt: 'Google Cloud Logo',
    height: 'h-16'
  },
  'NVIDIA': {
    src: '/NVIDIA.png',
    alt: 'NVIDIA Logo',
    height: 'h-16'
  },
  'CNCF': {
    src: '/Kubernetes.png',
    alt: 'CNCF Logo',
    height: 'h-16'
  },
  'Cloud Native Computing Foundation': {
    src: '/Kubernetes.png',
    alt: 'CNCF Logo',
    height: 'h-16'
  },
  'HashiCorp': {
    src: '/tf.png',
    alt: 'HashiCorp Logo',
    height: 'h-20'
  },
  'Meta': {
    src: '/META.png',
    alt: 'Meta Logo',
    height: 'h-16'
  }
};

export const getProviderImage = (provider: string) => {
  return providerImages[provider] || null;
};

export const hasProviderImage = (provider: string) => {
  return provider in providerImages;
};
