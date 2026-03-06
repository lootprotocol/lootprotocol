"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStack = void 0;
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
class AuthStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.userPool = new cognito.UserPool(this, 'LootProtocolUserPool', {
            userPoolName: 'lootprotocol-users',
            selfSignUpEnabled: false, // Users sign in via GitHub only
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
            scopes: ['user:email', 'read:user'],
            attributeMapping: {
                email: cognito.ProviderAttribute.other('email'),
                preferredUsername: cognito.ProviderAttribute.other('login'),
                profilePicture: cognito.ProviderAttribute.other('avatar_url'),
                fullname: cognito.ProviderAttribute.other('name'),
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
            ],
        });
        this.userPoolClient.node.addDependency(githubProvider);
        // Cognito Domain
        this.userPoolDomain = new cognito.UserPoolDomain(this, 'LootProtocolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: props.domainPrefix,
            },
        });
        // CloudFormation Parameters for GitHub OAuth credentials
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
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9hdXRoLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxtREFBbUQ7QUFTbkQsTUFBYSxTQUFVLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFLdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFxQjtRQUM3RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDakUsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsZ0NBQWdDO1lBQzFELGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDthQUNGO1lBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLHdCQUF3QjtTQUNuRSxDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsTUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3RGLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN0QyxZQUFZLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUM7WUFDOUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLElBQUksRUFBRSxRQUFRO1lBQ2QsU0FBUyxFQUFFLDZDQUE2QyxFQUFFLG1EQUFtRDtZQUM3RyxTQUFTLEVBQUU7Z0JBQ1Qs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LFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUdELDhCQTBHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5pbnRlcmZhY2UgQXV0aFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGNhbGxiYWNrVXJsczogc3RyaW5nW107XG4gIGxvZ291dFVybHM6IHN0cmluZ1tdO1xuICBkb21haW5QcmVmaXg6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xEb21haW46IGNvZ25pdG8uVXNlclBvb2xEb21haW47XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGhTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ0xvb3RQcm90b2NvbFVzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAnbG9vdHByb3RvY29sLXVzZXJzJyxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSwgLy8gVXNlcnMgc2lnbiBpbiB2aWEgR2l0SHViIG9ubHlcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBDaGFuZ2UgZm9yIHByb2R1Y3Rpb25cbiAgICB9KTtcblxuICAgIC8vIEdpdEh1YiBhcyBPQXV0aDIgaWRlbnRpdHkgcHJvdmlkZXJcbiAgICBjb25zdCBnaXRodWJQcm92aWRlciA9IG5ldyBjb2duaXRvLlVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0dpdEh1YlByb3ZpZGVyJywge1xuICAgICAgY2xpZW50SWQ6IGNkay5Gbi5yZWYoJ0dpdEh1YkNsaWVudElkJyksXG4gICAgICBjbGllbnRTZWNyZXQ6IGNkay5Gbi5yZWYoJ0dpdEh1YkNsaWVudFNlY3JldCcpLFxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICBuYW1lOiAnR2l0SHViJyxcbiAgICAgIGlzc3VlclVybDogJ2h0dHBzOi8vdG9rZW4uYWN0aW9ucy5naXRodWJ1c2VyY29udGVudC5jb20nLCAvLyBQbGFjZWhvbGRlciDigJQgR2l0SHViIE9BdXRoIHVzZXMgY3VzdG9tIGVuZHBvaW50c1xuICAgICAgZW5kcG9pbnRzOiB7XG4gICAgICAgIGF1dGhvcml6YXRpb246ICdodHRwczovL2dpdGh1Yi5jb20vbG9naW4vb2F1dGgvYXV0aG9yaXplJyxcbiAgICAgICAgdG9rZW46ICdodHRwczovL2dpdGh1Yi5jb20vbG9naW4vb2F1dGgvYWNjZXNzX3Rva2VuJyxcbiAgICAgICAgdXNlckluZm86ICdodHRwczovL2FwaS5naXRodWIuY29tL3VzZXInLFxuICAgICAgICBqd2tzVXJpOiAnaHR0cHM6Ly90b2tlbi5hY3Rpb25zLmdpdGh1YnVzZXJjb250ZW50LmNvbS8ud2VsbC1rbm93bi9qd2tzJyxcbiAgICAgIH0sXG4gICAgICBzY29wZXM6IFsndXNlcjplbWFpbCcsICdyZWFkOnVzZXInXSxcbiAgICAgIGF0dHJpYnV0ZU1hcHBpbmc6IHtcbiAgICAgICAgZW1haWw6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUub3RoZXIoJ2VtYWlsJyksXG4gICAgICAgIHByZWZlcnJlZFVzZXJuYW1lOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLm90aGVyKCdsb2dpbicpLFxuICAgICAgICBwcm9maWxlUGljdHVyZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5vdGhlcignYXZhdGFyX3VybCcpLFxuICAgICAgICBmdWxsbmFtZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5vdGhlcignbmFtZScpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFVzZXIgUG9vbCBDbGllbnRcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ0xvb3RQcm90b2NvbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnbG9vdHByb3RvY29sLXdlYicsXG4gICAgICBnZW5lcmF0ZVNlY3JldDogdHJ1ZSxcbiAgICAgIG9BdXRoOiB7XG4gICAgICAgIGZsb3dzOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGVzOiBbXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXG4gICAgICAgIF0sXG4gICAgICAgIGNhbGxiYWNrVXJsczogcHJvcHMuY2FsbGJhY2tVcmxzLFxuICAgICAgICBsb2dvdXRVcmxzOiBwcm9wcy5sb2dvdXRVcmxzLFxuICAgICAgfSxcbiAgICAgIHN1cHBvcnRlZElkZW50aXR5UHJvdmlkZXJzOiBbXG4gICAgICAgIGNvZ25pdG8uVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLmN1c3RvbSgnR2l0SHViJyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgdGhpcy51c2VyUG9vbENsaWVudC5ub2RlLmFkZERlcGVuZGVuY3koZ2l0aHViUHJvdmlkZXIpO1xuXG4gICAgLy8gQ29nbml0byBEb21haW5cbiAgICB0aGlzLnVzZXJQb29sRG9tYWluID0gbmV3IGNvZ25pdG8uVXNlclBvb2xEb21haW4odGhpcywgJ0xvb3RQcm90b2NvbERvbWFpbicsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgY29nbml0b0RvbWFpbjoge1xuICAgICAgICBkb21haW5QcmVmaXg6IHByb3BzLmRvbWFpblByZWZpeCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZEZvcm1hdGlvbiBQYXJhbWV0ZXJzIGZvciBHaXRIdWIgT0F1dGggY3JlZGVudGlhbHNcbiAgICBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnR2l0SHViQ2xpZW50SWQnLCB7XG4gICAgICB0eXBlOiAnU3RyaW5nJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2l0SHViIE9BdXRoIEFwcCBDbGllbnQgSUQnLFxuICAgICAgbm9FY2hvOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0dpdEh1YkNsaWVudFNlY3JldCcsIHtcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxuICAgICAgZGVzY3JpcHRpb246ICdHaXRIdWIgT0F1dGggQXBwIENsaWVudCBTZWNyZXQnLFxuICAgICAgbm9FY2hvOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9Eb21haW4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbERvbWFpbi5kb21haW5OYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIGRvbWFpbicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==