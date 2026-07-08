import { Brain, Code, Zap, MessageSquare, Globe, Cloud, Trophy } from 'lucide-react';

export interface Module {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked' | 'upcoming';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topics: string[];
  progress?: number;
  icon: any;
  color: string;
  prerequisites?: string[];
  estimatedHours: number;
  skills: string[];
}

export const roadmapData: Module[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    description: 'Build your AI/ML fundamentals',
    status: 'completed',
    duration: '4 weeks',
    difficulty: 'Beginner',
    topics: ['Python Basics', 'Mathematics', 'Statistics', 'Data Structures'],
    progress: 100,
    icon: Brain, // Foundation icon
    color: 'from-green-500 to-emerald-600',
    estimatedHours: 40,
    skills: ['Python', 'Statistics', 'Linear Algebra']
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    description: 'Core ML algorithms and techniques',
    status: 'completed',
    duration: '6 weeks',
    difficulty: 'Intermediate',
    topics: ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation'],
    progress: 100,
    icon: Code, // Machine Learning icon
    color: 'from-blue-500 to-cyan-600',
    estimatedHours: 60,
    skills: ['Scikit-learn', 'Pandas', 'NumPy']
  },
  {
    id: 'deep-learning',
    title: 'Deep Learning',
    description: 'Neural networks and advanced architectures',
    status: 'current',
    duration: '8 weeks',
    difficulty: 'Advanced',
    topics: ['Neural Networks', 'CNN', 'RNN', 'Transformers'],
    progress: 65,
    icon: Zap, // Deep Learning icon
    color: 'from-purple-500 to-pink-600',
    estimatedHours: 80,
    skills: ['TensorFlow', 'PyTorch', 'Keras']
  },
  {
    id: 'nlp',
    title: 'Natural Language Processing',
    description: 'Language models and text processing',
    status: 'upcoming',
    duration: '6 weeks',
    difficulty: 'Advanced',
    topics: ['Text Preprocessing', 'BERT', 'GPT', 'Fine-tuning'],
    icon: MessageSquare, // NLP icon
    color: 'from-indigo-500 to-purple-600',
    estimatedHours: 60,
    skills: ['Hugging Face', 'spaCy', 'NLTK'],
    prerequisites: ['deep-learning']
  },
  {
    id: 'computer-vision',
    title: 'Computer Vision',
    description: 'Image processing and visual AI',
    status: 'upcoming',
    duration: '6 weeks',
    difficulty: 'Advanced',
    topics: ['Image Processing', 'Object Detection', 'Segmentation', 'GANs'],
    icon: Globe, // Computer Vision icon
    color: 'from-orange-500 to-red-600',
    estimatedHours: 60,
    skills: ['OpenCV', 'YOLO', 'Stable Diffusion'],
    prerequisites: ['deep-learning']
  },
  {
    id: 'mlops',
    title: 'MLOps & Deployment',
    description: 'Production ML and DevOps',
    status: 'locked',
    duration: '4 weeks',
    difficulty: 'Advanced',
    topics: ['Docker', 'Kubernetes', 'CI/CD', 'Model Monitoring'],
    icon: Cloud, // MLOps icon
    color: 'from-gray-500 to-slate-600',
    estimatedHours: 40,
    skills: ['Docker', 'Kubernetes', 'MLflow'],
    prerequisites: ['deep-learning', 'nlp', 'computer-vision']
  },
  {
    id: 'capstone',
    title: 'Capstone Project',
    description: 'Build your portfolio project',
    status: 'locked',
    duration: '8 weeks',
    difficulty: 'Advanced',
    topics: ['Project Planning', 'Implementation', 'Deployment', 'Presentation'],
    icon: Trophy, // Capstone icon
    color: 'from-yellow-500 to-amber-600',
    estimatedHours: 80,
    skills: ['Full Stack ML', 'Project Management'],
    prerequisites: ['mlops']
  }
];
