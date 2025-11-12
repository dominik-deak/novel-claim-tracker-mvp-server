import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

export class ClaimTrackerStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const claimsTable = new dynamodb.Table(this, "ClaimsTable", {
			partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const projectsTable = new dynamodb.Table(this, "ProjectsTable", {
			partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const claimProjectsTable = new dynamodb.Table(this, "ClaimProjectsTable", {
			partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		claimProjectsTable.addGlobalSecondaryIndex({
			indexName: "projectId-index",
			partitionKey: { name: "SK", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "PK", type: dynamodb.AttributeType.STRING },
		});

		const commonEnvironment = {
			CLAIMS_TABLE: claimsTable.tableName,
			PROJECTS_TABLE: projectsTable.tableName,
			CLAIM_PROJECTS_TABLE: claimProjectsTable.tableName,
		};

		const createClaimFn = new NodejsFunction(this, "CreateClaimFn", {
			entry: "src/functions/claims/create.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const listClaimsFn = new NodejsFunction(this, "ListClaimsFn", {
			entry: "src/functions/claims/list.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const getClaimFn = new NodejsFunction(this, "GetClaimFn", {
			entry: "src/functions/claims/get.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const updateClaimFn = new NodejsFunction(this, "UpdateClaimFn", {
			entry: "src/functions/claims/update.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const deleteClaimFn = new NodejsFunction(this, "DeleteClaimFn", {
			entry: "src/functions/claims/delete.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const linkProjectsFn = new NodejsFunction(this, "LinkProjectsFn", {
			entry: "src/functions/claims/linkProjects.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const unlinkProjectFn = new NodejsFunction(this, "UnlinkProjectFn", {
			entry: "src/functions/claims/unlinkProject.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const createProjectFn = new NodejsFunction(this, "CreateProjectFn", {
			entry: "src/functions/projects/create.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const listProjectsFn = new NodejsFunction(this, "ListProjectsFn", {
			entry: "src/functions/projects/list.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const getProjectFn = new NodejsFunction(this, "GetProjectFn", {
			entry: "src/functions/projects/get.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const updateProjectFn = new NodejsFunction(this, "UpdateProjectFn", {
			entry: "src/functions/projects/update.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		const deleteProjectFn = new NodejsFunction(this, "DeleteProjectFn", {
			entry: "src/functions/projects/delete.ts",
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			environment: commonEnvironment,
		});

		claimsTable.grantReadWriteData(createClaimFn);
		claimsTable.grantReadData(listClaimsFn);
		claimsTable.grantReadData(getClaimFn);
		claimsTable.grantReadWriteData(updateClaimFn);
		claimsTable.grantReadWriteData(deleteClaimFn);
		claimsTable.grantReadData(linkProjectsFn);
		claimsTable.grantReadData(unlinkProjectFn);

		projectsTable.grantReadWriteData(createProjectFn);
		projectsTable.grantReadData(listProjectsFn);
		projectsTable.grantReadData(getProjectFn);
		projectsTable.grantReadWriteData(updateProjectFn);
		projectsTable.grantReadWriteData(deleteProjectFn);
		projectsTable.grantReadData(createClaimFn);
		projectsTable.grantReadData(linkProjectsFn);
		projectsTable.grantReadData(unlinkProjectFn);

		claimProjectsTable.grantReadWriteData(createClaimFn);
		claimProjectsTable.grantReadData(listClaimsFn);
		claimProjectsTable.grantReadData(getClaimFn);
		claimProjectsTable.grantReadWriteData(deleteClaimFn);
		claimProjectsTable.grantReadWriteData(linkProjectsFn);
		claimProjectsTable.grantReadWriteData(unlinkProjectFn);
		claimProjectsTable.grantReadData(getProjectFn);
		claimProjectsTable.grantReadWriteData(deleteProjectFn);

		const api = new apigateway.RestApi(this, "ClaimTrackerApi", {
			restApiName: "Claim Tracker API",
			defaultCorsPreflightOptions: {
				allowOrigins: apigateway.Cors.ALL_ORIGINS,
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
			},
		});

		const claims = api.root.addResource("claims");
		claims.addMethod("POST", new apigateway.LambdaIntegration(createClaimFn));
		claims.addMethod("GET", new apigateway.LambdaIntegration(listClaimsFn));

		const claim = claims.addResource("{id}");
		claim.addMethod("GET", new apigateway.LambdaIntegration(getClaimFn));
		claim.addMethod("PATCH", new apigateway.LambdaIntegration(updateClaimFn));
		claim.addMethod("DELETE", new apigateway.LambdaIntegration(deleteClaimFn));

		const claimProjects = claim.addResource("projects");
		claimProjects.addMethod(
			"POST",
			new apigateway.LambdaIntegration(linkProjectsFn),
		);

		const claimProject = claimProjects.addResource("{projectId}");
		claimProject.addMethod(
			"DELETE",
			new apigateway.LambdaIntegration(unlinkProjectFn),
		);

		const projects = api.root.addResource("projects");
		projects.addMethod(
			"POST",
			new apigateway.LambdaIntegration(createProjectFn),
		);
		projects.addMethod("GET", new apigateway.LambdaIntegration(listProjectsFn));

		const project = projects.addResource("{id}");
		project.addMethod("GET", new apigateway.LambdaIntegration(getProjectFn));
		project.addMethod(
			"PATCH",
			new apigateway.LambdaIntegration(updateProjectFn),
		);
		project.addMethod(
			"DELETE",
			new apigateway.LambdaIntegration(deleteProjectFn),
		);

		new cdk.CfnOutput(this, "ApiEndpoint", {
			value: api.url,
			description: "Claim Tracker API Gateway endpoint",
		});
	}
}
