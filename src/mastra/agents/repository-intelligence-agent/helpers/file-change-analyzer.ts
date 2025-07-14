/**
 * File Change Analyzer
 * --------------------
 * This helper provides comprehensive analysis of file changes in PRs and commits,
 * including intelligent categorization, impact assessment, and human-readable summaries.
 */

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface FileChangeSummary {
  overview: string;
  detailedBreakdown: {
    fileTypes: Array<{
      type: string;
      count: number;
      files: string[];
      description: string;
    }>;
    changeTypes: {
      added: number;
      modified: number;
      deleted: number;
      renamed: number;
    };
    impactAreas: string[];
    complexity: string;
  };
  insights: string[];
  recommendations: string[];
}

// File type categories with descriptions
const FILE_CATEGORIES = {
  // Code files
  'javascript': { name: 'JavaScript', description: 'Frontend logic and functionality' },
  'typescript': { name: 'TypeScript', description: 'Type-safe JavaScript code' },
  'jsx': { name: 'JSX', description: 'React component files' },
  'tsx': { name: 'TSX', description: 'TypeScript React components' },
  'python': { name: 'Python', description: 'Backend logic and scripts' },
  'java': { name: 'Java', description: 'Java application code' },
  'cpp': { name: 'C++', description: 'System-level programming' },
  'c': { name: 'C', description: 'Low-level programming' },
  'go': { name: 'Go', description: 'Go language files' },
  'rust': { name: 'Rust', description: 'Rust language files' },
  'php': { name: 'PHP', description: 'PHP web development' },
  'ruby': { name: 'Ruby', description: 'Ruby application code' },
  'swift': { name: 'Swift', description: 'iOS/macOS development' },
  'kotlin': { name: 'Kotlin', description: 'Android/Kotlin development' },
  
  // Configuration files
  'json': { name: 'JSON Config', description: 'Configuration and data files' },
  'yaml': { name: 'YAML Config', description: 'Configuration and deployment files' },
  'yml': { name: 'YAML Config', description: 'Configuration and deployment files' },
  'toml': { name: 'TOML Config', description: 'Configuration files' },
  'ini': { name: 'INI Config', description: 'Configuration files' },
  'xml': { name: 'XML Config', description: 'Configuration and data files' },
  'properties': { name: 'Properties', description: 'Java properties files' },
  
  // Documentation
  'md': { name: 'Markdown', description: 'Documentation and guides' },
  'txt': { name: 'Text', description: 'Plain text documentation' },
  'rst': { name: 'reStructuredText', description: 'Python documentation' },
  'adoc': { name: 'AsciiDoc', description: 'Technical documentation' },
  
  // Styling and UI
  'css': { name: 'CSS', description: 'Styling and layout' },
  'scss': { name: 'SCSS', description: 'Advanced CSS styling' },
  'sass': { name: 'Sass', description: 'CSS preprocessing' },
  'less': { name: 'Less', description: 'CSS preprocessing' },
  'html': { name: 'HTML', description: 'Web page structure' },
  'svg': { name: 'SVG', description: 'Vector graphics' },
  
  // Testing
  'test': { name: 'Test Files', description: 'Unit and integration tests' },
  'spec': { name: 'Test Specs', description: 'Test specifications' },
  'specs': { name: 'Test Specs', description: 'Test specifications' },
  
  // Build and deployment
  'dockerfile': { name: 'Dockerfile', description: 'Container configuration' },
  'docker-compose': { name: 'Docker Compose', description: 'Multi-container setup' },
  'makefile': { name: 'Makefile', description: 'Build automation' },
  'gradle': { name: 'Gradle', description: 'Java build configuration' },
  'maven': { name: 'Maven', description: 'Java build configuration' },
  'pom': { name: 'Maven POM', description: 'Java project configuration' },
  
  // Package management
  'package.json': { name: 'Package Config', description: 'Node.js dependencies and scripts' },
  'package-lock.json': { name: 'Package Lock', description: 'Node.js dependency lock' },
  'requirements.txt': { name: 'Python Dependencies', description: 'Python package requirements' },
  'pipfile': { name: 'Pipfile', description: 'Python dependency management' },
  'cargo.toml': { name: 'Cargo Config', description: 'Rust dependencies' },
  'go.mod': { name: 'Go Modules', description: 'Go dependency management' },
  
  // Database and data
  'sql': { name: 'SQL', description: 'Database queries and schema' },
  'db': { name: 'Database', description: 'Database files' },
  'sqlite': { name: 'SQLite', description: 'SQLite database files' },
  
  // Shell and scripts
  'sh': { name: 'Shell Script', description: 'Unix/Linux shell scripts' },
  'bash': { name: 'Bash Script', description: 'Bash shell scripts' },
  'zsh': { name: 'Zsh Script', description: 'Zsh shell scripts' },
  'ps1': { name: 'PowerShell', description: 'Windows PowerShell scripts' },
  'bat': { name: 'Batch File', description: 'Windows batch scripts' },
  
  // Other
  'gitignore': { name: 'Git Ignore', description: 'Git ignore patterns' },
  'gitattributes': { name: 'Git Attributes', description: 'Git file attributes' },
  'editorconfig': { name: 'Editor Config', description: 'Editor configuration' },
  'eslintrc': { name: 'ESLint Config', description: 'JavaScript linting rules' },
  'prettierrc': { name: 'Prettier Config', description: 'Code formatting rules' },
  'babelrc': { name: 'Babel Config', description: 'JavaScript transpilation' },
  'webpack': { name: 'Webpack Config', description: 'Module bundling' },
  'rollup': { name: 'Rollup Config', description: 'Module bundling' },
  'vite': { name: 'Vite Config', description: 'Build tool configuration' },
  'tsconfig': { name: 'TypeScript Config', description: 'TypeScript configuration' },
  'jest.config': { name: 'Jest Config', description: 'Testing framework config' },
  'cypress': { name: 'Cypress Config', description: 'E2E testing configuration' },
  'playwright': { name: 'Playwright Config', description: 'Browser testing config' },
};

