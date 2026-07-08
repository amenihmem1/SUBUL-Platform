# NVIDIA GPU Computing Lab Guide

## Overview
This hands-on lab guide introduces you to GPU computing with NVIDIA, covering parallel computing concepts, CUDA programming basics, and GPU-accelerated workloads.

## Prerequisites
- Programming experience (Python or C++)
- Understanding of computer architecture
- NVIDIA developer account
- Access to GPU-enabled environment (NVIDIA Cloud Gaming, DGX Cloud, or local GPU)
- Modern web browser

## Learning Objectives
- Understand GPU architecture and parallel computing
- Learn CUDA programming basics
- Optimize workloads for GPU acceleration
- Deploy GPU-accelerated applications

## Lab Exercises

### Exercise 1: GPU Architecture Overview
**Duration**: 30 minutes

1. **Understanding GPU vs CPU Architecture**
   ```
   - CPU: Few powerful cores optimized for serial processing
   - GPU: Thousands of smaller cores optimized for parallel processing
   - Memory hierarchy differences
   - Thread execution model
   ```

2. **NVIDIA GPU Architecture**
   ```
   - CUDA Cores: Basic processing units
   - Streaming Multiprocessors (SMs): Groups of CUDA cores
   - Memory types: Global, Shared, Constant, Texture
   - Warp execution: 32 threads executing together
   ```

3. **Access NVIDIA GPU Resources**
   - Navigate to NVIDIA Cloud Gaming or DGX Cloud
   - Set up your GPU environment
   - Verify GPU availability and specifications

### Exercise 2: CUDA Environment Setup
**Duration**: 25 minutes

1. **Install CUDA Toolkit**
   ```
   # For Linux systems
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-ubuntu2004.pin
   sudo mv cuda-ubuntu2004.pin /etc/apt/preferences.d/cuda-repository-pin-600
   wget https://developer.download.nvidia.com/compute/cuda/12.3.1/local_installers/cuda-repo-ubuntu2004-12-3-local_12.3.1-545.23.06-1_amd64.deb
   sudo dpkg -i cuda-repo-ubuntu2004-12-3-local_12.3.1-545.23.06-1_amd64.deb
   sudo cp /var/cuda-repo-ubuntu2004-12-3-local/cuda-*-keyring.gpg /usr/share/keyrings/
   sudo apt-get update
   sudo apt-get -y install cuda
   ```

2. **Verify CUDA Installation**
   ```bash
   nvidia-smi
   nvcc --version
   ```

