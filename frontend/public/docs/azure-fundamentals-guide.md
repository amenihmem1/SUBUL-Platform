# Azure Fundamentals Lab Guide

## Overview
This hands-on lab guide will help you learn the fundamentals of Microsoft Azure cloud platform. You'll work with core Azure services, understand cloud architecture, and implement best practices.

## Prerequisites
- Basic understanding of cloud computing concepts
- Familiarity with IT infrastructure
- Azure account (free tier available)
- Modern web browser

## Learning Objectives
- Understand Azure core services and architecture
- Learn to create and manage Azure resources
- Implement basic security and networking
- Monitor and optimize Azure resources

## Lab Exercises

### Exercise 1: Azure Portal Navigation
**Duration**: 15 minutes

1. **Sign in to Azure Portal**
   - Navigate to https://portal.azure.com
   - Sign in with your Azure account
   - Explore the dashboard and main navigation

2. **Explore the Azure Interface**
   - Familiarize yourself with the Azure Portal layout
   - Locate the search bar and resource groups
   - Understand the different service categories

### Exercise 2: Create Resource Group
**Duration**: 20 minutes

1. **Create a Resource Group**
   ```
   - Click "Create a resource" → "Resource Group"
   - Fill in the details:
     * Resource group name: "rg-azure-fundamentals-lab"
     * Region: Select your nearest region
     * Click "Review + create"
     * Click "Create"
   ```

2. **Verify Resource Group Creation**
   - Navigate to your resource group
   - Verify it appears in the resource list
   - Note the resource group ID for future reference

### Exercise 3: Deploy Virtual Machine
**Duration**: 30 minutes

1. **Create a Virtual Machine**
   ```
   - In your resource group, click "Create a resource"
   - Search for "Virtual Machine" and select it
   - Configure the VM:
     * VM name: "vm-web-server-01"
     * Region: Same as your resource group
     * Image: Windows Server 2022 or Ubuntu 20.04
     * Size: Standard_B1s (or similar low-cost option)
     * Authentication type: Password
     * Create username and password
   ```

2. **Configure Networking**
   ```
   - Review the networking configuration
   - Ensure public IP is assigned
   - Configure security group to allow:
     * RDP (3389) for Windows or SSH (22) for Linux
     * HTTP (80) for web access
   ```

3. **Complete VM Deployment**
   - Review all settings
   - Click "Create" and wait for deployment
   - Connect to your VM once deployed

### Exercise 4: Storage Account Setup
**Duration**: 25 minutes

1. **Create Storage Account**
   ```
   - In your resource group, click "Create a resource"
   - Search for "Storage Account"
   - Configure:
     * Storage account name: (unique name)
     * Performance: Standard
     * Redundancy: Locally-redundant storage (LRS)
   ```

2. **Create Blob Container**
   ```
   - Navigate to your storage account
   - Create a container named "web-content"
   - Upload a simple HTML file
   - Note the blob URL for access
   ```

### Exercise 5: Basic Networking
**Duration**: 20 minutes

1. **Explore Virtual Network**
   ```
   - Navigate to your VM's virtual network
   - Review the network topology
   - Examine the subnet configuration
   - Check the network security group rules
   ```

2. **Configure Network Security**
   ```
   - Add additional NSG rules if needed
   - Test connectivity to your VM
   - Verify web access if applicable
   ```

### Exercise 6: Monitoring and Alerts
**Duration**: 15 minutes

1. **Enable Monitoring**
   ```
   - Navigate to your VM
   - Go to "Monitoring" → "Metrics"
   - View CPU, memory, and disk usage
   - Enable basic monitoring if not already active
   ```

2. **Set Up Alerts**
   ```
   - Create an alert rule for high CPU usage
   - Configure email notification
   - Test the alert configuration
   ```

## Cleanup Instructions
**Duration**: 10 minutes

To avoid unnecessary charges, clean up your resources:

1. **Delete Virtual Machine**
   - Navigate to your VM
   - Click "Delete" and confirm

2. **Delete Storage Account**
   - Navigate to your storage account
   - Click "Delete" and confirm

3. **Delete Resource Group**
   - Navigate to your resource group
   - Click "Delete resource group"
   - Type the resource group name to confirm
   - Click "Delete"

## Additional Resources
- [Azure Documentation](https://docs.microsoft.com/en-us/azure/)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/)

## Troubleshooting

### Common Issues
1. **Deployment Failures**
   - Check resource quotas
   - Verify region availability
   - Review error messages in Azure Portal

2. **Connection Issues**
   - Verify NSG rules
   - Check public IP configuration
   - Ensure VM is running

3. **Performance Issues**
   - Monitor resource utilization
   - Consider upgrading VM size
   - Review storage performance

## Certification Information
After completing this lab, you'll be prepared for:
- Microsoft Certified: Azure Fundamentals (AZ-900)
- Microsoft Certified: Azure Administrator Associate (AZ-104)

## Support
If you encounter issues during this lab:
- Check Azure Service Health
- Review Azure documentation
- Contact Azure support through the portal

---

**Lab Duration**: Approximately 2 hours  
**Difficulty Level**: Beginner  
**Estimated Cost**: Free tier usage (may incur minimal charges)

*Last Updated: February 2026*
