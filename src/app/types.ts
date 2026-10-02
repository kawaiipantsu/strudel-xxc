export type ProjectFile = {
  path: string;
  content: string;
  kind?: "file" | "folder";
};
export type Project = {
  id?: string;
  // Local editor identity before the server assigns a project id.
  draft_id?: string;
  draft_dirty?: boolean;
  title: string;
  description: string;
  author: string;
  slug?: string;
  visibility: "private" | "unlisted" | "public";
  entry_file: string;
  files: ProjectFile[];
  tags: string[];
  metadata: Record<string, any>;
  version?: number;
  editable?: boolean;
  builtin?: number;
  cover_id?: string;
  preview_id?: string;
  remix_of?: string;
  created_at?: string;
  updated_at?: string;
};
export type Media = {
  id: string;
  project_id: string;
  kind: string;
  original_name: string;
  mime: string;
  size: number;
  duration: number;
  url: string;
  metadata: Record<string, any>;
  approved: number;
};
export type Signal = {
  sampleRate?: number;
  fftBinHz?: number;
  wave: number[];
  fft: number[];
  rms: number;
  peak: number;
  phase: number;
  cps: number;
  events: {
    begin: number;
    end: number;
    value: Record<string, any>;
    locations?: any[];
  }[];
  stereo: number[];
  stereoWave: number[][];
  orbits: { id: string; level: number }[];
};
export const emptySignal: Signal = {
  wave: [],
  fft: [],
  rms: 0,
  peak: 0,
  phase: 0,
  cps: 0.5,
  events: [],
  stereo: [],
  stereoWave: [],
  orbits: [],
};
