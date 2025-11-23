export type ResourceType = 'file_upload' | 'external_link' | 'github_repo';

export interface ResourceFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  resource_type: ResourceType;
  // For file uploads
  file?: File;
  // For external links
  external_url?: string;
  // For GitHub repos
  github_url?: string;
  visibility: 'public' | 'private' | 'shared_users' | 'shared_groups';
}