// Critical files that require special attention
const CRITICAL_FILES = [
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'requirements.txt', 'Pipfile', 'Pipfile.lock', 'poetry.lock',
  'Cargo.toml', 'Cargo.lock', 'go.mod', 'go.sum',
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'Makefile', 'CMakeLists.txt', 'build.gradle', 'pom.xml',
  '.env', '.env.example', '.env.local', '.env.production',
  'webpack.config.js', 'vite.config.js', 'rollup.config.js',
  'tsconfig.json', 'jsconfig.json', 'babel.config.js',
  'jest.config.js', 'cypress.config.js', 'playwright.config.js',
  'eslint.config.js', '.eslintrc.js', '.prettierrc.js',
  'tailwind.config.js', 'postcss.config.js', 'next.config.js',
  'nuxt.config.js', 'vite.config.ts', 'astro.config.mjs',
  'angular.json', 'vue.config.js', 'quasar.config.js',
  'firebase.json', 'vercel.json', 'netlify.toml',
  'README.md', 'CHANGELOG.md', 'LICENSE', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md'
];

// Security-sensitive files
const SECURITY_FILES = [
  '.env', '.env.local', '.env.production', '.env.staging',
  'secrets.json', 'config.json', 'credentials.json',
  'private.key', 'cert.pem', 'key.pem', '.pem',
  'auth.json', 'token.json', 'api-keys.json'
];

// Test-related patterns
const TEST_PATTERNS = [
  'test', 'spec', 'tests', '__tests__', '__mocks__',
  'e2e', 'integration', 'unit', 'cypress', 'playwright',
  'jest', 'vitest', 'mocha', 'chai', 'sinon'
];

