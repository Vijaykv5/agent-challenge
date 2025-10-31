import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { run as runResumeParser, CandidateSchema, ResumeFileSchema } from './resume-parser';
import { run as runRoleMatcher, MatchResultSchema } from './role-matcher';
import { run as runAssignmentGenerator, AssignmentOutputSchema } from './assignment-generator';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export type WeatherToolResult = z.infer<typeof WeatherToolResultSchema>;

const WeatherToolResultSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
});

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: WeatherToolResultSchema,
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

// Content Studio Tools
export type WriterToolResult = z.infer<typeof WriterToolResultSchema>;

const WriterToolResultSchema = z.object({
  content: z.string(),
  title: z.string(),
  wordCount: z.number(),
  topics: z.array(z.string()),
});

export const writerTool = createTool({
  id: 'content-writer',
  description: 'Generate compelling written content based on a prompt',
  inputSchema: z.object({
    prompt: z.string().describe('The writing prompt or topic'),
    contentType: z.string().optional().describe('Type of content (blog, article, social media, etc.)'),
  }),
  outputSchema: WriterToolResultSchema,
  execute: async ({ context }) => {
    return await generateContent(context.prompt, context.contentType);
  },
});

const generateContent = async (prompt: string, contentType?: string): Promise<WriterToolResult> => {
  // Clean and process the prompt to extract the actual topic
  const cleanPrompt = prompt
    .replace(/^(give me|write|create|generate|make).*?(about|on|for)\s*/i, '')
    .replace(/^(content|article|blog|post)\s*(about|on|for)\s*/i, '')
    .replace(/[:\-\.]+$/, '')
    .trim();

  const topic = cleanPrompt || prompt;
  
  const contentTypes = {
    blog: 'blog post',
    article: 'article',
    social: 'social media post',
    email: 'email content',
    default: 'content'
  };
  
  const type = contentType || 'default';
  const contentTypeName = contentTypes[type as keyof typeof contentTypes] || contentTypes.default;
  
  // Generate intelligent content based on the topic
  const mockContent = generateIntelligentContent(topic, contentTypeName);

  const words = mockContent.split(/\s+/).length;
  const topics = extractTopics(topic);
  
  return {
    content: mockContent,
    title: `${topic}: A Comprehensive Guide`,
    wordCount: words,
    topics: topics,
  };
};

