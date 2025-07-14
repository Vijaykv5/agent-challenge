/**
 * Chart Generation Utilities
 * --------------------------
 * This file contains utilities for generating various types of charts
 * using QuickChart.io API for repository visualizations.
 */

// Chart generation utilities
export function generateBarChartUrl({
  stars,
  forks,
  openIssues,
  openPRs,
  closedPRs,
}: {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  closedPRs: number;
}) {
  const safeData = [stars, forks, openIssues, openPRs, closedPRs].map((x) =>
    typeof x === "number" && isFinite(x) ? x : 0
  );
  // If all data is zero, treat as no data
  if (safeData.every((x) => x === 0)) return "";
  const chartConfig = {
    type: "bar",
    data: {
      labels: ["Stars", "Forks", "Open Issues", "Open PRs", "Closed PRs"],
      datasets: [
        {
          label: "Repository Metrics",
          backgroundColor: [
            "#facc15",
            "#38bdf8",
            "#f87171",
            "#34d399",
            "#a78bfa",
          ],
          data: safeData,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Repository Statistics" },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  };
  try {
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=220`;
  } catch (e) {
    return "";
  }
}

export function getColorPalette(n: number): string[] {
  const baseColors = [
    "#facc15",
    "#38bdf8",
    "#f87171",
    "#34d399",
    "#a78bfa",
    "#fb7185",
    "#fbbf24",
    "#10b981",
    "#8b5cf6",
    "#06b6d4",
    "#eab308",
    "#0ea5e9",
    "#ef4444",
    "#22d3ee",
    "#6366f1",
    "#f472b6",
    "#fde68a",
    "#4ade80",
    "#c084fc",
    "#7dd3fc",
  ];
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

export function generatePieChartUrl(languages: { [key: string]: number }) {
  const languageNames =
    Array.isArray(Object.keys(languages)) && Object.keys(languages).length > 0
      ? Object.keys(languages)
      : [];
  const languageBytes =
    Array.isArray(Object.values(languages)) &&
    Object.values(languages).length > 0
      ? Object.values(languages)
      : [];
  if (languageNames.length === 0 || languageBytes.length === 0) return "";
  const colors = getColorPalette(languageNames.length);
  const chartConfig = {
    type: "pie",
    data: {
      labels: languageNames,
      datasets: [
        {
          data: languageBytes,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, position: "bottom" },
        title: { display: true, text: "Language Distribution" },
        datalabels: { display: false },
        tooltip: { enabled: false },
      },
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: null },
    },
  };
  try {
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=220`;
  } catch (e) {
    return "";
  }
}

// Generate a QuickChart line chart for commits over time
export function generateCommitsOverTimeChartUrl(commits: {
  labels: string[];
  data: number[];
}) {
  if (!commits.labels.length || !commits.data.length) return "";
  const chartConfig = {
    type: "line",
    data: {
      labels: commits.labels,
      datasets: [
        {
          label: "Commits per Week",
          data: commits.data,
          fill: false,
          borderColor: "#a78bfa",
          backgroundColor: "#a78bfa",
          tension: 0.2,
          pointRadius: 1,
          pointHoverRadius: 3,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Commits Over Time" },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  };
  try {
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=220`;
  } catch (e) {
    return "";
  }
} 