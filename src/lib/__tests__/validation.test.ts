import { describe, it, expect } from 'vitest';
import { resourceSchema, suggestionSchema, profileSchema, searchSchema } from '../validation';

describe('resourceSchema', () => {
  it('should validate a valid resource', () => {
    const validResource = {
      title: 'Test Resource',
      description: 'This is a test resource description',
      category: 'library',
      tags: ['test', 'example'],
      github_url: 'https://github.com/user/repo',
      language: 'TypeScript',
      readme: 'Some readme content',
    };

    const result = resourceSchema.safeParse(validResource);
    expect(result.success).toBe(true);
  });

  it('should reject resource with title too short', () => {
    const invalidResource = {
      title: 'A',
      description: 'This is a test resource description',
      category: 'library',
      tags: ['test'],
    };

    const result = resourceSchema.safeParse(invalidResource);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('should reject resource without tags', () => {
    const invalidResource = {
      title: 'Test Resource',
      description: 'This is a test resource description',
      category: 'library',
      tags: [],
    };

    const result = resourceSchema.safeParse(invalidResource);
    expect(result.success).toBe(false);
  });

  it('should reject invalid GitHub URL', () => {
    const invalidResource = {
      title: 'Test Resource',
      description: 'This is a test resource description',
      category: 'library',
      tags: ['test'],
      github_url: 'not-a-url',
    };

    const result = resourceSchema.safeParse(invalidResource);
    expect(result.success).toBe(false);
  });

  it('should accept empty optional fields', () => {
    const validResource = {
      title: 'Test Resource',
      description: 'This is a test resource description',
      category: 'library',
      tags: ['test'],
      github_url: '',
      language: '',
      readme: '',
    };

    const result = resourceSchema.safeParse(validResource);
    expect(result.success).toBe(true);
  });
});

describe('suggestionSchema', () => {
  it('should validate a valid suggestion', () => {
    const validSuggestion = {
      name: 'Test Category',
      description: 'This is a test description',
      type: 'category' as const,
    };

    const result = suggestionSchema.safeParse(validSuggestion);
    expect(result.success).toBe(true);
  });

  it('should reject suggestion with name too short', () => {
    const invalidSuggestion = {
      name: 'A',
      description: 'This is a test description',
      type: 'category' as const,
    };

    const result = suggestionSchema.safeParse(invalidSuggestion);
    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const invalidSuggestion = {
      name: 'Test',
      description: 'This is a test description',
      type: 'invalid' as any,
    };

    const result = suggestionSchema.safeParse(invalidSuggestion);
    expect(result.success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('should validate a valid profile', () => {
    const validProfile = {
      username: 'testuser',
      full_name: 'Test User',
      bio: 'This is a test bio',
      github_username: 'testuser',
    };

    const result = profileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('should reject username with invalid characters', () => {
    const invalidProfile = {
      username: 'test user!',
      full_name: 'Test User',
    };

    const result = profileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
  });

  it('should accept empty optional fields', () => {
    const validProfile = {
      username: '',
      full_name: '',
      bio: '',
      github_username: '',
    };

    const result = profileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });
});

describe('searchSchema', () => {
  it('should validate a valid search query', () => {
    const validSearch = {
      query: 'test',
      categories: ['library'],
      tags: ['test', 'example'],
    };

    const result = searchSchema.safeParse(validSearch);
    expect(result.success).toBe(true);
  });

  it('should accept empty search', () => {
    const emptySearch = {};

    const result = searchSchema.safeParse(emptySearch);
    expect(result.success).toBe(true);
  });
});


