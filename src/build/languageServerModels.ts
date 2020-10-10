import { DocumentUri, NotificationType, RequestType } from "vscode-languageclient";

export namespace PreviewRequest {
    export const type: RequestType<PreviewParams, PreviewResponse, {}, {}> = new RequestType('docfx/preview');
}

export namespace PreviewUpdateNotification {
    export const type: NotificationType<PreviewUpdateResponse> = new NotificationType('docfx/preview/update');
}

export interface PreviewParams {
    uri: DocumentUri;
    text: string;
}

export interface PreviewResponse {
    header: string;
    content: string;
}

export interface PreviewUpdateResponse {
    header: string;
    content: string;
}