const generateIntelligentContent = (topic: string, contentTypeName: string): string => {
  // Generate topic-specific content
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('ai') || topicLower.includes('artificial intelligence')) {
    return `# ${topic}: A Comprehensive Guide

## Introduction
Artificial Intelligence has revolutionized the way we work, communicate, and solve problems. From chatbots and virtual assistants to machine learning algorithms and automation tools, AI assistance software has become an integral part of modern business operations and personal productivity.

## Key Applications of AI Assistance Software

### 1. Business Automation
AI-powered tools streamline repetitive tasks, reducing human error and increasing efficiency. From data entry and customer service to inventory management and financial analysis, businesses are leveraging AI to optimize their operations.

### 2. Content Creation and Marketing
AI writing assistants help create compelling copy, generate social media content, and optimize SEO strategies. These tools can analyze audience preferences and create personalized marketing campaigns at scale.

### 3. Customer Support and Service
Intelligent chatbots and virtual assistants provide 24/7 customer support, handling inquiries, resolving issues, and escalating complex problems to human agents when necessary.

### 4. Data Analysis and Insights
AI software processes vast amounts of data to identify patterns, predict trends, and provide actionable insights that drive strategic decision-making.

## Benefits of AI Assistance Software

- **Increased Productivity**: Automate routine tasks to focus on high-value activities
- **Cost Reduction**: Reduce operational costs through automation and efficiency
- **Improved Accuracy**: Minimize human errors in data processing and analysis
- **Scalability**: Handle growing workloads without proportional increases in resources
- **24/7 Availability**: Provide continuous service and support

## Best Practices for Implementation

### 1. Start Small and Scale Gradually
Begin with pilot projects to understand AI capabilities and limitations before full-scale implementation.

### 2. Ensure Data Quality
AI systems are only as good as the data they're trained on. Invest in data cleaning and validation processes.

### 3. Maintain Human Oversight
While AI can handle many tasks autonomously, human supervision ensures quality and handles edge cases.

### 4. Focus on User Experience
Design AI tools with user-friendly interfaces and clear communication about AI capabilities and limitations.

## Future Trends

The AI assistance software landscape continues to evolve rapidly. Emerging trends include:
- More sophisticated natural language processing
- Integration with IoT devices and smart environments
- Enhanced personalization and adaptive learning
- Improved ethical AI practices and transparency

## Conclusion

AI assistance software represents a transformative opportunity for organizations and individuals to enhance productivity, improve decision-making, and create more efficient workflows. By understanding the capabilities, benefits, and best practices outlined in this guide, you can successfully integrate AI tools into your operations and stay competitive in an increasingly digital world.

---

*This comprehensive guide provides insights into AI assistance software applications, benefits, and implementation strategies for modern organizations.*`;
  }
  
  if (topicLower.includes('technology') || topicLower.includes('tech')) {
    return `# ${topic}: A Comprehensive Guide

## Introduction
Technology continues to reshape our world at an unprecedented pace. From artificial intelligence and blockchain to cloud computing and the Internet of Things, technological innovations are transforming industries and creating new opportunities for growth and development.

## Current Technological Landscape

### 1. Artificial Intelligence and Machine Learning
AI and ML technologies are enabling smarter automation, predictive analytics, and personalized user experiences across various sectors.

### 2. Cloud Computing and Edge Computing
Cloud platforms provide scalable infrastructure while edge computing brings processing power closer to data sources for faster response times.

### 3. Cybersecurity and Data Protection
As digital transformation accelerates, robust cybersecurity measures become essential to protect sensitive information and maintain trust.

### 4. Sustainable Technology Solutions
Green tech innovations are addressing environmental challenges while creating economic opportunities in renewable energy and sustainable practices.

## Impact on Industries

Technology is revolutionizing sectors including healthcare, finance, education, manufacturing, and retail through automation, data analytics, and enhanced connectivity.

## Future Outlook

The convergence of multiple technologies will create new possibilities for innovation, requiring organizations to adapt and invest in digital capabilities to remain competitive.

---

*This guide explores the current state and future potential of technology across various industries and applications.*`;
  }
  
  if (topicLower.includes('business') || topicLower.includes('marketing')) {
    return `# ${topic}: A Comprehensive Guide

## Introduction
Modern business success requires strategic thinking, innovative approaches, and adaptability in an ever-changing marketplace. This guide explores key strategies and practices that drive sustainable growth and competitive advantage.

## Strategic Planning and Execution

### 1. Market Analysis and Positioning
Understanding your target market, competitive landscape, and unique value proposition is fundamental to business success.

### 2. Customer-Centric Approaches
Building strong customer relationships through excellent service, personalized experiences, and continuous value delivery.

### 3. Operational Excellence
Streamlining processes, optimizing resources, and maintaining quality standards to ensure efficient operations.

## Growth Strategies

- **Digital Transformation**: Leverage technology to improve efficiency and reach new markets
- **Innovation and R&D**: Invest in research and development to stay ahead of competitors
- **Strategic Partnerships**: Collaborate with complementary businesses to expand capabilities
- **Talent Development**: Invest in your team's skills and capabilities

## Measuring Success

Key performance indicators (KPIs) help track progress and make data-driven decisions for continuous improvement.

## Conclusion

Success in today's business environment requires a combination of strategic vision, operational excellence, and continuous adaptation to market changes.

---

*This guide provides actionable insights for building and growing successful businesses in the modern economy.*`;
  }
  
  // Default content for other topics
  return `# ${topic}: A Comprehensive Guide

## Introduction
${topic} represents an important area of study and application in today's world. Understanding its principles, applications, and best practices is essential for success and growth in this field.

## Key Concepts and Principles

### 1. Foundational Understanding
Building a solid foundation in ${topic} requires understanding its core principles and fundamental concepts that drive success and innovation.

### 2. Practical Applications
Real-world applications of ${topic} demonstrate its versatility and impact across various industries and contexts.

### 3. Best Practices and Strategies
Implementing proven strategies and best practices ensures optimal results and sustainable growth in this area.

## Benefits and Opportunities

- **Enhanced Efficiency**: Streamlined processes and improved outcomes
- **Competitive Advantage**: Staying ahead in an evolving landscape
- **Innovation Potential**: Opportunities for creative solutions and improvements
- **Growth Opportunities**: Expanding capabilities and reaching new markets

## Implementation Guidelines

### 1. Planning and Preparation
Thorough planning and preparation are essential for successful implementation and long-term success.

### 2. Continuous Learning
Stay updated with latest developments and continuously improve your knowledge and skills.

### 3. Measurement and Optimization
Regular assessment and optimization ensure continued improvement and adaptation to changing conditions.

## Future Outlook

The field of ${topic} continues to evolve, presenting new opportunities and challenges that require ongoing adaptation and innovation.

## Conclusion

${topic} offers significant potential for growth, innovation, and success. By following the guidelines and strategies outlined in this guide, you can position yourself for success in this dynamic and evolving field.

---

*This comprehensive guide provides insights and strategies for success in the field of ${topic}.*`;
};

