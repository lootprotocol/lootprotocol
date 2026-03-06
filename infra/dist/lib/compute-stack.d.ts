import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
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
    cognitoDomain: string;
    domainName: string;
    certificateArn?: string;
}
export declare class ComputeStack extends cdk.Stack {
    readonly alb: elbv2.ApplicationLoadBalancer;
    readonly service: ecs.FargateService;
    constructor(scope: Construct, id: string, props: ComputeStackProps);
}
export {};
