# AWS EC2 Basics Lab Guide

## Overview
This hands-on lab guide will help you master Amazon EC2 (Elastic Compute Cloud) instances, deployment strategies, and AWS cloud computing fundamentals.

## Prerequisites
- Basic cloud computing knowledge
- Understanding of virtualization concepts
- AWS account (free tier available)
- Modern web browser

## Learning Objectives
- Launch and configure EC2 instances
- Manage security groups and networking
- Deploy applications on EC2
- Monitor and optimize EC2 performance

## Lab Exercises

### Exercise 1: AWS Management Console Navigation
**Duration**: 15 minutes

1. **Sign in to AWS Console**
   - Navigate to https://aws.amazon.com/console/
   - Sign in with your AWS account
   - Explore the AWS Management Console dashboard

2. **Navigate to EC2 Service**
   ```
   - In the search bar, type "EC2"
   - Click on "EC2" under "Compute Services"
   - Familiarize yourself with the EC2 dashboard
   - Review the key sections: Instances, Images, Volumes, Security Groups
   ```

### Exercise 2: Create Key Pair
**Duration**: 10 minutes

1. **Generate Key Pair**
   ```
   - In the EC2 dashboard, click "Key Pairs" in the left navigation
   - Click "Create key pair"
   - Configure:
     * Key pair name: "aws-ec2-lab-key"
     * Key pair type: RSA
     * File format: .pem (for Linux) or .ppk (for Windows)
   - Download and save the key file securely
   ```

2. **Verify Key Pair Creation**
   - Ensure the key pair appears in your list
   - Keep the key file in a secure location

### Exercise 3: Launch EC2 Instance
**Duration**: 30 minutes

1. **Choose AMI (Amazon Machine Image)**
   ```
   - Click "Launch instances"
   - Search for AMI:
     * For Windows: "Windows Server 2022"
     * For Linux: "Ubuntu Server 20.04 LTS"
   - Select the Free Tier eligible AMI
   ```

2. **Configure Instance Details**
   ```
   - Instance type: t2.micro (Free Tier eligible)
   - Network: Default VPC
   - Subnet: Select any available subnet
   - Auto-assign Public IP: Enable
   - IAM role: None (for this lab)
   ```

3. **Add Storage**
   ```
   - Root volume: 8-30 GB (Free Tier limit)
   - Volume type: General Purpose SSD (gp2/gp3)
   - Keep default settings for this lab
   ```

4. **Configure Security Group**
   ```
   - Security group name: "ec2-web-sg"
   - Description: "Security group for web server"
   - Inbound rules:
     * SSH (22) from My IP (for Linux)
     * RDP (3389) from My IP (for Windows)
     * HTTP (80) from Anywhere (0.0.0.0/0)
     * HTTPS (443) from Anywhere (0.0.0.0/0)
   ```

5. **Launch Instance**
   - Select your key pair
   - Click "Launch instances"
   - Wait for instance to initialize (2-5 minutes)

### Exercise 4: Connect to EC2 Instance
**Duration**: 20 minutes

1. **For Linux Instances (SSH)**
   ```
   - Select your instance
   - Click "Connect"
   - Choose "SSH client" tab
   - Use the provided command:
     ssh -i "aws-ec2-lab-key.pem" ubuntu@your-instance-public-ip
   ```

2. **For Windows Instances (RDP)**
   ```
   - Select your instance
   - Click "Connect"
   - Download the RDP file
   - Get the administrator password from the console
   - Connect using RDP client
   ```

3. **Verify Connection**
   - Once connected, run basic commands:
     - Linux: `ls -la`, `uname -a`, `df -h`
     - Windows: `dir`, `systeminfo`, `wmic logicaldisk get size,freespace,caption`

### Exercise 5: Install Web Server
**Duration**: 25 minutes

1. **For Linux (Apache)**
   ```bash
   sudo apt update
   sudo apt install apache2 -y
   sudo systemctl start apache2
   sudo systemctl enable apache2
   sudo ufw allow 'Apache Full'
   echo "<h1>Hello from AWS EC2!</h1>" | sudo tee /var/www/html/index.html
   ```

