#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { AuthStack } from '../lib/auth-stack';
import { ComputeStack } from '../lib/compute-stack';
import { CdnStack } from '../lib/cdn-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const stage = app.node.tryGetContext('stage') ?? 'dev';
const domainName = app.node.tryGetContext('domainName') ?? 'lootprotocol.com';
const certificateArn = app.node.tryGetContext('certificateArn');
const enableBasicAuth = app.node.tryGetContext('enableBasicAuth') !== 'false';

// VPC Stack
const vpcStack = new VpcStack(app, `LootProtocol-Vpc-${stage}`, { env });

// Database Stack
const databaseStack = new DatabaseStack(app, `LootProtocol-Database-${stage}`, {
  env,
  vpc: vpcStack.vpc,
  securityGroup: vpcStack.rdsSecurityGroup,
});

// Storage Stack
const storageStack = new StorageStack(app, `LootProtocol-Storage-${stage}`, { env });

// Auth Stack
const authStack = new AuthStack(app, `LootProtocol-Auth-${stage}`, {
  env,
  callbackUrls: [
    'https://lootprotocol.com/auth/callback',
    'https://www.lootprotocol.com/auth/callback',
    'https://d20b1ep30zrqwn.cloudfront.net/auth/callback',
    'http://localhost:3000/auth/callback',
    'http://localhost:18432/callback',
  ],
  logoutUrls: [
    'https://lootprotocol.com',
    'https://www.lootprotocol.com',
    'https://d20b1ep30zrqwn.cloudfront.net',
    'http://localhost:3000',
    'http://localhost:18432',
  ],
  domainPrefix: `lootprotocol-${stage}`,
});

// Compute Stack
const computeStack = new ComputeStack(app, `LootProtocol-Compute-${stage}`, {
  env,
  vpc: vpcStack.vpc,
  albSecurityGroup: vpcStack.albSecurityGroup,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  dbEndpoint: databaseStack.dbEndpoint,
  dbPort: databaseStack.dbPort,
  dbSecretArn: databaseStack.dbSecretArn,
  bucketName: storageStack.bucket.bucketName,
  bucket: storageStack.bucket,
  cognitoUserPoolId: authStack.userPool.userPoolId,
  cognitoClientId: authStack.userPoolClient.userPoolClientId,
  cognitoClientSecret: authStack.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
  cognitoDomain: authStack.userPoolDomain.domainName,
  domainName,
  certificateArn,
});

// CDN Stack
const cdnStack = new CdnStack(app, `LootProtocol-Cdn-${stage}`, {
  env,
  alb: computeStack.alb,
  domainNames: [domainName, `www.${domainName}`],
  certificateArn,
  enableBasicAuth,
});

// Explicit dependencies
databaseStack.addDependency(vpcStack);
computeStack.addDependency(vpcStack);
computeStack.addDependency(databaseStack);
computeStack.addDependency(storageStack);
computeStack.addDependency(authStack);
cdnStack.addDependency(computeStack);
