"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecr = require("aws-cdk-lib/aws-ecr");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const logs = require("aws-cdk-lib/aws-logs");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const acm = require("aws-cdk-lib/aws-certificatemanager");
class ComputeStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // ECR Repository
        const repository = new ecr.Repository(this, 'LootProtocolRepo', {
            repositoryName: 'lootprotocol',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
        });
        // ECS Cluster
        const cluster = new ecs.Cluster(this, 'LootProtocolCluster', {
            vpc: props.vpc,
            clusterName: 'lootprotocol-cluster',
        });
        // Log group
        const logGroup = new logs.LogGroup(this, 'LootProtocolLogs', {
            logGroupName: '/ecs/lootprotocol',
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'LootProtocolTask', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        // Grant S3 access to the task
        props.bucket.grantReadWrite(taskDefinition.taskRole);
        // Import DB secret — RDS stores individual fields (username, password, host, port, dbname)
        const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(this, 'DbSecret', props.dbSecretArn);
        dbSecret.grantRead(taskDefinition.taskRole);
        // Container
        const container = taskDefinition.addContainer('lootprotocol', {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'lootprotocol',
                logGroup,
            }),
            environment: {
                NODE_ENV: 'production',
                S3_BUCKET: props.bucketName,
                S3_REGION: cdk.Aws.REGION,
                COGNITO_USER_POOL_ID: props.cognitoUserPoolId,
                COGNITO_CLIENT_ID: props.cognitoClientId,
                COGNITO_DOMAIN: props.cognitoDomain,
                NEXT_PUBLIC_APP_URL: `https://${props.domainName}`,
                NEXT_PUBLIC_API_URL: `https://${props.domainName}/api`,
                // DB connection string built from RDS secret fields at container startup
                DB_HOST: props.dbEndpoint,
                DB_PORT: props.dbPort,
                DB_NAME: 'lootprotocol',
            },
            secrets: {
                DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
                DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
            },
        });
        container.addPortMappings({
            containerPort: 3000,
            protocol: ecs.Protocol.TCP,
        });
        // ECS Service
        this.service = new ecs.FargateService(this, 'LootProtocolService', {
            cluster,
            taskDefinition,
            desiredCount: 1, // MVP
            serviceName: 'lootprotocol-service',
            securityGroups: [props.ecsSecurityGroup],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            circuitBreaker: {
                rollback: true,
            },
        });
        // Application Load Balancer
        this.alb = new elbv2.ApplicationLoadBalancer(this, 'LootProtocolAlb', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: props.albSecurityGroup,
        });
        // HTTP listener — redirect to HTTPS
        this.alb.addListener('HttpListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
            }),
        });
        // HTTPS listener
        const certificate = props.certificateArn
            ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
            : new acm.Certificate(this, 'Certificate', {
                domainName: props.domainName,
                subjectAlternativeNames: [`*.${props.domainName}`],
                validation: acm.CertificateValidation.fromDns(),
            });
        const httpsListener = this.alb.addListener('HttpsListener', {
            port: 443,
            certificates: [certificate],
            defaultAction: elbv2.ListenerAction.fixedResponse(503, {
                contentType: 'text/plain',
                messageBody: 'Service Unavailable',
            }),
        });
        // Target group with health check
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'LootProtocolTargetGroup', {
            vpc: props.vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targets: [this.service],
            healthCheck: {
                path: '/api/health',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyHttpCodes: '200',
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
        });
        httpsListener.addTargetGroups('LootProtocolTarget', {
            targetGroups: [targetGroup],
        });
        // Outputs
        new cdk.CfnOutput(this, 'AlbDnsName', {
            value: this.alb.loadBalancerDnsName,
            description: 'ALB DNS name',
        });
        new cdk.CfnOutput(this, 'EcrRepositoryUri', {
            value: repository.repositoryUri,
            description: 'ECR repository URI',
        });
    }
}
exports.ComputeStack = ComputeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9jb21wdXRlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyxnRUFBZ0U7QUFDaEUsNkNBQTZDO0FBQzdDLGlFQUFpRTtBQUNqRSwwREFBMEQ7QUFvQjFELE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsaUJBQWlCO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDOUQsY0FBYyxFQUFFLGNBQWM7WUFDOUIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxhQUFhLEVBQUUsSUFBSTtTQUNwQixDQUFDLENBQUM7UUFFSCxjQUFjO1FBQ2QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUMzRCxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsc0JBQXNCO1NBQ3BDLENBQUMsQ0FBQztRQUVILFlBQVk7UUFDWixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzNELFlBQVksRUFBRSxtQkFBbUI7WUFDakMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUztZQUN2QyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLGNB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STtZQUN4QyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLFdBQVcsRUFBRTtnQkFDWCxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDaEMsZ0JBQWdCLEVBQUUsS0FBSztnQkFDdkIscUJBQXFCLEVBQUUsQ0FBQztnQkFDeEIsdUJBQXVCLEVBQUUsQ0FBQzthQUMzQjtTQUNGLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUU7WUFDbEQsWUFBWSxFQUFFLENBQUMsV0FBVyxDQUFDO1NBQzVCLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7WUFDbkMsV0FBVyxFQUFFLGNBQWM7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsVUFBVSxDQUFDLGFBQWE7WUFDL0IsV0FBVyxFQUFFLG9CQUFvQjtTQUNsQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF4SkQsb0NBd0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuaW50ZXJmYWNlIENvbXB1dGVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICB2cGM6IGVjMi5WcGM7XG4gIGFsYlNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xuICBlY3NTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcbiAgZGJFbmRwb2ludDogc3RyaW5nO1xuICBkYlBvcnQ6IHN0cmluZztcbiAgZGJTZWNyZXRBcm46IHN0cmluZztcbiAgYnVja2V0TmFtZTogc3RyaW5nO1xuICBidWNrZXQ6IHMzLkJ1Y2tldDtcbiAgY29nbml0b1VzZXJQb29sSWQ6IHN0cmluZztcbiAgY29nbml0b0NsaWVudElkOiBzdHJpbmc7XG4gIGNvZ25pdG9Eb21haW46IHN0cmluZztcbiAgZG9tYWluTmFtZTogc3RyaW5nO1xuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIENvbXB1dGVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhbGI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xuICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb21wdXRlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gRUNSIFJlcG9zaXRvcnlcbiAgICBjb25zdCByZXBvc2l0b3J5ID0gbmV3IGVjci5SZXBvc2l0b3J5KHRoaXMsICdMb290UHJvdG9jb2xSZXBvJywge1xuICAgICAgcmVwb3NpdG9yeU5hbWU6ICdsb290cHJvdG9jb2wnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGVtcHR5T25EZWxldGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBFQ1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ0xvb3RQcm90b2NvbENsdXN0ZXInLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIGNsdXN0ZXJOYW1lOiAnbG9vdHByb3RvY29sLWNsdXN0ZXInLFxuICAgIH0pO1xuXG4gICAgLy8gTG9nIGdyb3VwXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTG9vdFByb3RvY29sTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9lY3MvbG9vdHByb3RvY29sJyxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBUYXNrIERlZmluaXRpb25cbiAgICBjb25zdCB0YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdMb290UHJvdG9jb2xUYXNrJywge1xuICAgICAgbWVtb3J5TGltaXRNaUI6IDUxMixcbiAgICAgIGNwdTogMjU2LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgUzMgYWNjZXNzIHRvIHRoZSB0YXNrXG4gICAgcHJvcHMuYnVja2V0LmdyYW50UmVhZFdyaXRlKHRhc2tEZWZpbml0aW9uLnRhc2tSb2xlKTtcblxuICAgIC8vIEltcG9ydCBEQiBzZWNyZXQg4oCUIFJEUyBzdG9yZXMgaW5kaXZpZHVhbCBmaWVsZHMgKHVzZXJuYW1lLCBwYXNzd29yZCwgaG9zdCwgcG9ydCwgZGJuYW1lKVxuICAgIGNvbnN0IGRiU2VjcmV0ID0gc2VjcmV0c21hbmFnZXIuU2VjcmV0LmZyb21TZWNyZXRDb21wbGV0ZUFybih0aGlzLCAnRGJTZWNyZXQnLCBwcm9wcy5kYlNlY3JldEFybik7XG4gICAgZGJTZWNyZXQuZ3JhbnRSZWFkKHRhc2tEZWZpbml0aW9uLnRhc2tSb2xlKTtcblxuICAgIC8vIENvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignbG9vdHByb3RvY29sJywge1xuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tRWNyUmVwb3NpdG9yeShyZXBvc2l0b3J5KSxcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICBzdHJlYW1QcmVmaXg6ICdsb290cHJvdG9jb2wnLFxuICAgICAgICBsb2dHcm91cCxcbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgUzNfQlVDS0VUOiBwcm9wcy5idWNrZXROYW1lLFxuICAgICAgICBTM19SRUdJT046IGNkay5Bd3MuUkVHSU9OLFxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogcHJvcHMuY29nbml0b1VzZXJQb29sSWQsXG4gICAgICAgIENPR05JVE9fQ0xJRU5UX0lEOiBwcm9wcy5jb2duaXRvQ2xpZW50SWQsXG4gICAgICAgIENPR05JVE9fRE9NQUlOOiBwcm9wcy5jb2duaXRvRG9tYWluLFxuICAgICAgICBORVhUX1BVQkxJQ19BUFBfVVJMOiBgaHR0cHM6Ly8ke3Byb3BzLmRvbWFpbk5hbWV9YCxcbiAgICAgICAgTkVYVF9QVUJMSUNfQVBJX1VSTDogYGh0dHBzOi8vJHtwcm9wcy5kb21haW5OYW1lfS9hcGlgLFxuICAgICAgICAvLyBEQiBjb25uZWN0aW9uIHN0cmluZyBidWlsdCBmcm9tIFJEUyBzZWNyZXQgZmllbGRzIGF0IGNvbnRhaW5lciBzdGFydHVwXG4gICAgICAgIERCX0hPU1Q6IHByb3BzLmRiRW5kcG9pbnQsXG4gICAgICAgIERCX1BPUlQ6IHByb3BzLmRiUG9ydCxcbiAgICAgICAgREJfTkFNRTogJ2xvb3Rwcm90b2NvbCcsXG4gICAgICB9LFxuICAgICAgc2VjcmV0czoge1xuICAgICAgICBEQl9VU0VSTkFNRTogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoZGJTZWNyZXQsICd1c2VybmFtZScpLFxuICAgICAgICBEQl9QQVNTV09SRDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoZGJTZWNyZXQsICdwYXNzd29yZCcpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xuICAgICAgY29udGFpbmVyUG9ydDogMzAwMCxcbiAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxuICAgIH0pO1xuXG4gICAgLy8gRUNTIFNlcnZpY2VcbiAgICB0aGlzLnNlcnZpY2UgPSBuZXcgZWNzLkZhcmdhdGVTZXJ2aWNlKHRoaXMsICdMb290UHJvdG9jb2xTZXJ2aWNlJywge1xuICAgICAgY2x1c3RlcixcbiAgICAgIHRhc2tEZWZpbml0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiAxLCAvLyBNVlBcbiAgICAgIHNlcnZpY2VOYW1lOiAnbG9vdHByb3RvY29sLXNlcnZpY2UnLFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtwcm9wcy5lY3NTZWN1cml0eUdyb3VwXSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgICBjaXJjdWl0QnJlYWtlcjoge1xuICAgICAgICByb2xsYmFjazogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXG4gICAgdGhpcy5hbGIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0xvb3RQcm90b2NvbEFsYicsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwOiBwcm9wcy5hbGJTZWN1cml0eUdyb3VwLFxuICAgIH0pO1xuXG4gICAgLy8gSFRUUCBsaXN0ZW5lciDigJQgcmVkaXJlY3QgdG8gSFRUUFNcbiAgICB0aGlzLmFsYi5hZGRMaXN0ZW5lcignSHR0cExpc3RlbmVyJywge1xuICAgICAgcG9ydDogODAsXG4gICAgICBkZWZhdWx0QWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5yZWRpcmVjdCh7XG4gICAgICAgIHByb3RvY29sOiAnSFRUUFMnLFxuICAgICAgICBwb3J0OiAnNDQzJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gSFRUUFMgbGlzdGVuZXJcbiAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IHByb3BzLmNlcnRpZmljYXRlQXJuXG4gICAgICA/IGFjbS5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4odGhpcywgJ0NlcnRpZmljYXRlJywgcHJvcHMuY2VydGlmaWNhdGVBcm4pXG4gICAgICA6IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0NlcnRpZmljYXRlJywge1xuICAgICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbk5hbWUsXG4gICAgICAgICAgc3ViamVjdEFsdGVybmF0aXZlTmFtZXM6IFtgKi4ke3Byb3BzLmRvbWFpbk5hbWV9YF0sXG4gICAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKCksXG4gICAgICAgIH0pO1xuXG4gICAgY29uc3QgaHR0cHNMaXN0ZW5lciA9IHRoaXMuYWxiLmFkZExpc3RlbmVyKCdIdHRwc0xpc3RlbmVyJywge1xuICAgICAgcG9ydDogNDQzLFxuICAgICAgY2VydGlmaWNhdGVzOiBbY2VydGlmaWNhdGVdLFxuICAgICAgZGVmYXVsdEFjdGlvbjogZWxidjIuTGlzdGVuZXJBY3Rpb24uZml4ZWRSZXNwb25zZSg1MDMsIHtcbiAgICAgICAgY29udGVudFR5cGU6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgbWVzc2FnZUJvZHk6ICdTZXJ2aWNlIFVuYXZhaWxhYmxlJyxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gVGFyZ2V0IGdyb3VwIHdpdGggaGVhbHRoIGNoZWNrXG4gICAgY29uc3QgdGFyZ2V0R3JvdXAgPSBuZXcgZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCh0aGlzLCAnTG9vdFByb3RvY29sVGFyZ2V0R3JvdXAnLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgdGFyZ2V0czogW3RoaXMuc2VydmljZV0sXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBwYXRoOiAnL2FwaS9oZWFsdGgnLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMixcbiAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaHR0cHNMaXN0ZW5lci5hZGRUYXJnZXRHcm91cHMoJ0xvb3RQcm90b2NvbFRhcmdldCcsIHtcbiAgICAgIHRhcmdldEdyb3VwczogW3RhcmdldEdyb3VwXSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxiRG5zTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFsYi5sb2FkQmFsYW5jZXJEbnNOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdBTEIgRE5TIG5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VjclJlcG9zaXRvcnlVcmknLCB7XG4gICAgICB2YWx1ZTogcmVwb3NpdG9yeS5yZXBvc2l0b3J5VXJpLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1IgcmVwb3NpdG9yeSBVUkknLFxuICAgIH0pO1xuICB9XG59XG4iXX0=