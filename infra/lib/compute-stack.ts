import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  albSecurityGroup: ec2.SecurityGroup;
  ecsSecurityGroup: ec2.SecurityGroup;
  dbEndpoint: string;
  dbPort: string;
  dbSecretArn: string;
  bucketName: string;
  bucket: s3.Bucket;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoClientSecret: string;
  cognitoDomain: string;
  domainName: string;
  certificateArn?: string;
}

export class ComputeStack extends cdk.Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
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
        COGNITO_CLIENT_SECRET: props.cognitoClientSecret,
        COGNITO_DOMAIN: `https://${props.cognitoDomain}.auth.${cdk.Aws.REGION}.amazoncognito.com`,
        COGNITO_ISSUER: `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${props.cognitoUserPoolId}`,
        NEXT_PUBLIC_APP_URL: `https://www.${props.domainName}`,
        NEXT_PUBLIC_API_URL: `https://www.${props.domainName}/api`,
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
      desiredCount: 1,
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

    // HTTP listener — forward to target (used by CloudFront origin)
    this.alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // HTTPS listener — for direct ALB access
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
