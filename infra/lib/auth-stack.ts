import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

interface AuthStackProps extends cdk.StackProps {
  callbackUrls: string[];
  logoutUrls: string[];
  domainPrefix: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'LootProtocolUserPool', {
      userPoolName: 'lootprotocol-users',
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change for production
    });

    // GitHub as OAuth2 identity provider
    const githubProvider = new cognito.UserPoolIdentityProviderOidc(this, 'GitHubProvider', {
      clientId: cdk.Fn.ref('GitHubClientId'),
      clientSecret: cdk.Fn.ref('GitHubClientSecret'),
      userPool: this.userPool,
      name: 'GitHub',
      issuerUrl: 'https://token.actions.githubusercontent.com', // Placeholder — GitHub OAuth uses custom endpoints
      endpoints: {
        authorization: 'https://github.com/login/oauth/authorize',
        token: 'https://github.com/login/oauth/access_token',
        userInfo: 'https://api.github.com/user',
        jwksUri: 'https://token.actions.githubusercontent.com/.well-known/jwks',
      },
      scopes: ['openid', 'user:email', 'read:user'],
      attributeMapping: {
        email: cognito.ProviderAttribute.other('email'),
        preferredUsername: cognito.ProviderAttribute.other('login'),
        profilePicture: cognito.ProviderAttribute.other('avatar_url'),
        fullname: cognito.ProviderAttribute.other('name'),
      },
    });

    // Google as OAuth2 identity provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      clientId: cdk.Fn.ref('GoogleClientId'),
      clientSecretValue: cdk.SecretValue.cfnParameter(
        new cdk.CfnParameter(this, 'GoogleClientSecretParam', {
          type: 'String',
          description: 'Google OAuth Client Secret',
          noEcho: true,
        }),
      ),
      userPool: this.userPool,
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'LootProtocolClient', {
      userPool: this.userPool,
      userPoolClientName: 'lootprotocol-web',
      generateSecret: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.custom('GitHub'),
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
    });

    this.userPoolClient.node.addDependency(githubProvider);
    this.userPoolClient.node.addDependency(googleProvider);

    // Cognito Domain
    this.userPoolDomain = new cognito.UserPoolDomain(this, 'LootProtocolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: props.domainPrefix,
      },
    });

    // CloudFormation Parameters for OAuth credentials
    new cdk.CfnParameter(this, 'GitHubClientId', {
      type: 'String',
      description: 'GitHub OAuth App Client ID',
      noEcho: true,
    });

    new cdk.CfnParameter(this, 'GitHubClientSecret', {
      type: 'String',
      description: 'GitHub OAuth App Client Secret',
      noEcho: true,
    });

    new cdk.CfnParameter(this, 'GoogleClientId', {
      type: 'String',
      description: 'Google OAuth Client ID',
      noEcho: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito domain',
    });
  }
}