export function analyzeFileChanges(files: FileChange[]): FileChangeSummary {
  if (!files || files.length === 0) {
    return {
      overview: "No files were changed in this update.",
      detailedBreakdown: {
        fileTypes: [],
        changeTypes: { added: 0, modified: 0, deleted: 0, renamed: 0 },
        impactAreas: [],
        complexity: "No changes"
      },
      insights: ["This appears to be an empty or metadata-only change."],
      recommendations: ["Verify that this change was intentional."]
    };
  }

  // Categorize files by type
  const fileTypeMap = new Map<string, { count: number; files: string[] }>();
  const changeTypes = { added: 0, modified: 0, deleted: 0, renamed: 0 };
  const criticalFilesFound: string[] = [];
  const securityFilesFound: string[] = [];
  const testFilesFound: string[] = [];
  const impactAreas: Set<string> = new Set();

  files.forEach(file => {
    // Count change types
    if (file.status === 'added') changeTypes.added++;
    else if (file.status === 'modified') changeTypes.modified++;
    else if (file.status === 'removed' || file.status === 'deleted') changeTypes.deleted++;
    else if (file.status === 'renamed') changeTypes.renamed++;

    // Categorize by file type
    const fileType = getFileType(file.filename);
    if (!fileTypeMap.has(fileType)) {
      fileTypeMap.set(fileType, { count: 0, files: [] });
    }
    const typeData = fileTypeMap.get(fileType)!;
    typeData.count++;
    typeData.files.push(file.filename);

    // Check for critical files
    if (CRITICAL_FILES.some(critical => file.filename.includes(critical))) {
      criticalFilesFound.push(file.filename);
      impactAreas.add('Configuration');
    }

    // Check for security files
    if (SECURITY_FILES.some(security => file.filename.includes(security))) {
      securityFilesFound.push(file.filename);
      impactAreas.add('Security');
    }

    // Check for test files
    if (TEST_PATTERNS.some(pattern => file.filename.toLowerCase().includes(pattern))) {
      testFilesFound.push(file.filename);
      impactAreas.add('Testing');
    }

    // Determine impact areas based on file type
    if (['js', 'ts', 'jsx', 'tsx', 'vue', 'svelte'].includes(fileType)) {
      impactAreas.add('Frontend');
    } else if (['py', 'java', 'cpp', 'c', 'go', 'rust', 'php', 'ruby'].includes(fileType)) {
      impactAreas.add('Backend');
    } else if (['css', 'scss', 'sass', 'less', 'html'].includes(fileType)) {
      impactAreas.add('Styling');
    } else if (['md', 'txt', 'rst', 'adoc'].includes(fileType)) {
      impactAreas.add('Documentation');
    } else if (['json', 'yaml', 'yml', 'toml', 'ini', 'xml'].includes(fileType)) {
      impactAreas.add('Configuration');
    } else if (['sql', 'db', 'sqlite'].includes(fileType)) {
      impactAreas.add('Database');
    }
  });

  // Generate overview
  const totalFiles = files.length;
  const totalChanges = files.reduce((sum, file) => sum + file.changes, 0);
  const overview = generateOverview(totalFiles, totalChanges, changeTypes, fileTypeMap);

  // Generate detailed breakdown
  const fileTypes = Array.from(fileTypeMap.entries()).map(([type, data]) => ({
    type: FILE_CATEGORIES[type as keyof typeof FILE_CATEGORIES]?.name || type.toUpperCase(),
    count: data.count,
    files: data.files,
    description: FILE_CATEGORIES[type as keyof typeof FILE_CATEGORIES]?.description || 'Unknown file type'
  }));

  // Determine complexity
  const complexity = determineComplexity(totalFiles, totalChanges, fileTypes, criticalFilesFound);

  // Generate insights
  const insights = generateInsights(
    files, fileTypes, changeTypes, criticalFilesFound, 
    securityFilesFound, testFilesFound, impactAreas
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    files, fileTypes, changeTypes, criticalFilesFound, 
    securityFilesFound, testFilesFound, complexity
  );

  return {
    overview,
    detailedBreakdown: {
      fileTypes,
      changeTypes,
      impactAreas: Array.from(impactAreas),
      complexity
    },
    insights,
    recommendations
  };
}

