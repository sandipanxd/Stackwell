#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { StackwellStack } from '../lib/stackwell-stack';

const app = new App();
new StackwellStack(app, 'StackwellStack');
