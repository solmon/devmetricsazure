import { PullRequest } from "./gitanalyser/pullrequest";
import { IAnalyzer } from "./ianalyzer";
import { ProjectConfig } from "./projectconfig";

export async function run(projectConfig:ProjectConfig) {
     let pullAnalyzer:IAnalyzer = new PullRequest(projectConfig);   
     await pullAnalyzer.analyze(projectConfig);   
}