function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Handle special cases
  if (filename.includes('Dockerfile')) return 'dockerfile';
  if (filename.includes('docker-compose')) return 'docker-compose';
  if (filename.includes('package.json')) return 'package.json';
  if (filename.includes('requirements.txt')) return 'requirements.txt';
  if (filename.includes('Cargo.toml')) return 'cargo.toml';
  if (filename.includes('go.mod')) return 'go.mod';
  if (filename.includes('.gitignore')) return 'gitignore';
  if (filename.includes('.gitattributes')) return 'gitattributes';
  if (filename.includes('.editorconfig')) return 'editorconfig';
  if (filename.includes('.eslintrc')) return 'eslintrc';
  if (filename.includes('.prettierrc')) return 'prettierrc';
  if (filename.includes('.babelrc')) return 'babelrc';
  if (filename.includes('webpack.config')) return 'webpack';
  if (filename.includes('rollup.config')) return 'rollup';
  if (filename.includes('vite.config')) return 'vite';
  if (filename.includes('tsconfig')) return 'tsconfig';
  if (filename.includes('jest.config')) return 'jest.config';
  if (filename.includes('cypress.config')) return 'cypress';
  if (filename.includes('playwright.config')) return 'playwright';
  
  return extension;
}

function generateOverview(
  totalFiles: number, 
  totalChanges: number, 
  changeTypes: any, 
  fileTypeMap: Map<string, any>
): string {
  const fileTypeCount = fileTypeMap.size;
  const primaryFileType = Array.from(fileTypeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)[0];
  
  let overview = `This change affects ${totalFiles} file${totalFiles > 1 ? 's' : ''} with ${totalChanges} total modifications. `;
  
  if (primaryFileType) {
    const typeName = FILE_CATEGORIES[primaryFileType[0] as keyof typeof FILE_CATEGORIES]?.name || primaryFileType[0].toUpperCase();
    overview += `The primary focus is on ${typeName} files (${primaryFileType[1].count} files). `;
  }
  
  const changeSummary = [
    changeTypes.added ? `${changeTypes.added} added` : '',
    changeTypes.modified ? `${changeTypes.modified} modified` : '',
    changeTypes.deleted ? `${changeTypes.deleted} deleted` : '',
    changeTypes.renamed ? `${changeTypes.renamed} renamed` : ''
  ].filter(Boolean).join(', ');
  
  overview += `Files were ${changeSummary}.`;
  
  return overview;
}

function determineComplexity(
  totalFiles: number, 
  totalChanges: number, 
  fileTypes: any[], 
  criticalFiles: string[]
): string {
  if (criticalFiles.length > 0) {
    return "High Complexity - Critical configuration files modified";
  }
  
  if (totalFiles > 20) {
    return "High Complexity - Large number of files affected";
  }
  
  if (totalChanges > 1000) {
    return "High Complexity - Extensive code changes";
  }
  
  if (totalFiles > 10 || totalChanges > 500) {
    return "Medium-High Complexity - Significant scope of changes";
  }
  
  if (fileTypes.length > 5) {
    return "Medium Complexity - Multiple file types affected";
  }
  
  if (totalFiles > 5 || totalChanges > 100) {
    return "Medium Complexity - Moderate scope of changes";
  }
  
  return "Low Complexity - Small, focused changes";
}