const extractTopics = (prompt: string): string[] => {
  const commonTopics = ['technology', 'business', 'marketing', 'strategy', 'innovation', 'growth', 'leadership', 'productivity'];
  return commonTopics.filter(topic => 
    prompt.toLowerCase().includes(topic) || Math.random() > 0.7
  ).slice(0, 3);
};

export type EditorToolResult = z.infer<typeof EditorToolResultSchema>;

const EditorToolResultSchema = z.object({
  editedContent: z.string(),
  improvements: z.array(z.string()),
  readabilityScore: z.number(),
  suggestions: z.array(z.string()),
});

export const editorTool = createTool({
  id: 'content-editor',
  description: 'Review, edit, and improve written content',
  inputSchema: z.object({
    content: z.string().describe('The content to be edited'),
    focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on (grammar, clarity, SEO, etc.)'),
  }),
  outputSchema: EditorToolResultSchema,
  execute: async ({ context }) => {
    return await editContent(context.content, context.focusAreas);
  },
});

const editContent = async (content: string, focusAreas?: string[]): Promise<EditorToolResult> => {
  // Simulate content editing
  const improvements = [
    'Enhanced sentence structure for better flow',
    'Improved paragraph transitions',
    'Optimized for SEO with relevant keywords',
    'Corrected grammatical errors',
    'Enhanced readability and clarity',
    'Added compelling call-to-action',
  ];
  
  const suggestions = [
    'Consider adding more specific examples',
    'Include relevant statistics or data points',
    'Add subheadings for better structure',
    'Consider adding a FAQ section',
    'Include relevant images or graphics',
  ];
  
  // Simulate edited content with improvements
  const editedContent = content
    .replace(/\.\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim() + '\n\n*This content has been professionally edited for clarity, grammar, and impact.*';
  
  const readabilityScore = Math.floor(Math.random() * 20) + 80; // 80-100 score
  
  return {
    editedContent,
    improvements: improvements.slice(0, 4),
    readabilityScore,
    suggestions: suggestions.slice(0, 3),
  };
};

export type DesignerToolResult = z.infer<typeof DesignerToolResultSchema>;

const DesignerToolResultSchema = z.object({
  designDescription: z.string(),
  colorPalette: z.array(z.string()),
  typography: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  layout: z.string(),
  mockupUrl: z.string(),
});

export const designerTool = createTool({
  id: 'content-designer',
  description: 'Create visual designs and layouts for content',
  inputSchema: z.object({
    content: z.string().describe('The content to design for'),
    designType: z.string().optional().describe('Type of design (web, print, social media, etc.)'),
    brandColors: z.array(z.string()).optional().describe('Brand colors to incorporate'),
  }),
  outputSchema: DesignerToolResultSchema,
  execute: async ({ context }) => {
    return await createDesign(context.content, context.designType, context.brandColors);
  },
});

const createDesign = async (content: string, designType?: string, brandColors?: string[]): Promise<DesignerToolResult> => {
  const type = designType || 'web';
  
  const colorPalettes = {
    modern: ['#2563eb', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
    vibrant: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d'],
    elegant: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'],
    creative: ['#7c3aed', '#a855f7', '#c084fc', '#e879f9', '#f0abfc'],
    professional: ['#1f2937', '#374151', '#6b7280', '#9ca3af', '#f3f4f6'],
    nature: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  };
  
  const typographyOptions = {
    heading: ['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Playfair Display'],
    body: ['Inter', 'Source Sans Pro', 'Lato', 'Nunito', 'Roboto', 'Merriweather'],
  };
  
  const layouts = [
    'Clean minimalist layout with ample white space',
    'Grid-based design with structured content blocks',
    'Asymmetrical layout with dynamic visual hierarchy',
    'Card-based design with interactive elements',
    'Magazine-style layout with multiple columns',
  ];
  
  const paletteKey = Object.keys(colorPalettes)[Math.floor(Math.random() * Object.keys(colorPalettes).length)];
  const colors = brandColors && brandColors.length > 0 ? brandColors : colorPalettes[paletteKey as keyof typeof colorPalettes];
  
  // Generate multiple design mockups
  const mockups = generateDesignMockups(content, colors, type);
  
  const selectedLayout = layouts[Math.floor(Math.random() * layouts.length)];
  const designDescription = `Created a professional ${type} design featuring ${selectedLayout.toLowerCase()}. The design uses a carefully curated color palette with ${colors.length} complementary colors and modern typography (${typographyOptions.heading[Math.floor(Math.random() * typographyOptions.heading.length)]} for headings, ${typographyOptions.body[Math.floor(Math.random() * typographyOptions.body.length)]} for body text) to ensure optimal readability and visual hierarchy. The layout emphasizes user experience with clean spacing, intuitive navigation, and responsive design principles.`;
  
  return {
    designDescription,
    colorPalette: colors,
    typography: {
      heading: typographyOptions.heading[Math.floor(Math.random() * typographyOptions.heading.length)],
      body: typographyOptions.body[Math.floor(Math.random() * typographyOptions.body.length)],
    },
    layout: layouts[Math.floor(Math.random() * layouts.length)],
    mockupUrl: mockups[0], // Primary mockup
  };
};

const generateDesignMockups = (content: string, colors: string[], designType: string): string[] => {
  const primaryColor = colors[0];
  const secondaryColor = colors[1] || '#ffffff';
  const accentColor = colors[2] || '#000000';
  
  // Generate SVG-based mockups instead of placeholder images
  const mockups: string[] = [];
  
  if (designType === 'web') {
    // Web design mockups with realistic layouts
    mockups.push(generateWebDesignSVG(primaryColor, secondaryColor, accentColor, 'Website Homepage'));
    mockups.push(generateMobileDesignSVG(primaryColor, secondaryColor, accentColor, 'Mobile App'));
    mockups.push(generateDashboardSVG(primaryColor, secondaryColor, accentColor, 'Dashboard'));
  } else if (designType === 'social') {
    // Social media mockups
    mockups.push(generateSocialPostSVG(primaryColor, secondaryColor, accentColor, 'Instagram Post'));
    mockups.push(generateBannerSVG(primaryColor, secondaryColor, accentColor, 'Facebook Banner'));
    mockups.push(generateStorySVG(primaryColor, secondaryColor, accentColor, 'Instagram Story'));
  } else if (designType === 'print') {
    // Print design mockups
    mockups.push(generateFlyerSVG(primaryColor, secondaryColor, accentColor, 'Marketing Flyer'));
    mockups.push(generateBrochureSVG(primaryColor, secondaryColor, accentColor, 'Brochure'));
    mockups.push(generateBusinessCardSVG(primaryColor, secondaryColor, accentColor, 'Business Card'));
  } else {
    // Generic mockups
    mockups.push(generateGenericDesignSVG(primaryColor, secondaryColor, accentColor, 'Main Design'));
    mockups.push(generateGenericDesignSVG(secondaryColor, primaryColor, accentColor, 'Alternative Layout'));
    mockups.push(generateGenericDesignSVG(accentColor, primaryColor, secondaryColor, 'Color Variant'));
  }
  
  return mockups;
};

const generateWebDesignSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="1200" height="80" fill="${accent}" opacity="0.9"/>
      <rect x="50" y="20" width="120" height="40" fill="${secondary}" rx="5"/>
      <rect x="200" y="30" width="80" height="20" fill="${secondary}" opacity="0.7" rx="3"/>
      <rect x="300" y="30" width="80" height="20" fill="${secondary}" opacity="0.7" rx="3"/>
      <rect x="400" y="30" width="80" height="20" fill="${secondary}" opacity="0.7" rx="3"/>
      
      <!-- Hero Section -->
      <rect x="100" y="150" width="1000" height="300" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="150" y="200" width="400" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="150" y="260" width="600" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="150" y="300" width="500" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="150" y="340" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Content Cards -->
      <rect x="100" y="500" width="300" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="120" y="520" width="260" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="120" y="560" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="120" y="590" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <rect x="450" y="500" width="300" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="470" y="520" width="260" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="470" y="560" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="470" y="590" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <rect x="800" y="500" width="300" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="820" y="520" width="260" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="820" y="560" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="820" y="590" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <!-- Title -->
      <text x="600" y="50" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Resume Parser Tool
export const resumeParserTool = createTool({
  id: 'resume-parser',
  description: 'Parse uploaded resume files (PDF/DOCX/TXT) into structured candidate JSON',
  inputSchema: z.object({
    files: z.array(ResumeFileSchema).describe('Array of uploaded resume files as base64 payloads'),
  }),
  outputSchema: z.array(CandidateSchema),
  execute: async ({ context }) => {
    const { files } = context as { files: unknown };
    return await runResumeParser(files as any);
  },
});

// Role Matcher Tool
export const roleMatcherTool = createTool({
  id: 'role-matcher',
  description: 'Match parsed resumes with a job description and return ranked results',
  inputSchema: z.object({
    jobDescription: z.string().describe('Job description or skill query to match against'),
  }),
  outputSchema: z.array(MatchResultSchema),
  execute: async ({ context }) => {
    const { jobDescription } = context as { jobDescription: string };
    return await runRoleMatcher(jobDescription);
  },
});

// Assignment Generator Tool (dynamic LLM-backed)
export const assignmentGeneratorTool = createTool({
  id: 'assignment-generator',
  description: 'Generate a role-appropriate assignment email (subject + body) from a description and optional role',
  inputSchema: z.object({
    description: z.string().describe('Freeform description of what to assess'),
    role: z.string().optional().describe('Candidate role if known'),
  }),
  outputSchema: AssignmentOutputSchema,
  execute: async ({ context }) => {
    const { description, role } = context as { description: string; role?: string };
    return await runAssignmentGenerator(description, role);
  },
});

const generateMobileDesignSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="400" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mobileBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="700" fill="url(#mobileBg)" rx="30"/>
      
      <!-- Status Bar -->
      <rect x="20" y="20" width="360" height="30" fill="${accent}" opacity="0.1" rx="15"/>
      <circle cx="50" cy="35" r="5" fill="${accent}" opacity="0.7"/>
      <rect x="70" y="30" width="100" height="10" fill="${accent}" opacity="0.7" rx="5"/>
      
      <!-- Header -->
      <rect x="40" y="80" width="320" height="60" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="60" y="100" width="200" height="20" fill="${accent}" opacity="0.8" rx="3"/>
      
      <!-- Main Content -->
      <rect x="40" y="170" width="320" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="60" y="190" width="280" height="30" fill="${accent}" opacity="0.7" rx="5"/>
      <rect x="60" y="240" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="60" y="270" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="60" y="300" width="150" height="40" fill="${primary}" rx="5"/>
      
      <!-- Cards -->
      <rect x="40" y="400" width="320" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="60" y="420" width="280" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="60" y="460" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="60" y="485" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <rect x="40" y="550" width="320" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="60" y="570" width="280" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="60" y="610" width="200" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="60" y="635" width="180" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <!-- Title -->
      <text x="200" y="50" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateDashboardSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dashboardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#dashboardBg)"/>
      
      <!-- Sidebar -->
      <rect x="0" y="0" width="200" height="700" fill="${accent}" opacity="0.1"/>
      <rect x="20" y="30" width="160" height="40" fill="${secondary}" opacity="0.2" rx="5"/>
      <rect x="20" y="90" width="160" height="30" fill="${secondary}" opacity="0.1" rx="3"/>
      <rect x="20" y="140" width="160" height="30" fill="${secondary}" opacity="0.1" rx="3"/>
      <rect x="20" y="190" width="160" height="30" fill="${secondary}" opacity="0.1" rx="3"/>
      
      <!-- Header -->
      <rect x="200" y="0" width="800" height="80" fill="${secondary}" opacity="0.1"/>
      <rect x="220" y="20" width="200" height="40" fill="${accent}" opacity="0.7" rx="5"/>
      <circle cx="700" cy="40" r="15" fill="${primary}"/>
      <circle cx="750" cy="40" r="15" fill="${accent}" opacity="0.7"/>
      
      <!-- Main Content Area -->
      <rect x="220" y="100" width="760" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="240" y="120" width="400" height="30" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="240" y="170" width="300" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="240" y="210" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Charts/Widgets -->
      <rect x="220" y="320" width="360" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="240" y="340" width="320" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="240" y="380" width="280" height="120" fill="${primary}" opacity="0.1" rx="5"/>
      
      <rect x="600" y="320" width="360" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="620" y="340" width="320" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="620" y="380" width="280" height="120" fill="${primary}" opacity="0.1" rx="5"/>
      
      <!-- Bottom Stats -->
      <rect x="220" y="540" width="180" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="240" y="560" width="140" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="240" y="600" width="100" height="40" fill="${primary}" rx="5"/>
      
      <rect x="420" y="540" width="180" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="440" y="560" width="140" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="440" y="600" width="100" height="40" fill="${primary}" rx="5"/>
      
      <rect x="620" y="540" width="180" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="640" y="560" width="140" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="640" y="600" width="100" height="40" fill="${primary}" rx="5"/>
      
      <rect x="820" y="540" width="180" height="120" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="840" y="560" width="140" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="840" y="600" width="100" height="40" fill="${primary}" rx="5"/>
      
      <!-- Title -->
      <text x="500" y="50" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateSocialPostSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="socialBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1080" fill="url(#socialBg)" rx="20"/>
      
      <!-- Header -->
      <rect x="50" y="50" width="980" height="80" fill="${secondary}" opacity="0.1" rx="10"/>
      <circle cx="100" cy="90" r="20" fill="${accent}" opacity="0.8"/>
      <rect x="140" y="70" width="200" height="20" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="140" y="100" width="150" height="15" fill="${accent}" opacity="0.5" rx="2"/>
      
      <!-- Main Content -->
      <rect x="50" y="160" width="980" height="400" fill="${secondary}" opacity="0.1" rx="15"/>
      <rect x="80" y="200" width="400" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="80" y="260" width="600" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="300" width="500" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="340" width="400" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="380" width="300" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="420" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Image Placeholder -->
      <rect x="600" y="200" width="400" height="300" fill="${secondary}" opacity="0.2" rx="10"/>
      <rect x="650" y="250" width="300" height="200" fill="${accent}" opacity="0.1" rx="5"/>
      <circle cx="800" cy="350" r="30" fill="${accent}" opacity="0.3"/>
      
      <!-- Engagement Bar -->
      <rect x="50" y="600" width="980" height="60" fill="${secondary}" opacity="0.1" rx="10"/>
      <circle cx="100" cy="630" r="15" fill="${primary}"/>
      <circle cx="150" cy="630" r="15" fill="${accent}" opacity="0.7"/>
      <circle cx="200" cy="630" r="15" fill="${accent}" opacity="0.7"/>
      <rect x="250" y="620" width="200" height="20" fill="${accent}" opacity="0.5" rx="3"/>
      
      <!-- Comments -->
      <rect x="50" y="700" width="980" height="300" fill="${secondary}" opacity="0.05" rx="10"/>
      <rect x="80" y="730" width="200" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="760" width="400" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      <rect x="80" y="790" width="300" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <rect x="80" y="830" width="200" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="860" width="350" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      <rect x="80" y="890" width="250" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <!-- Title -->
      <text x="540" y="40" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateBannerSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bannerBg)" rx="15"/>
      
      <!-- Main Content -->
      <rect x="100" y="150" width="1000" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="150" y="200" width="500" height="50" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="150" y="270" width="600" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="150" y="320" width="400" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      
      <!-- CTA Button -->
      <rect x="150" y="380" width="200" height="50" fill="${primary}" rx="5"/>
      
      <!-- Decorative Elements -->
      <circle cx="900" cy="200" r="50" fill="${accent}" opacity="0.2"/>
      <circle cx="950" cy="300" r="30" fill="${accent}" opacity="0.3"/>
      <circle cx="850" cy="400" r="40" fill="${accent}" opacity="0.2"/>
      
      <!-- Title -->
      <text x="600" y="100" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="28" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateStorySVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="storyBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#storyBg)"/>
      
      <!-- Header -->
      <rect x="50" y="50" width="980" height="100" fill="${secondary}" opacity="0.1" rx="10"/>
      <circle cx="100" cy="100" r="25" fill="${accent}" opacity="0.8"/>
      <rect x="150" y="80" width="200" height="25" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="150" y="115" width="150" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      
      <!-- Main Content -->
      <rect x="50" y="200" width="980" height="600" fill="${secondary}" opacity="0.1" rx="15"/>
      <rect x="100" y="250" width="400" height="50" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="100" y="320" width="600" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="370" width="500" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="420" width="400" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="470" width="300" height="30" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="520" width="200" height="50" fill="${primary}" rx="5"/>
      
      <!-- Image Area -->
      <rect x="100" y="850" width="880" height="500" fill="${secondary}" opacity="0.1" rx="15"/>
      <rect x="150" y="900" width="780" height="400" fill="${accent}" opacity="0.1" rx="10"/>
      <circle cx="540" cy="1100" r="50" fill="${accent}" opacity="0.3"/>
      
      <!-- Bottom Content -->
      <rect x="50" y="1450" width="980" height="300" fill="${secondary}" opacity="0.1" rx="15"/>
      <rect x="100" y="1500" width="400" height="30" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="100" y="1550" width="600" height="25" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="1590" width="500" height="25" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="1630" width="300" height="25" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="1680" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Title -->
      <text x="540" y="40" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateFlyerSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="flyerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="1200" fill="url(#flyerBg)" rx="10"/>
      
      <!-- Header -->
      <rect x="50" y="50" width="700" height="150" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="100" width="300" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="100" y="160" width="200" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      
      <!-- Main Content -->
      <rect x="50" y="250" width="700" height="400" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="300" width="400" height="30" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="100" y="350" width="500" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="390" width="450" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="430" width="400" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="470" width="350" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="510" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Image Area -->
      <rect x="100" y="700" width="600" height="300" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="150" y="750" width="500" height="200" fill="${accent}" opacity="0.1" rx="5"/>
      <circle cx="400" cy="850" r="40" fill="${accent}" opacity="0.3"/>
      
      <!-- Footer -->
      <rect x="50" y="1050" width="700" height="100" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="1080" width="300" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="1110" width="200" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <!-- Title -->
      <text x="400" y="40" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateBrochureSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brochureBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#brochureBg)" rx="10"/>
      
      <!-- Left Panel -->
      <rect x="50" y="50" width="550" height="700" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="100" width="200" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="100" y="160" width="300" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="200" width="400" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="240" width="350" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="280" width="300" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="320" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Image Area -->
      <rect x="100" y="400" width="450" height="200" fill="${secondary}" opacity="0.1" rx="5"/>
      <rect x="150" y="450" width="350" height="100" fill="${accent}" opacity="0.1" rx="3"/>
      <circle cx="325" cy="500" r="25" fill="${accent}" opacity="0.3"/>
      
      <!-- Right Panel -->
      <rect x="650" y="50" width="500" height="700" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="700" y="100" width="200" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="700" y="160" width="300" height="25" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="700" y="200" width="400" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="700" y="240" width="350" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="700" y="280" width="300" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="700" y="320" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Content Blocks -->
      <rect x="700" y="400" width="400" height="80" fill="${secondary}" opacity="0.1" rx="5"/>
      <rect x="720" y="420" width="360" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="720" y="450" width="300" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <rect x="700" y="500" width="400" height="80" fill="${secondary}" opacity="0.1" rx="5"/>
      <rect x="720" y="520" width="360" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="720" y="550" width="300" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <rect x="700" y="600" width="400" height="80" fill="${secondary}" opacity="0.1" rx="5"/>
      <rect x="720" y="620" width="360" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="720" y="650" width="300" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <!-- Title -->
      <text x="600" y="40" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateBusinessCardSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#cardBg)" rx="15"/>
      
      <!-- Logo Area -->
      <rect x="50" y="50" width="100" height="100" fill="${secondary}" opacity="0.1" rx="10"/>
      <circle cx="100" cy="100" r="30" fill="${accent}" opacity="0.8"/>
      
      <!-- Company Name -->
      <rect x="200" y="60" width="200" height="30" fill="${accent}" opacity="0.8" rx="5"/>
      
      <!-- Contact Info -->
      <rect x="200" y="110" width="150" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="200" y="140" width="180" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="200" y="170" width="160" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      
      <!-- Decorative Elements -->
      <rect x="450" y="100" width="100" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <circle cx="500" cy="200" r="40" fill="${accent}" opacity="0.2"/>
      
      <!-- Bottom Info -->
      <rect x="50" y="300" width="500" height="60" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="80" y="320" width="200" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="80" y="350" width="150" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <!-- Title -->
      <text x="300" y="30" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateGenericDesignSVG = (primary: string, secondary: string, accent: string, title: string): string => {
  const svg = `
    <svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="genericBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#genericBg)" rx="15"/>
      
      <!-- Header -->
      <rect x="50" y="50" width="900" height="100" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="80" width="300" height="40" fill="${accent}" opacity="0.8" rx="5"/>
      <rect x="100" y="130" width="200" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      
      <!-- Main Content -->
      <rect x="50" y="200" width="900" height="300" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="230" width="400" height="30" fill="${accent}" opacity="0.7" rx="3"/>
      <rect x="100" y="280" width="500" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="320" width="450" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="360" width="400" height="20" fill="${accent}" opacity="0.5" rx="2"/>
      <rect x="100" y="400" width="200" height="40" fill="${primary}" rx="5"/>
      
      <!-- Side Content -->
      <rect x="600" y="230" width="300" height="200" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="620" y="250" width="260" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="620" y="290" width="200" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      <rect x="620" y="320" width="180" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      <rect x="620" y="350" width="150" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      <rect x="620" y="380" width="100" height="30" fill="${primary}" rx="5"/>
      
      <!-- Footer -->
      <rect x="50" y="550" width="900" height="100" fill="${secondary}" opacity="0.1" rx="10"/>
      <rect x="100" y="580" width="300" height="20" fill="${accent}" opacity="0.6" rx="3"/>
      <rect x="100" y="610" width="200" height="15" fill="${accent}" opacity="0.4" rx="2"/>
      
      <!-- Title -->
      <text x="500" y="40" text-anchor="middle" fill="${secondary}" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};