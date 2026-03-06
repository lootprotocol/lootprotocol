import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

interface CdnStackProps extends cdk.StackProps {
  alb: elbv2.ApplicationLoadBalancer;
  domainNames?: string[];
  certificateArn?: string;
  enableBasicAuth?: boolean;
}

export class CdnStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CdnStackProps) {
    super(scope, id, props);

    const albOrigin = new origins.HttpOrigin(props.alb.loadBalancerDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
      : undefined;

    const functionAssociations: cloudfront.FunctionAssociation[] = [];

    if (props.enableBasicAuth !== false) {
      const basicAuthFunction = new cloudfront.Function(this, 'BasicAuthFunction', {
        code: cloudfront.FunctionCode.fromFile({
          filePath: path.join(__dirname, 'functions', 'basic-auth.js'),
        }),
        runtime: cloudfront.FunctionRuntime.JS_2_0,
      });

      functionAssociations.push({
        function: basicAuthFunction,
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      });
    }

    this.distribution = new cloudfront.Distribution(this, 'LootProtocolCdn', {
      defaultBehavior: {
        origin: albOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        functionAssociations,
      },
      additionalBehaviors: {
        // API routes bypass basic auth
        '/api/*': {
          origin: albOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        // Cache static assets
        '/_next/static/*': {
          origin: albOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations,
        },
        // Cache images
        '/images/*': {
          origin: albOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations,
        },
      },
      ...(props.domainNames && certificate
        ? { domainNames: props.domainNames, certificate }
        : {}),
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