2. **For Windows (IIS)**
   ```
   - Open PowerShell as Administrator
   - Install-WindowsFeature -name Web-Server -IncludeManagementTools
   - Remove-Item -Path C:\inetpub\wwwroot\iisstart.htm -Force
   - Add-Content -Path C:\inetpub\wwwroot\index.html -Value "<h1>Hello from AWS EC2!</h1>"
   ```

3. **Test Web Server**
   - Open browser: http://your-instance-public-ip
   - Verify the page loads correctly
   - Check server logs if needed

### Exercise 6: Configure Security Groups
**Duration**: 15 minutes

1. **Review Current Rules**
   ```
   - Navigate to "Security Groups"
   - Select your security group
   - Review inbound and outbound rules
   ```

2. **Add Custom Rules**
   ```
   - Add rule for MySQL (3306) from specific IP if needed
   - Add rule for custom application port
   - Test connectivity changes
   ```

3. **Security Best Practices**
   - Remove unnecessary rules
   - Limit SSH/RDP to your IP only
   - Enable flow logs for monitoring

### Exercise 7: Monitor EC2 Performance
**Duration**: 15 minutes

1. **Enable Detailed Monitoring**
   ```
   - Select your instance
   - Click "Actions" → "Monitor and troubleshoot" → "Manage detailed monitoring"
   - Enable CloudWatch detailed monitoring
   ```

2. **View Metrics**
   ```
   - Navigate to "Monitoring" tab
   - Review CPU utilization
   - Check network I/O
   - Monitor disk usage
   ```

3. **Set Up CloudWatch Alarms**
   ```
   - Create alarm for CPU > 80%
   - Configure email notification
   - Test alarm configuration
   ```

### Exercise 8: Create AMI Backup
**Duration**: 10 minutes

1. **Create AMI**
   ```
   - Select your instance
   - Click "Actions" → "Image and templates" → "Create image"
   - Image name: "my-web-server-ami"
   - Description: "AMI for web server with Apache/IIS"
   - Click "Create image"
   ```

2. **Verify AMI Creation**
   - Navigate to "AMIs" section
   - Wait for AMI to become "available"
   - Test launching new instance from AMI

## Cleanup Instructions
**Duration**: 10 minutes

To avoid unnecessary charges, clean up your resources:

1. **Terminate EC2 Instance**
   ```
   - Select your instance
   - Click "Instance state" → "Terminate instance"
   - Confirm termination
   ```

2. **Delete Security Group**
   ```
   - Navigate to "Security Groups"
   - Select your security group
   - Click "Delete security group"
   - Confirm deletion (only if no instances are using it)
   ```

3. **Delete Key Pair (Optional)**
   ```
   - Navigate to "Key Pairs"
   - Select your key pair
   - Click "Delete"
   - Confirm deletion
   ```

4. **Delete AMI (Optional)**
   ```
   - Navigate to "AMIs"
   - Select your AMI
   - Click "Deregister AMI"
   - Also delete associated snapshots
   ```

## Additional Resources
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)

## Troubleshooting

### Common Issues
1. **Connection Failures**
   - Check security group rules
   - Verify key pair permissions
   - Ensure instance is running

2. **Performance Issues**
   - Monitor CloudWatch metrics
   - Check instance type suitability
   - Review resource utilization

3. **Access Denied Errors**
   - Verify IAM permissions
   - Check key pair ownership
   - Review security group configurations

## Certification Information
After completing this lab, you'll be prepared for:
- AWS Certified Cloud Practitioner (CLF-C01)
- AWS Certified Solutions Architect - Associate (SAA-C03)

## Support
If you encounter issues during this lab:
- Check AWS Service Health Dashboard
- Review AWS documentation
- Contact AWS Support

---

**Lab Duration**: Approximately 1.5 hours  
**Difficulty Level**: Beginner  
**Estimated Cost**: Free tier usage (may incur minimal charges for data transfer)

*Last Updated: February 2026*
