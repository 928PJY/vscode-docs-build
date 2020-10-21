import extensionConfig from '../config';
import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxBuildStarted, DocfxRestoreStarted, DocfxBuildCompleted, DocfxRestoreCompleted, BuildProgress } from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds, killProcessTree } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';
import { DocfxExecutionResult, BuildResult } from './buildResult';
import { BuildInput } from './buildInput';
import config from '../config';
import TelemetryReporter from '../telemetryReporter';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient";
import { Trace } from "vscode-jsonrpc";
import { workspace } from 'vscode';

interface BuildParameters {
    restoreCommand: string;
    buildCommand: string;
    serveCommand: string;
    envs: any;
    stdin: string;
}

export class BuildExecutor {
    private _cwd: string;
    private _binary: string;
    private _runningChildProcess: ChildProcess;
    private static SKIP_RESTORE: boolean = false;

    constructor(
        context: ExtensionContext,
        private _platformInfo: PlatformInformation,
        private _environmentController: EnvironmentController,
        private _eventStream: EventStream,
        private _telemetryReporter: TelemetryReporter
    ) {
        let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        let buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === this._platformInfo.rid);
        let absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        // this._cwd = absolutePackage.installPath.value;
        this._cwd = "E:/docfx/src/docfx/bin/Debug/netcoreapp3.1";
        this._binary = absolutePackage.binary;
    }

    public async RunBuild(correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> {
        let buildResult = <BuildResult>{
            result: DocfxExecutionResult.Succeeded,
            isRestoreSkipped: BuildExecutor.SKIP_RESTORE
        };

        let buildParameters = this.getBuildParameters(correlationId, input, buildUserToken);

        if (!BuildExecutor.SKIP_RESTORE) {
            let restoreStart = Date.now();
            let result = await this.restore(correlationId, buildParameters);
            if (result !== 'Succeeded') {
                buildResult.result = result;
                return buildResult;
            }
            BuildExecutor.SKIP_RESTORE = true;
            buildResult.restoreTimeInSeconds = getDurationInSeconds(Date.now() - restoreStart);
        }

        let buildStart = Date.now();
        buildResult.result = await this.build(buildParameters);
        buildResult.buildTimeInSeconds = getDurationInSeconds(Date.now() - buildStart);
        return buildResult;
    }

    public startDocfxLanguageServer(input: BuildInput, buildUserToken: string): LanguageClient {
        let buildParameters = this.getBuildParameters(undefined, input, buildUserToken);
        let options = { env: buildParameters.envs, cwd: this._cwd };
        let optionsWithFullEnvironment = {
            ...options,
            env: {
                ...process.env,
                ...options.env
            }
        };

        this._eventStream.post(new BuildProgress(`& ${buildParameters.serveCommand}`));
        let args = [...buildParameters.serveCommand.split(' ').map(x => x.replace(/^\"+|\"+$/g, '')), "--http", buildParameters.stdin].slice(1);
        let serverOptions: ServerOptions = {
            run: {
                command: this._binary,
                args: args,
                options: optionsWithFullEnvironment,

                transport: TransportKind.stdio,
            },
            debug: {
                command: this._binary,
                args: args,
                options: optionsWithFullEnvironment,
                transport: TransportKind.stdio,
                runtime: "",
            },
        };

        let clientOptions: LanguageClientOptions = {
            documentSelector: [
                {
                    pattern: "**/*.{md,yml}",
                }
            ],
            progressOnInitialization: true,
            synchronize: {
                // Synchronize the setting section 'languageServerExample' to the server
                configurationSection: "docfxLanguageServer",
                fileEvents: workspace.createFileSystemWatcher("**/*.cs"),
            },
        };

        // Create the language client and start the client.
        const client = new LanguageClient("docfxLanguageServer", "Docfx Language Server", serverOptions, clientOptions);
        client.registerProposedFeatures();
        client.trace = Trace.Verbose;
        return client;
    }

    public async cancelBuild() {
        if (this._runningChildProcess) {
            this._runningChildProcess.kill('SIGKILL');
            if (this._platformInfo.isWindows()) {
                // For Windows, grand child process will still keep running even parent process has been killed.
                // So we need to kill them manually
                await killProcessTree(this._runningChildProcess.pid);
            }
        }
    }

    private async restore(
        correlationId: string,
        buildParameters: BuildParameters): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxRestoreStarted());
            this._runningChildProcess = executeDocfx(
                buildParameters.restoreCommand,
                this._eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this._eventStream.post(new DocfxRestoreCompleted(correlationId, docfxExecutionResult, code));
                    resolve(docfxExecutionResult);
                },
                { env: buildParameters.envs, cwd: this._cwd },
                buildParameters.stdin
            );
        });
    }

    private async build(buildParameters: BuildParameters): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxBuildStarted());
            this._runningChildProcess = executeDocfx(
                buildParameters.buildCommand,
                this._eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0 || code === 1) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this._eventStream.post(new DocfxBuildCompleted(docfxExecutionResult, code));
                    resolve(docfxExecutionResult);
                },
                { env: buildParameters.envs, cwd: this._cwd },
                buildParameters.stdin
            );
        });
    }

    private getBuildParameters(
        correlationId: string,
        input: BuildInput,
        buildUserToken: string,
    ): BuildParameters {
        let envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this._environmentController.env
        };

        let isPublicUser = !buildUserToken;
        if (isPublicUser) {
            envs['DOCFX_REPOSITORY_BRANCH'] = 'master';
        }

        if (this._telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this._environmentController.env];
        }

        let secrets = <any>{
        };

        if (!isPublicUser) {
            secrets[`${extensionConfig.OPBuildAPIEndPoint[this._environmentController.env]}`] = {
                "headers": {
                    "X-OP-BuildUserToken": buildUserToken
                }
            };
        }
        if (process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN) {
            secrets["https://github.com"] = {
                "headers": {
                    "authorization": `basic ${basicAuth(process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN)}`
                }
            };
        }
        let stdin = JSON.stringify({
            "http": secrets
        });

        return <BuildParameters>{
            envs,
            stdin,
            restoreCommand: this.getExecCommand("restore", input, isPublicUser),
            buildCommand: this.getExecCommand("build", input, isPublicUser),
            serveCommand: this.getExecCommand('serve', input, isPublicUser),
        };
    }

    private getExecCommand(
        command: string,
        input: BuildInput,
        isPublicUser: boolean,
    ): string {
        let cmdWithParameters = `${this._binary} ${command} "${input.localRepositoryPath}" --log "${input.logPath}"`;

        if (command !== 'serve') {
            cmdWithParameters += ` --stdin`;
        }

        if (isPublicUser) {
            cmdWithParameters += ` --template "${config.PublicTemplate}"`;
        }

        if (this._environmentController.debugMode) {
            cmdWithParameters += ' --verbose';
        }

        if (command !== "restore") {
            if (input.dryRun) {
                cmdWithParameters += ' --dry-run';
            }
            cmdWithParameters += ` --output "${input.outputFolderPath}" --output-type "pagejson"`;
        }
        return cmdWithParameters;
    }
}