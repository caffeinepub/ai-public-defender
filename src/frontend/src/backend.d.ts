import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface CaseAnalysisInput {
    lawType: string;
    documentContext?: string;
    caseDescription: string;
}
export interface CaseAnalysisResult {
    caseType: string;
    userRights: string;
    oppositionArguments: Array<string>;
    applicableLaw: string;
    procedure: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface PracticeModeResponse {
    counterArgument: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface FeedbackResponse {
    weaknesses: Array<string>;
    suggestions: Array<string>;
    strengths: Array<string>;
}
export interface FeedbackInput {
    lawType: string;
    fullConversation: Array<string>;
}
export interface PracticeModeInput {
    lawType: string;
    conversationHistory: Array<string>;
    userInput: string;
}
export interface backendInterface {
    analyzeCase(input: CaseAnalysisInput): Promise<CaseAnalysisResult>;
    downloadDocument(name: string): Promise<string | null>;
    getFeedback(input: FeedbackInput): Promise<FeedbackResponse>;
    practiceMode(input: PracticeModeInput): Promise<PracticeModeResponse>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    uploadDocument(blob: ExternalBlob, name: string): Promise<void>;
}
