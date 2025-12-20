// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface LocationContributor {
  login: string;
  name: string | null;
  location: string | null;
  avatar_url: string;
  html_url: string;
  commitCount: number;
  issueCount: number;
  coords: { lat: number; lng: number } | null;
  country: string | null;
}

export interface CommitDetail {
  sha: string;
  message: string;
  date: string;
  url: string;
}

export interface IssueDetail {
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  labels: string[];
}

// Unified contributor with both commits and issues
export interface CommunityMember {
  login: string;
  avatar_url: string;
  html_url: string;
  commits: CommitDetail[];
  issues: IssueDetail[];
  commitCount: number;
  issueCount: number;
  score: number; // Weighted score for ranking
}

// Raw data interfaces for JSON imports
export interface RawCommitContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  commits: CommitDetail[];
}

export interface RawIssueContributor {
  login: string;
  avatar_url: string;
  count: number;
  issues: IssueDetail[];
}

// Snowflake physics state
export interface Snowflake {
  element: HTMLElement;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
}

// Map data types
export interface MapCluster {
  lat: number;
  lng: number;
  names: string;
  country: string;
  count: number;
  contributions: number;
}

export interface MapIndividual {
  lat: number;
  lng: number;
  name: string;
  login: string;
  location: string;
  country: string;
  contributions: number;
}

export interface MapData {
  clusters: MapCluster[];
  individuals: MapIndividual[];
}

// Extended SVG element with our custom properties
export interface MapSvgElement extends SVGSVGElement {
  _updateDotsVisibility?: () => void;
}

// Release data type
export interface Release {
  tag_name: string;
  name: string;
  published_at: string; // YYYY-MM-DD format
  is_prerelease: boolean;
  html_url: string;
  release_type: 'minor' | 'patch';
  contributors: string[];
  highlights: string;
}

// Contributor data (from contributors JSON)
export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  commits: CommitDetail[];
}
