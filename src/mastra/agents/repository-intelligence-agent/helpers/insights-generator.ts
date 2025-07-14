/**
 * Insights Generator
 * -----------------
 * This file contains utilities for generating insights and analysis
 * from repository data and metrics.
 */

export interface RepositoryData {
  statistics: {
    stars: number;
    forks: number;
    openIssues: number;
    watchers: number;
    primaryLanguage: string | null;
  };
  activity: {
    lastPush: string;
    lastUpdate: string;
    createdAt: string;
  };
}

export interface LanguageData {
  [key: string]: number;
}

// Helper function to generate insights
export function generateInsights(
  repoData: RepositoryData,
  languages: LanguageData
): string {
  const insights = [];

  // Star insights
  if (repoData.statistics.stars > 1000) {
    insights.push(
      "🌟 **Star Power**: This repository has gained significant popularity with over 1,000 stars!"
    );
  } else if (repoData.statistics.stars > 100) {
    insights.push(
      "⭐ **Growing Community**: This repository is building a solid community with over 100 stars!"
    );
  }

  // Fork insights
  if (repoData.statistics.forks > 500) {
    insights.push(
      "🍴 **Fork Frenzy**: With over 500 forks, this project has inspired many developers to build upon it!"
    );
  } else if (repoData.statistics.forks > 50) {
    insights.push(
      "🍴 **Active Development**: The community is actively contributing with over 50 forks!"
    );
  }

  // Language insights
  const languageCount = Object.keys(languages).length;
  if (languageCount > 5) {
    insights.push(
      `💻 **Multi-Language Project**: This repository uses ${languageCount} different programming languages, showing great versatility!`
    );
  } else if (languageCount === 1) {
    insights.push(
      "💻 **Focused Development**: This project maintains a clean, single-language codebase!"
    );
  }

  // Activity insights
  const lastPush = new Date(repoData.activity.lastPush);
  const daysSinceLastPush = Math.floor(
    (Date.now() - lastPush.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastPush < 7) {
    insights.push(
      "🚀 **Very Active**: This repository was updated within the last week - it's actively maintained!"
    );
  } else if (daysSinceLastPush < 30) {
    insights.push(
      "📈 **Regular Updates**: This repository receives regular updates and maintenance!"
    );
  }

  // Issue insights
  if (repoData.statistics.openIssues > 100) {
    insights.push(
      "🐛 **High Engagement**: With over 100 open issues, this project has high community engagement!"
    );
  } else if (repoData.statistics.openIssues < 10) {
    insights.push(
      "✨ **Well Maintained**: Very few open issues suggest excellent project maintenance!"
    );
  }

  return insights.length > 0 ? insights.join("\n\n") : "📊 **Repository Analysis Complete**: All metrics have been successfully analyzed!";
} 