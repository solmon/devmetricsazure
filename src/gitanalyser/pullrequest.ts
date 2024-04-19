import { ProjectConfig } from "../projectconfig";
import * as common from "../common";
import * as GitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { Analyzer } from "./analyzer";
import * as csvhelper from "csv-writer";
import * as path from 'path';

export interface PullRequestStats {
    pullRequestId: number;
    title: string;
    username: string;
    fadded: number;
    fmodified: number;
    fremoved: number;
    targetBranch: string;
    sourceBranch: string;
    createdDate: Date;
    sourceCommitId: string;
    repository:string;    
}
export interface CommitStats{
    commitId: string;
    pullRequestId: number;
    title: string;
    username: string;
    linesadded: number;
    linesremoved: number;
    fadded: number;
    fmodified: number;
    fremoved: number;
    commitType: string;
}

export class PullRequest extends Analyzer {
    
    private allCommitStats: CommitStats[] = [];
    private project:string;
    constructor(protected projectConfig:ProjectConfig) {
        super(projectConfig);
    }

    public async analyze(projectConfig: ProjectConfig): Promise<boolean>{

        common.banner("Azure DevOps Pull Request Analyzer - Start");
        this.project = this.getProject();        
        await this.getApiObject();
        let allPullRequestStats: PullRequestStats[] = [];
        const repositories = await this.getRepositories(this.project);
        
        const includeRepos:GitInterfaces.GitRepository[] = repositories.filter(r => projectConfig.repositories.findIndex(brn=>brn == r.name) > -1);

        for(const repo of includeRepos){
            const pullRequestStats:PullRequestStats[] = await this.getPullRequests(repo.id,repo.name);
            await this.getCommitDetails(pullRequestStats,repo.id);
            allPullRequestStats = [
                ...allPullRequestStats,
                ...pullRequestStats
            ];
        }

        await this.pullRequestsSaveAsCsv(allPullRequestStats);
        await this.commitsSaveAsCsv(this.allCommitStats);
        
        common.banner("Azure DevOps Pull Request Analyzer - End");
        return true;
    }

    private async getRepositories(project:string): Promise<GitInterfaces.GitRepository[]>{
        common.heading("Get Repositories");
        const repos: GitInterfaces.GitRepository[] = await this.gitApiObject.getRepositories(project);
        console.log("There are", repos.length, "repositories in this project");
        return repos;
    }

    private async getPullRequestsForTarget(repositoryId: string, repositoryName:string, targetBranch: string): Promise<PullRequestStats[]> {

        try {
            const pullRequestCriteria: GitInterfaces.GitPullRequestSearchCriteria = {
                maxTime:this.projectConfig.filter.enddate,
                minTime: this.projectConfig.filter.startdate,
                repositoryId: repositoryId,
                status: GitInterfaces.PullRequestStatus.Completed,
                targetRefName: targetBranch
            };
            const pullRequests: GitInterfaces.GitPullRequest[] = await this.gitApiObject.getPullRequests(repositoryId,pullRequestCriteria);

            const pullRequestStats:PullRequestStats[] = pullRequests
            //.filter(pr=>pr.pullRequestId==688)
            .map( (pr):PullRequestStats => {
                const pullRequestStat: PullRequestStats = {
                    pullRequestId : pr.pullRequestId,
                    title : pr.title,
                    username: pr.createdBy?.displayName,
                    fadded: 0,
                    fmodified: 0,
                    fremoved: 0,
                    targetBranch: pr.targetRefName,
                    sourceBranch: pr.sourceRefName,
                    createdDate: pr.creationDate,
                    sourceCommitId: pr.lastMergeSourceCommit.commitId,
                    repository: repositoryName
                }
                return pullRequestStat;
            });
            return pullRequestStats;
        }catch(error){  
            console.error("Error fetching pull requests:", error);
            return [];
        }
    }

    private async getPullRequests(repositoryId: string, repositoryName:string): Promise<PullRequestStats[]>{
        try {
            let allPullRequestStats: PullRequestStats[] = [];
            const targetBranches = this.projectConfig.branches;

            for (const targetBranch of targetBranches) {
                const pullRequestStats = await this.getPullRequestsForTarget(repositoryId, repositoryName, targetBranch);
                allPullRequestStats = [
                    ...allPullRequestStats,
                    ...pullRequestStats];
            }

            return allPullRequestStats;
        }catch(error){  
            console.error("Error fetching pull requests:", error);
            return [];
        }
    }

