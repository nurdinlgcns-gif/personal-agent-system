export type DocumentIngestionConvertRequest = {
  inputPath: string;
};

export type DocumentIngestionConvertResult = {
  ok: boolean;
  jobId: string;
  sourceRef: string;
  sourceFile: string;
  sourceStem: string;
  inputPath: string;
  copiedInputPath: string | null;
  storageRoot: string;
  jobDir: string | null;
  inputDir: string | null;
  convertedDir: string | null;
  outputDir: string | null;
  markdownPath: string | null;
  imagesDir: string | null;
  manifestPath: string | null;
  markdownPreview: string | null;
  markdownChars: number;
  imageCount: number;
  warnings: string[];
  status: string;
  stdout: string;
  stderr: string;
  error: string | null;
};

export type ConvertedMarkdownImportRequest = {
  markdownPath: string;
  originalInputPath?: string;
  sourceRef?: string;
  agentName?: string;
  title?: string;
  scope?: string;
  allowedAgents?: string[];
  linkedSkillNames?: string[];
  sensitivityLevel?: string;
  memoryType?: string;
  sourceMode?: string;
};

export type ConvertedMarkdownImportResult = {
  ok: boolean;
  memoryId: string | null;
  importHistoryId: string | null;
  title: string;
  agentName: string;
  scope: string;
  sourceRef: string;
  markdownPath: string;
  markdownChars: number;
  markdownPreview: string | null;
  status: string;
  action: string;
  ragEnabled: boolean;
  runtimeInjectable: boolean;
  warnings: string[];
  error: string | null;
};

export type ConvertAndImportRequest = DocumentIngestionConvertRequest &
  Omit<ConvertedMarkdownImportRequest, "markdownPath" | "originalInputPath">;

export type DocumentIngestionManifest = {
  jobId: string;
  sourceRef: string;
  sourceFile: string;
  sourceStem: string;
  originalInputPath: string;
  copiedInputPath: string;
  markdownPath: string;
  outputDir: string;
  imagesDir: string | null;
  status: string;
  imageCount: number;
  markdownChars: number;
  warnings: string[];
  createdAt: string;
};