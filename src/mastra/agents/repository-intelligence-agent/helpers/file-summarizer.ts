/**
 * File Summarizer Helper
 * ----------------------
 * This helper provides intelligent summarization of files based on their type and content.
 * Used by the code-review tool to generate brief descriptions of each file in a repository.
 */

function getFileType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml';
  if (lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.jsx')) return 'jsx';
  if (lower.endsWith('.tsx')) return 'tsx';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.cpp')) return 'cpp';
  if (lower.endsWith('.c')) return 'c';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.rs')) return 'rust';
  if (lower.endsWith('.php')) return 'php';
  if (lower.endsWith('.rb')) return 'ruby';
  if (lower.endsWith('.sh')) return 'shell';
  if (lower.endsWith('.bat')) return 'batch';
  if (lower.endsWith('.ps1')) return 'powershell';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.scss')) return 'scss';
  if (lower.endsWith('.less')) return 'less';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.sql')) return 'sql';
  if (lower.endsWith('.env')) return 'env';
  if (lower.endsWith('.lock')) return 'lock';
  if (lower.endsWith('.config')) return 'config';
  if (lower.endsWith('.test.js') || lower.endsWith('.test.ts')) return 'test';
  if (lower.endsWith('.spec.js') || lower.endsWith('.spec.ts')) return 'spec';
  if (lower.endsWith('dockerfile')) return 'dockerfile';
  if (lower.endsWith('makefile')) return 'makefile';
  if (lower.endsWith('readme.md')) return 'readme';
  if (lower.endsWith('package.json')) return 'package';
  if (lower.endsWith('requirements.txt')) return 'requirements';
  if (lower.endsWith('tsconfig.json')) return 'tsconfig';
  if (lower.endsWith('pnpm-lock.yaml')) return 'lock';
  if (lower.endsWith('yarn.lock')) return 'lock';
  if (lower.endsWith('bun.lock')) return 'lock';
  return 'other';
}

export function summarizeFile(filePath: string, content: string): string {
  const type = getFileType(filePath);
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  const firstFew = lines.slice(0, 5).join(' ');

  if (type === 'readme' || filePath.toLowerCase() === 'readme.md') {
    return 'Project README file. Provides an overview, usage instructions, and documentation for the project.';
  }
  if (type === 'markdown') {
    return 'Markdown documentation file. Contains project documentation, guides, or notes.';
  }
  if (type === 'json') {
    if (filePath.endsWith('package.json')) {
      return 'Node.js package manifest (package.json). Lists dependencies, scripts, and project metadata.';
    }
    return 'JSON configuration or data file.';
  }
  if (type === 'yaml') {
    return 'YAML configuration or workflow file.';
  }
  if (type === 'typescript' || type === 'javascript' || type === 'jsx' || type === 'tsx') {
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.js') || filePath.endsWith('.spec.ts') || filePath.endsWith('.spec.js')) {
      return 'Test file. Contains automated tests for the codebase.';
    }
    if (firstLine.startsWith('import') || firstLine.startsWith('export') || firstLine.startsWith('function') || firstLine.startsWith('class')) {
      return `Source code file (${type}). Defines logic, functions, or classes. Example: ${firstLine}`;
    }
    return `Source code file (${type}). ${firstFew.slice(0, 120)}`;
  }
  if (type === 'python') {
    if (filePath.endsWith('requirements.txt')) {
      return 'Python requirements file. Lists Python dependencies for the project.';
    }
    if (firstLine.startsWith('def') || firstLine.startsWith('class') || firstLine.startsWith('import')) {
      return `Python source file. Defines logic, functions, or classes. Example: ${firstLine}`;
    }
    return `Python source file. ${firstFew.slice(0, 120)}`;
  }
  if (type === 'html') {
    return 'HTML file. Defines the structure of a web page.';
  }
  if (type === 'css' || type === 'scss' || type === 'less') {
    return 'Stylesheet file. Defines the appearance and layout of web pages.';
  }
  if (type === 'dockerfile') {
    return 'Dockerfile. Defines container build instructions.';
  }
  if (type === 'makefile') {
    return 'Makefile. Defines build automation rules.';
  }
  if (type === 'env') {
    return 'Environment variable file. Stores configuration secrets or environment settings.';
  }
  if (type === 'lock') {
    return 'Dependency lock file. Ensures consistent dependency versions.';
  }
  if (type === 'config') {
    return 'Configuration file. Stores project or tool settings.';
  }
  if (type === 'test' || type === 'spec') {
    return 'Test or specification file. Contains tests or specs for the codebase.';
  }
  if (type === 'sql') {
    return 'SQL file. Contains database schema or queries.';
  }
  if (type === 'xml') {
    return 'XML file. Stores structured data or configuration.';
  }
  if (type === 'other') {
    if (firstLine.length > 0) {
      return `File: ${filePath}. Starts with: ${firstLine.slice(0, 80)}`;
    }
    return `File: ${filePath}. Content not recognized.`;
  }
  // Fallback
  return `File: ${filePath}. ${firstFew.slice(0, 120)}`;
} 