    private async getCommitDetails(pullRequestStats:PullRequestStats[], respositoryId:string): Promise<void> {
        
        for(const pullRequestStat of pullRequestStats) {
            var commitsForPR = await this.gitApiObject.getPullRequestCommits(respositoryId,pullRequestStat.pullRequestId)       
            let commitStatsForPr = commitsForPR
            .map( (commit): CommitStats => {

                let commitComment = commit.comment?.toUpperCase();    
                let commitType = commitComment?.includes('MERGE') ? 'Merge' : (commitComment?.includes('REVERT') ? 'Revert' : 'Commit');
                commitType = commitComment?.includes('CONFLICT') ? 'Merge' : commitType;

                return {
                    commitId: commit.commitId,
                    pullRequestId: pullRequestStat.pullRequestId,
                    title: commit.comment,
                    username: commit.author.name,
                    commitType: commitType,
                    fadded:0,
                    fmodified:0,
                    fremoved:0
                } as CommitStats;
            })
            

            for(const commitStat of commitStatsForPr
                .filter(x=>x.commitType == 'Commit')) 
            {            
                //let commitDetails = await this.gitApiObject.getCommit(commitStat.commitId,respositoryId);    
                let commitChanges = await this.gitApiObject.getChanges(commitStat.commitId,respositoryId);    
                
                pullRequestStat.fadded += commitChanges.changeCounts && commitChanges.changeCounts["Add"] ? commitChanges.changeCounts["Add"]: 0;
                pullRequestStat.fmodified += commitChanges.changeCounts && commitChanges.changeCounts["Edit"] ? commitChanges.changeCounts["Edit"]: 0;
                //pullRequestStat.fremoved = commitChanges.changeCounts?.EditDelete;
                commitStat.fadded = commitChanges.changeCounts && commitChanges.changeCounts["Add"] ? commitChanges.changeCounts["Add"]: 0;
                commitStat.fmodified += commitChanges.changeCounts && commitChanges.changeCounts["Edit"] ? commitChanges.changeCounts["Edit"]: 0;
                
                /*
                const fileDiffParams = commitChanges.changes
                .filter(x=>!x.item.isFolder)
                .map(change => {
                    return {
                        originalPath: change.originalPath,
                        path: change.item.path
                    } as GitInterfaces.FileDiffParams;                    
                });
             
                const fileDiffsCriteria: GitInterfaces.FileDiffsCriteria = {
                    baseVersionCommit: commitDetails.parents[0],
                    targetVersionCommit:commitStat.commitId,
                    fileDiffParams:fileDiffParams.slice(0,10)
                };
                */
                //let commitFileDetails = await this.gitApiObject.getFileDiffs(fileDiffsCriteria,this.project,respositoryId);
                //console.log(commitDetails);
            }

            this.allCommitStats = this.allCommitStats.concat(commitStatsForPr);
        }
    }

    private async pullRequestsSaveAsCsv(pullRequestStats: PullRequestStats[]): Promise<void> {
        const writer = csvhelper.createObjectCsvWriter({
            path: path.resolve(__dirname, 'pullrequests.csv'),
            header: [
              { id: 'pullRequestId', title: 'PullRequestId' },
              { id: 'title', title: 'Title' },
              { id: 'username', title: 'User Name' },
              { id: 'fadded', title: 'Files Added' },
              { id: 'fmodified', title: 'Files Modified' },
              { id: 'fremoved', title: 'Files Removed' },
              { id: 'targetBranch', title: 'Target Branch' },
              { id: 'sourceBranch', title: 'Source Branch' },
              { id: 'createdDate', title: 'CreatedDate' },
              { id: 'sourceCommitId', title: 'Source CommitId' },
              { id: 'repository', title: 'Repository' }
            ],
        });

        return writer.writeRecords(pullRequestStats).then(() => {
            console.log('Data writtent to csv!');
        });
    }

    private async commitsSaveAsCsv(commitStats: CommitStats[]): Promise<void> {
        const writer = csvhelper.createObjectCsvWriter({
            path: path.resolve(__dirname, 'commitStats.csv'),
            header: [
              { id: 'pullRequestId', title: 'PullRequestId' },
              { id: 'title', title: 'Title' },
              { id: 'username', title: 'User Name' },
              { id: 'fadded', title: 'Files Added' },
              { id: 'fmodified', title: 'Files Modified' },
              { id: 'fremoved', title: 'Files Removed' },
              { id: 'linesadded', title: 'Lines Added' },
              { id: 'linesremoved', title: 'Lines Removed' },
              { id: 'commitType', title: 'Commit Type' }              
            ],
        });

        return writer.writeRecords(commitStats).then(() => {
            console.log('Data writtent to csv!');
        });
    }
    
}