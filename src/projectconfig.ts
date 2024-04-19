export interface ProjectConfig {
    apiUrl: string;
    apiToken: string;
    projectName: string;
    repositories: string[];
    users:string[];
    branches: string[];
    filter: {
        startdate: Date;
        enddate: Date;
    }
}