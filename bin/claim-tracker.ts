#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ClaimTrackerStack } from "../lib/claim-tracker-stack";

const app = new cdk.App();
new ClaimTrackerStack(app, "ClaimTrackerStack", {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: "eu-west-2",
	},
});
