// import { Stack, StackProps } from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from '@aws-cdk/core'
import s3assets = require('@aws-cdk/aws-s3-assets')
import elasticbeanstalk = require('@aws-cdk/aws-elasticbeanstalk')
import iam = require('@aws-cdk/aws-iam')

export class CdkEbInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'MyWebApp'

    // Responsible for uploading the app.zip file to S3 
    const webAppZipArchive = new s3assets.Asset(this, 'WebAppZip', {
      path: `${__dirname}/../app.zip`
    })

    // Create EB application
    const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
      applicationName: appName
    })

    // Create EB application version pointing to specific zip archive in S3
    const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
      applicationName: appName,
      sourceBundle: {
        s3Bucket: webAppZipArchive.s3BucketName,
        s3Key: webAppZipArchive.s3ObjectKey
      }
    })

    appVersionProps.addDependsOn(app)

    ////////////////////////////////////////////////////////////////////////////////
    // Creates a IAM role to be passed to EC2 instance in EB environment
    // Specifies that this role is to be used by an EC2 instance
    const myRole = new iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
  
    // Adds a policy to our role
    // This policy grants permission to app to upload logs to S3 and debugging info to AWS X-Ray
    const managedPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    myRole.addManagedPolicy(managedPolicy);
    
    const myProfileName = `${appName}-InstanceProfile`
    
    // Adds role to instance profile
    // Used to pass role information to EC2 instance when it starts
    const instanceProfile = new iam.CfnInstanceProfile(this, myProfileName, {
      instanceProfileName: myProfileName,
      roles: [
          myRole.roleName
      ]
    });

    const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      {
          namespace: 'aws:autoscaling:launchconfiguration',
          optionName: 'IamInstanceProfile',
          value: myProfileName,
      },
      {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MinSize',
          value: '1',
      },
      {
          namespace: 'aws:autoscaling:asg',
          optionName: 'MaxSize',
          value: '1',
      },
      {
          namespace: 'aws:ec2:instances',
          optionName: 'InstanceTypes',
          value: 't2.micro',
      },
    ];

    const elEnv = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
      environmentName: 'MyWebAppEnvironment',
      applicationName: app.applicationName || appName,
      solutionStackName: '64bit Amazon Linux 2 v5.4.9 running Node.js 14',
      optionSettings: optionSettingProperties,
      versionLabel: appVersionProps.ref
    })

    // example resource
    // const queue = new sqs.Queue(this, 'CdkEbInfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
