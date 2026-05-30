# Image Processor - Deployment Guide

This guide covers deploying the Image Processor service to various cloud platforms and environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker](#docker)
3. [AWS Deployment](#aws-deployment)
4. [Azure Deployment](#azure-deployment)
5. [Google Cloud Deployment](#google-cloud-deployment)
6. [Kubernetes](#kubernetes)

---

## Local Development

### Quick Start

```bash
# Clone/setup project
cd "Individual Project"

# Run setup script
chmod +x setup.sh
./setup.sh

# Start backend
cd backend
npm run dev

# In another terminal, start demo
cd demo
npx http-server
```

### Environment Configuration

Create `backend/.env`:
```env
PORT=3000
NODE_ENV=development
STORAGE_PATH=./uploads
MAX_FILE_SIZE=50mb
FILE_RETENTION_HOURS=24
```

---

## Docker

### Build Image

```bash
# Build the image
docker build -t image-processor:latest ./backend

# Tag for registry
docker tag image-processor:latest myregistry.azurecr.io/image-processor:latest
```

### Run Locally

```bash
# Simple run
docker run -p 3000:3000 \
  -v ./uploads:/app/uploads \
  image-processor:latest

# With docker-compose
docker-compose up

# With environment file
docker run -p 3000:3000 \
  --env-file ./backend/.env \
  -v ./uploads:/app/uploads \
  image-processor:latest
```

### Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f api

# Access:
# - API: http://localhost:3000/api
# - Web UI: http://localhost:8080
```

---

## AWS Deployment

### Prerequisites

- AWS Account
- AWS CLI configured
- ECR repository created
- EC2 key pair for access

### Option 1: ECS Fargate (Recommended)

#### 1. Push to ECR

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t image-processor:latest ./backend
docker tag image-processor:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/image-processor:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/image-processor:latest
```

#### 2. Create ECS Task Definition

```json
{
  "family": "image-processor",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/image-processor:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/image-processor",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 3. Create ECS Service

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/image-processor

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS cluster
aws ecs create-cluster --cluster-name image-processor-cluster

# Create service
aws ecs create-service \
  --cluster image-processor-cluster \
  --service-name image-processor-service \
  --task-definition image-processor:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=3000
```

#### 4. Setup Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name image-processor-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx

# Create target group
aws elbv2 create-target-group \
  --name image-processor-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --health-check-path /api/status/health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

### Option 2: Lambda with API Gateway

```bash
# Package function
zip -r function.zip backend/src backend/node_modules

# Create Lambda function
aws lambda create-function \
  --function-name image-processor \
  --runtime nodejs18.x \
  --role arn:aws:iam::account-id:role/lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip

# Create API Gateway
# (Use AWS Console or serverless framework)
```

### Storage: S3

```bash
# Create S3 bucket
aws s3 mb s3://image-processor-files-prod

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket image-processor-files-prod \
  --versioning-configuration Status=Enabled

# Set lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket image-processor-files-prod \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json:**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldImages",
      "Status": "Enabled",
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

---

## Azure Deployment

### Prerequisites

- Azure Account
- Azure CLI installed
- Container Registry created

### 1. Push to Azure Container Registry

```bash
# Login to ACR
az acr login --name <registry-name>

# Build and push
az acr build --registry <registry-name> \
  --image image-processor:latest \
  ./backend

# List images
az acr repository list --name <registry-name>
```

### 2. Deploy to Container Instances

```bash
# Deploy container instance
az container create \
  --resource-group <resource-group> \
  --name image-processor \
  --image <registry-name>.azurecr.io/image-processor:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server <registry-name>.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000

# Get container logs
az container logs \
  --resource-group <resource-group> \
  --name image-processor
```

### 3. Deploy to App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name image-processor-plan \
  --resource-group <resource-group> \
  --sku B1 \
  --is-linux

# Create App Service
az webapp create \
  --resource-group <resource-group> \
  --plan image-processor-plan \
  --name image-processor-app \
  --deployment-container-image-name \
  <registry-name>.azurecr.io/image-processor:latest

# Configure app service
az webapp config appsettings set \
  --resource-group <resource-group> \
  --name image-processor-app \
  --settings NODE_ENV=production PORT=3000
```

### 4. Setup Blob Storage

```bash
# Create storage account
az storage account create \
  --name imageprocessorstorage \
  --resource-group <resource-group> \
  --location eastus

# Create blob container
az storage container create \
  --account-name imageprocessorstorage \
  --name processed-images
```

---

## Google Cloud Deployment

### Prerequisites

- Google Cloud Account
- gcloud CLI installed
- Project created

### 1. Push to Container Registry

```bash
# Configure gcloud
gcloud config set project <project-id>

# Build image
gcloud builds submit \
  --tag gcr.io/<project-id>/image-processor:latest \
  ./backend

# List images
gcloud container images list
```

### 2. Deploy to Cloud Run

```bash
# Deploy
gcloud run deploy image-processor \
  --image gcr.io/<project-id>/image-processor:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production,PORT=3000 \
  --allow-unauthenticated

# Get service URL
gcloud run services describe image-processor \
  --platform managed \
  --region us-central1
```

### 3. Setup Cloud Storage

```bash
# Create bucket
gsutil mb gs://<project-id>-image-processor

# Set lifecycle policy
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 1}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://<project-id>-image-processor
```

---

## Kubernetes

### 1. Create Deployment

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-processor
  labels:
    app: image-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: image-processor
  template:
    metadata:
      labels:
        app: image-processor
    spec:
      containers:
      - name: api
        image: myregistry.azurecr.io/image-processor:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/status/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/status/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Create Service

**service.yaml:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: image-processor-service
spec:
  type: LoadBalancer
  selector:
    app: image-processor
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### 3. Deploy

```bash
# Create namespace
kubectl create namespace image-processor

# Apply configurations
kubectl apply -f deployment.yaml -n image-processor
kubectl apply -f service.yaml -n image-processor

# Check status
kubectl get deployments -n image-processor
kubectl get services -n image-processor
kubectl logs -f -n image-processor deployment/image-processor

# Scale deployment
kubectl scale deployment image-processor --replicas 5 -n image-processor
```

---

## Monitoring & Observability

### CloudWatch (AWS)

```bash
# View logs
aws logs tail /ecs/image-processor --follow

# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name image-processor-high-error-rate \
  --alarm-description "Alert if error rate > 5%" \
  --metric-name ErrorRate \
  --namespace ImageProcessor \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Application Insights (Azure)

```bash
# Create app insights resource
az monitor app-insights component create \
  --app image-processor-insights \
  --location eastus \
  --resource-group <resource-group>

# Link to app service
az webapp config appsettings set \
  --name image-processor-app \
  --resource-group <resource-group> \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=<key>
```

---

## Rollback & Updates

### Rolling Update (Kubernetes)

```bash
# Update image
kubectl set image deployment/image-processor \
  image-processor=myregistry.azurecr.io/image-processor:v2 \
  -n image-processor

# Check rollout status
kubectl rollout status deployment/image-processor -n image-processor

# Rollback if needed
kubectl rollout undo deployment/image-processor -n image-processor
```

### Blue-Green Deployment

```bash
# Deploy new version (green)
kubectl apply -f deployment-v2.yaml

# Test green deployment
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://image-processor-v2-service

# Switch traffic
kubectl patch service image-processor-service \
  -p '{"spec":{"selector":{"version":"v2"}}}'

# Remove old version
kubectl delete deployment image-processor-v1
```

---

## Cost Optimization

### Recommendations

1. **Use container instances for development** (AWS: EC2, Azure: Container Instances)
2. **Scheduled scaling** - Reduce capacity during off-hours
3. **Reserved instances** - For production environments
4. **Storage lifecycle** - Auto-delete old files
5. **Caching** - Redis for common operations
6. **CDN** - CloudFront/Azure CDN for image delivery

### Auto-scaling

**AWS ECS:**
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/image-processor-cluster/image-processor-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10
```

---

## Security Best Practices

1. Use private registries for container images
2. Enable HTTPS/TLS for all communications
3. Set environment variables for secrets (not in code)
4. Restrict network access with security groups
5. Regular security updates
6. Monitor access logs
7. Use managed services for databases
8. Encrypt data at rest

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs <container-id>

# Or in Kubernetes
kubectl logs -f <pod-name> -n image-processor
```

### Out of memory

```bash
# Increase memory limits
# Check current usage
docker stats

# Increase in deployment config
```

### Storage issues

```bash
# Check disk usage
df -h

# Check S3/Blob storage quotas
# Implement auto-cleanup in code
```

---

## Support

For deployment issues:
- Check cloud provider documentation
- Review application logs
- Verify environment configuration
- Test locally before deploying
- Use health checks to verify deployment

---

**Last Updated:** May 2024
