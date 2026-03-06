import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
interface AuthStackProps extends cdk.StackProps {
    callbackUrls: string[];
    logoutUrls: string[];
    domainPrefix: string;
}
export declare class AuthStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly userPoolDomain: cognito.UserPoolDomain;
    constructor(scope: Construct, id: string, props: AuthStackProps);
}
export {};
