import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
interface DatabaseStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
}
export declare class DatabaseStack extends cdk.Stack {
    readonly instance: rds.DatabaseInstance;
    readonly dbEndpoint: string;
    readonly dbPort: string;
    readonly dbSecretArn: string;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
}
export {};
