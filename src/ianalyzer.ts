import { ProjectConfig } from "./projectconfig";

export interface IAnalyzer {
    analyze(projectConfig: ProjectConfig): Promise<boolean>;
}