3. **Set up Python Environment**
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   pip install numba cupy-cuda11x
   ```

### Exercise 3: Basic CUDA Programming (C++)
**Duration**: 45 minutes

1. **Hello World CUDA Program**
   ```cpp
   #include <iostream>
   #include <cuda_runtime.h>

   __global__ void hello_cuda() {
       printf("Hello from thread %d in block %d!\n", threadIdx.x, blockIdx.x);
   }

   int main() {
       // Launch kernel with 256 threads in 1 block
       hello_cuda<<<1, 256>>>();
       
       // Wait for GPU to finish
       cudaDeviceSynchronize();
       
       printf("CUDA program completed!\n");
       return 0;
   }
   ```

2. **Vector Addition Example**
   ```cpp
   #include <iostream>
   #include <cuda_runtime.h>

   __global__ void vectorAdd(float *a, float *b, float *c, int n) {
       int idx = blockIdx.x * blockDim.x + threadIdx.x;
       if (idx < n) {
           c[idx] = a[idx] + b[idx];
       }
   }

   int main() {
       int n = 1000000;
       size_t size = n * sizeof(float);
       
       // Allocate host memory
       float *h_a = (float*)malloc(size);
       float *h_b = (float*)malloc(size);
       float *h_c = (float*)malloc(size);
       
       // Initialize arrays
       for (int i = 0; i < n; i++) {
           h_a[i] = i;
           h_b[i] = i * 2;
       }
       
       // Allocate device memory
       float *d_a, *d_b, *d_c;
       cudaMalloc(&d_a, size);
       cudaMalloc(&d_b, size);
       cudaMalloc(&d_c, size);
       
       // Copy data to device
       cudaMemcpy(d_a, h_a, size, cudaMemcpyHostToDevice);
       cudaMemcpy(d_b, h_b, size, cudaMemcpyHostToDevice);
       
       // Launch kernel
       int threadsPerBlock = 256;
       int blocksPerGrid = (n + threadsPerBlock - 1) / threadsPerBlock;
       vectorAdd<<<blocksPerGrid, threadsPerBlock>>>(d_a, d_b, d_c, n);
       
       // Copy result back to host
       cudaMemcpy(h_c, d_c, size, cudaMemcpyDeviceToHost);
       
       // Verify result
       for (int i = 0; i < 10; i++) {
           printf("%f + %f = %f\n", h_a[i], h_b[i], h_c[i]);
       }
       
       // Free memory
       free(h_a); free(h_b); free(h_c);
       cudaFree(d_a); cudaFree(d_b); cudaFree(d_c);
       
       return 0;
   }
   ```

3. **Compile and Run**
   ```bash
   nvcc -o vector_add vector_add.cu
   ./vector_add
   ```

### Exercise 4: GPU Programming with Python
**Duration**: 40 minutes

1. **Numba CUDA Acceleration**
   ```python
   from numba import cuda
   import numpy as np
   import time

   @cuda.jit
   def vector_add_gpu(a, b, c):
       idx = cuda.grid(1)
       if idx < a.size:
           c[idx] = a[idx] + b[idx]

   def vector_add_cpu(a, b):
       return a + b

   # Test data
   n = 1000000
   a = np.random.rand(n).astype(np.float32)
   b = np.random.rand(n).astype(np.float32)
   c_gpu = np.zeros_like(a)
   c_cpu = np.zeros_like(a)

   # CPU version
   start = time.time()
   vector_add_cpu(a, b)
   cpu_time = time.time() - start

   # GPU version
   threads_per_block = 256
   blocks_per_grid = (n + threads_per_block - 1) // threads_per_block
   start = time.time()
   vector_add_gpu[blocks_per_grid, threads_per_block](a, b, c_gpu)
   cuda.synchronize()
   gpu_time = time.time() - start

   print(f"CPU time: {cpu_time:.6f} seconds")
   print(f"GPU time: {gpu_time:.6f} seconds")
   print(f"Speedup: {cpu_time/gpu_time:.2f}x")
   ```

2. **PyTorch GPU Operations**
   ```python
   import torch
   import time

   # Check CUDA availability
   print(f"CUDA available: {torch.cuda.is_available()}")
   if torch.cuda.is_available():
       print(f"GPU device: {torch.cuda.get_device_name(0)}")

   # Create tensors
   size = 10000000
   a_cpu = torch.randn(size)
   b_cpu = torch.randn(size)

   # CPU computation
   start = time.time()
   c_cpu = torch.matmul(a_cpu, b_cpu)
   cpu_time = time.time() - start

   # GPU computation
   if torch.cuda.is_available():
       a_gpu = a_cpu.cuda()
       b_gpu = b_cpu.cuda()
       
       start = time.time()
       c_gpu = torch.matmul(a_gpu, b_gpu)
       cuda.synchronize()
       gpu_time = time.time() - start
       
       print(f"CPU time: {cpu_time:.6f} seconds")
       print(f"GPU time: {gpu_time:.6f} seconds")
       print(f"Speedup: {cpu_time/gpu_time:.2f}x")
   ```

### Exercise 5: Matrix Operations Optimization
**Duration**: 35 minutes

1. **Matrix Multiplication Comparison**
   ```python
   import numpy as np
   import cupy as cp
   import time

   # Create matrices
   size = 2000
   A = np.random.rand(size, size).astype(np.float32)
   B = np.random.rand(size, size).astype(np.float32)

   # NumPy (CPU)
   start = time.time()
   C_numpy = np.dot(A, B)
   numpy_time = time.time() - start

   # CuPy (GPU)
   A_gpu = cp.asarray(A)
   B_gpu = cp.asarray(B)
   start = time.time()
   C_gpu = cp.dot(A_gpu, B_gpu)
   cp.cuda.Stream.null.synchronize()
   cupy_time = time.time() - start

   print(f"NumPy time: {numpy_time:.4f} seconds")
   print(f"CuPy time: {cupy_time:.4f} seconds")
   print(f"Speedup: {numpy_time/cupy_time:.2f}x")
   ```

2. **Memory Management**
   ```python
   # Efficient GPU memory usage
   def process_large_dataset():
       # Process data in chunks to avoid memory overflow
       chunk_size = 1000000
       total_size = 10000000
       
       for i in range(0, total_size, chunk_size):
           chunk = np.random.rand(chunk_size, 100).astype(np.float32)
           chunk_gpu = cp.asarray(chunk)
           
           # Process chunk on GPU
           result = cp.sum(chunk_gpu, axis=1)
           
           # Move result back to CPU if needed
           result_cpu = cp.asnumpy(result)
           
           # Clear GPU memory
           del chunk_gpu, result
           cp.get_default_memory_pool().free_all_blocks()
   ```

### Exercise 6: Deep Learning with GPU
**Duration**: 30 minutes

1. **Simple Neural Network**
   ```python
   import torch
   import torch.nn as nn
   import torch.optim as optim

   # Define neural network
   class SimpleNet(nn.Module):
       def __init__(self):
           super(SimpleNet, self).__init__()
           self.fc1 = nn.Linear(784, 128)
           self.fc2 = nn.Linear(128, 64)
           self.fc3 = nn.Linear(64, 10)
           self.relu = nn.ReLU()
           
       def forward(self, x):
           x = self.relu(self.fc1(x))
           x = self.relu(self.fc2(x))
           x = self.fc3(x)
           return x

   # Initialize network and move to GPU
   device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
   model = SimpleNet().to(device)
   
   # Generate dummy data
   batch_size = 64
   input_size = 784
   data = torch.randn(batch_size, input_size).to(device)
   target = torch.randint(0, 10, (batch_size,)).to(device)

   # Training step
   criterion = nn.CrossEntropyLoss()
   optimizer = optim.Adam(model.parameters(), lr=0.001)

   start = time.time()
   for epoch in range(100):
       optimizer.zero_grad()
       output = model(data)
       loss = criterion(output, target)
       loss.backward()
       optimizer.step()
   training_time = time.time() - start

   print(f"Training time: {training_time:.4f} seconds")
   print(f"GPU Memory Used: {torch.cuda.memory_allocated()/1024**2:.2f} MB")
   ```

### Exercise 7: Performance Monitoring
**Duration**: 20 minutes

1. **GPU Monitoring Tools**
   ```bash
   # Real-time GPU monitoring
   watch -n 1 nvidia-smi

   # Detailed GPU information
   nvidia-smi -q

   # Process-specific monitoring
   nvidia-smi pmon -s u -o T
   ```

2. **Python Performance Monitoring**
   ```python
   import torch
   import time

   def benchmark_gpu_operation():
       device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
       
       # Warm up GPU
       for _ in range(10):
           _ = torch.randn(1000, 1000).to(device)
       
       # Benchmark
       torch.cuda.synchronize()
       start = time.time()
       
       for _ in range(100):
           a = torch.randn(1000, 1000).to(device)
           b = torch.randn(1000, 1000).to(device)
           c = torch.matmul(a, b)
       
       torch.cuda.synchronize()
       end = time.time()
       
       print(f"GPU benchmark: {end - start:.4f} seconds")
       print(f"GPU Memory: {torch.cuda.memory_allocated()/1024**2:.2f} MB")
       print(f"GPU Utilization: {torch.cuda.utilization()}%")
   ```

## Cleanup Instructions
**Duration**: 5 minutes

1. **Clear GPU Memory**
   ```python
   import torch
   import cupy as cp
   
   # PyTorch
   torch.cuda.empty_cache()
   
   # CuPy
   cp.get_default_memory_pool().free_all_blocks()
   cp.get_default_pinned_memory_pool().free_all_blocks()
   ```

2. **Terminate GPU Sessions**
   - Log out of NVIDIA Cloud Gaming/DGX Cloud
   - Stop any running GPU processes
   - Release allocated GPU resources

## Additional Resources
- [NVIDIA CUDA Documentation](https://docs.nvidia.com/cuda/)
- [NVIDIA Developer Zone](https://developer.nvidia.com/)
- [PyTorch GPU Guide](https://pytorch.org/docs/stable/notes/cuda.html)
- [CuPy Documentation](https://docs.cupy.dev/en/stable/)

## Troubleshooting

### Common Issues
1. **CUDA Out of Memory**
   - Reduce batch size
   - Process data in chunks
   - Clear GPU memory regularly

2. **Compilation Errors**
   - Check CUDA toolkit version compatibility
   - Verify GPU architecture support
   - Update GPU drivers

3. **Performance Issues**
   - Profile GPU utilization
   - Check memory transfer bottlenecks
   - Optimize thread block size

## Certification Information
After completing this lab, you'll be prepared for:
- NVIDIA Certified Associate - AI
- NVIDIA Certified Professional - Data Science

## Support
If you encounter issues during this lab:
- Check NVIDIA developer forums
- Review CUDA documentation
- Contact NVIDIA developer support

---

**Lab Duration**: Approximately 3 hours  
**Difficulty Level**: Intermediate  
**Estimated Cost**: Varies by GPU provider (typically $1-5/hour)

*Last Updated: February 2026*