function generateInsights(
  files: FileChange[], 
  fileTypes: any[], 
  changeTypes: any, 
  criticalFiles: string[], 
  securityFiles: string[], 
  testFiles: string[], 
  impactAreas: Set<string>
): string[] {
  const insights: string[] = [];
  
  // File type insights
  if (fileTypes.length === 1) {
    insights.push(`Focused change targeting only ${fileTypes[0].type} files`);
  } else if (fileTypes.length > 5) {
    insights.push(`Broad change affecting ${fileTypes.length} different file types`);
  }
  
  // Change type insights
  if (changeTypes.added > changeTypes.modified) {
    insights.push("Primarily adding new functionality rather than modifying existing code");
  } else if (changeTypes.deleted > changeTypes.added) {
    insights.push("More files deleted than added - likely cleanup or refactoring");
  }
  
  // Critical file insights
  if (criticalFiles.length > 0) {
    insights.push(`Critical configuration files modified: ${criticalFiles.join(', ')}`);
  }
  
  // Security insights
  if (securityFiles.length > 0) {
    insights.push("⚠️ Security-sensitive files detected - review carefully");
  }
  
  // Test insights
  if (testFiles.length > 0) {
    insights.push(`Includes ${testFiles.length} test file${testFiles.length > 1 ? 's' : ''} - good testing coverage`);
  } else if (changeTypes.added > 0) {
    insights.push("New functionality added without corresponding test files");
  }
  
  // Impact area insights
  if (impactAreas.has('Frontend') && impactAreas.has('Backend')) {
    insights.push("Full-stack changes affecting both frontend and backend");
  }
  
  if (impactAreas.has('Configuration')) {
    insights.push("Configuration changes may affect deployment or build processes");
  }
  
  return insights;
}

function generateRecommendations(
  files: FileChange[], 
  fileTypes: any[], 
  changeTypes: any, 
  criticalFiles: string[], 
  securityFiles: string[], 
  testFiles: string[], 
  complexity: string
): string[] {
  const recommendations: string[] = [];
  
  // Security recommendations
  if (securityFiles.length > 0) {
    recommendations.push("🔒 Review security-sensitive files carefully and ensure no secrets are exposed");
  }
  
  // Critical file recommendations
  if (criticalFiles.length > 0) {
    recommendations.push("⚙️ Test configuration changes thoroughly in a staging environment");
  }
  
  // Testing recommendations
  if (testFiles.length === 0 && changeTypes.added > 0) {
    recommendations.push("🧪 Consider adding tests for new functionality");
  }
  
  // Complexity recommendations
  if (complexity.includes("High")) {
    recommendations.push("📋 Consider breaking this into smaller, more focused changes");
  }
  
  // File type recommendations
  if (fileTypes.some(ft => ft.type.includes('Config'))) {
    recommendations.push("🔧 Verify that configuration changes are compatible with existing deployments");
  }
  
  if (fileTypes.some(ft => ft.type.includes('Package'))) {
    recommendations.push("📦 Review dependency changes for potential breaking changes or security updates");
  }
  
  // Documentation recommendations
  if (changeTypes.added > 0 && !fileTypes.some(ft => ft.type.includes('Documentation'))) {
    recommendations.push("📚 Consider updating documentation for new functionality");
  }
  
  return recommendations;
}

// Helper function to get a human-readable summary for PR descriptions
export function getFileChangeSummary(files: FileChange[]): string {
  const analysis = analyzeFileChanges(files);
  return analysis.overview;
}

// Helper function to get detailed analysis for tool outputs
export function getDetailedFileAnalysis(files: FileChange[]): {
  summary: string;
  fileTypes: string;
  changeTypes: string;
  impact: string;
} {
  const analysis = analyzeFileChanges(files);
  
  const fileTypes = analysis.detailedBreakdown.fileTypes
    .map(ft => `${ft.count} ${ft.type}`)
    .join(', ');
  
  const changeTypes = [
    analysis.detailedBreakdown.changeTypes.added ? `${analysis.detailedBreakdown.changeTypes.added} added` : '',
    analysis.detailedBreakdown.changeTypes.modified ? `${analysis.detailedBreakdown.changeTypes.modified} modified` : '',
    analysis.detailedBreakdown.changeTypes.deleted ? `${analysis.detailedBreakdown.changeTypes.deleted} deleted` : '',
    analysis.detailedBreakdown.changeTypes.renamed ? `${analysis.detailedBreakdown.changeTypes.renamed} renamed` : ''
  ].filter(Boolean).join(', ');
  
  const impact = analysis.detailedBreakdown.impactAreas.join(', ');
  
  return {
    summary: analysis.overview,
    fileTypes,
    changeTypes,
    impact
  };
} 