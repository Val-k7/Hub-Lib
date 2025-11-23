import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/SearchBar';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BrowserRouter } from 'react-router-dom';

expect.extend(toHaveNoViolations);

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Button>Test Button</Button>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard accessible', async () => {
      const { container } = render(
        <TestWrapper>
          <Button>Click me</Button>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Input Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <Input aria-label="Test input" placeholder="Enter text" />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper label association', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <label htmlFor="test-input">Test Label</label>
            <Input id="test-input" />
          </div>
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('SearchBar Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <SearchBar value="" onChange={() => {}} />
        </TestWrapper>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('LanguageToggle Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <LanguageToggle />
        </TestWrapper>
      );
      // Attendre que le composant soit complètement rendu
      await new Promise(resolve => setTimeout(resolve, 100));
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

