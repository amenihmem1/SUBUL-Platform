export interface AwsLab {
  id: string
  title: string
  description: string
  tasks: string[]
  moduleTitle: string
  estimatedTime: string
  difficulty: 'beginner' | 'intermediate'
}

export interface AwsCourseLevel {
  level: 'beginner' | 'intermediate'
  label: string
  description: string
  labs: AwsLab[]
}

export const AWS_EC2_FULL_COURSE = {
  id: 'aws-ec2-basics',
  title: 'AWS EC2 Fundamentals',
  description: 'Master Amazon EC2 instances and deployment fundamentals',
  provider: 'Amazon Web Services',
  certification: 'AWS Solutions Architect',
  levels: [
    {
      level: 'beginner' as const,
      label: 'Niveau Débutant',
      description: 'Introduction aux bases d\'Amazon EC2',
      labs: [
        {
          id: 'aws-account-setup',
          title: 'Create AWS Account',
          description: 'Set up your AWS account and configure basic security settings',
          tasks: [
            'Create AWS Free Tier Account',
            'Configure IAM User and Groups',
            'Set up Multi-Factor Authentication (MFA)',
            'Explore AWS Management Console'
          ] as string[],
          moduleTitle: 'AWS Account Setup',
          estimatedTime: '45 minutes',
          difficulty: 'beginner'
        },
        {
          id: 'ec2-instance-basics',
          title: 'Launch First EC2 Instance',
          description: 'Learn to launch and configure your first EC2 instance',
          tasks: [
            'Choose EC2 Instance Type',
            'Configure Security Groups',
            'Launch EC2 Instance',
            'Connect via SSH'
          ] as string[],
          moduleTitle: 'EC2 Instance Management',
          estimatedTime: '60 minutes',
          difficulty: 'beginner'
        },
        {
          id: 'ec2-storage-volumes',
          title: 'Manage EBS Volumes',
          description: 'Work with Elastic Block Store volumes for persistent storage',
          tasks: [
            'Create EBS Volume',
            'Attach Volume to Instance',
            'Format and Mount Volume',
            'Create Volume Snapshots'
          ] as string[],
          moduleTitle: 'Storage Management',
          estimatedTime: '50 minutes',
          difficulty: 'beginner'
        },
        {
          id: 'ec2-security-groups',
          title: 'Configure Security Groups',
          description: 'Master AWS security groups for network protection',
          tasks: [
            'Understand Security Group Rules',
            'Configure Inbound Rules',
            'Set Up Outbound Rules',
            'Test Security Group Configuration'
          ] as string[],
          moduleTitle: 'Security Configuration',
          estimatedTime: '40 minutes',
          difficulty: 'beginner'
        }
      ]
    },
    {
      level: 'intermediate' as const,
      label: 'Niveau Intermédiaire',
      description: 'Advanced EC2 configurations and optimization',
      labs: [
        {
          id: 'ec2-load-balancing',
          title: 'Set Up Load Balancing',
          description: 'Configure Elastic Load Balancer for high availability',
          tasks: [
            'Create Application Load Balancer',
            'Configure Target Groups',
            'Set Up Health Checks',
            'Test Load Distribution'
          ] as string[],
          moduleTitle: 'High Availability',
          estimatedTime: '75 minutes',
          difficulty: 'intermediate'
        },
        {
          id: 'ec2-auto-scaling',
          title: 'Implement Auto Scaling',
          description: 'Learn to automatically scale EC2 instances based on demand',
          tasks: [
            'Create Auto Scaling Group',
            'Configure Scaling Policies',
            'Set Up CloudWatch Alarms',
            'Test Auto Scaling Behavior'
          ] as string[],
          moduleTitle: 'Scalability',
          estimatedTime: '80 minutes',
          difficulty: 'intermediate'
        },
        {
          id: 'ec2-instance-types',
          title: 'Optimize Instance Types',
          description: 'Choose the right EC2 instance types for different workloads',
          tasks: [
            'Compare Instance Families',
            'Analyze Performance Requirements',
            'Test Different Instance Types',
            'Optimize for Cost and Performance'
          ] as string[],
          moduleTitle: 'Performance Optimization',
          estimatedTime: '65 minutes',
          difficulty: 'intermediate'
        },
        {
          id: 'ec2-monitoring',
          title: 'Monitor EC2 Performance',
          description: 'Set up comprehensive monitoring and alerting for EC2',
          tasks: [
            'Configure CloudWatch Metrics',
            'Set Up Custom Metrics',
            'Create Alarms and Notifications',
            'Monitor Performance Dashboards'
          ] as string[],
          moduleTitle: 'Monitoring & Observability',
          estimatedTime: '70 minutes',
          difficulty: 'intermediate'
        }
      ]
    }
  ]
}
