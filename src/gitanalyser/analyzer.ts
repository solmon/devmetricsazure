import { IAnalyzer } from "../ianalyzer";
import { ProjectConfig } from "../projectconfig";
import * as common from "../common";
import * as nodeApi from "azure-devops-node-api";

import * as GitApi from "azure-devops-node-api/GitApi";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";

export abstract class Analyzer implements IAnalyzer {

    protected gitApiObject: GitApi.IGitApi;
    constructor(protected projectConfig: ProjectConfig) {
        
    }

    protected async getApiObject(): Promise<boolean>{
        let webApi: nodeApi.WebApi = await common.getWebApi();
        this.gitApiObject = await webApi.getGitApi();
        return true;
    }

    protected getProject(): string {
        let project = common.getProject();
        console.log("Project:", project);
        return project;
    }
    abstract analyze(projectConfig: ProjectConfig): Promise<boolean>;
}