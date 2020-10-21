export interface BuildInput {
    workspaceFolderName: string;
    buildType: BuildType;
    localRepositoryPath: string;
    localRepositoryUrl: string;
    originalRepositoryUrl: string;
    outputFolderPath: string;
    logPath: string;
    dryRun: boolean;
}

export enum BuildType {
    FullBuild = 'FullBuild',
    ChangedFileBuild = 'ChangedFileBuild'
}