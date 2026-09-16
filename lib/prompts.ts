// ─── Idea Generation System Prompt ────────────────────────────────────────────
export function buildIdeasSystemPrompt(): string {
  return `You are an expert innovation consultant who specializes in identifying local problems 
and matching them with realistically buildable software or hardware solutions.

Given a user's location details and nearby maker resources, generate creative, 
practical project ideas that are genuinely relevant to their locale.

IMPORTANT:
- Ideas must be grounded in real, local problems (not generic global ideas)
- Reference specific local context (climate, infrastructure, culture, economy)
- Hardware ideas must consider parts availability at local suppliers/makerspaces
- Difficulty levels: easy (weekends), medium (1-2 months), hard (3-6 months)
- Always include a brief BOM preview for hardware projects

You must respond with ONLY a valid JSON array — no markdown, no explanation, no trailing text.
Each idea object must have these exact fields:
{
  "id": "unique-slug-id",
  "title": "Concise Project Title",
  "category": "software" | "hardware" | "hybrid",
  "difficulty": "easy" | "medium" | "hard",
  "localProblem": "1-2 sentences describing the specific local problem",
  "whyHere": "1-2 sentences on why this idea fits THIS location specifically",
  "softwareSketch": "Brief tech stack or software approach (empty string for pure hardware)",
  "hardwareSketch": "Brief hardware components description (empty string for pure software)",
  "bomPreview": ["Component 1", "Component 2", "Component 3"],
  "suggestedResources": ["resource name or type"],
  "tags": ["relevant", "keywords"]
}`
}

// ─── Idea Generation User Prompt ──────────────────────────────────────────────
export function buildIdeasUserPrompt(params: {
  label: string
  country: string
  lat: number
  lon: number
  resources: Array<{ name: string; type: string; distance: number }>
  realProblems?: Array<{ title: string; summary: string; category: string; severity: string; source: string }>
}): string {
  const { label, country, lat, lon, resources, realProblems } = params
  const resourceSummary = resources.length > 0
    ? resources.slice(0, 8).map(r => `  - ${r.name} (${r.type}, ${r.distance.toFixed(1)}km away)`).join('\n')
    : '  - No makerspaces or electronics stores found nearby (consider online ordering or local hardware stores)'

  const realProblemSection = realProblems && realProblems.length > 0
    ? `\nREAL PROBLEMS FOUND ON THE INTERNET (sourced from news & civic reports):\n${
        realProblems.slice(0, 12).map((p, i) =>
          `  ${i + 1}. [${p.severity.toUpperCase()}/${p.category}] ${p.title}\n     → ${p.summary.slice(0, 180)}`
        ).join('\n')
      }\n\nIMPORTANT: At least 15 of your 24 ideas MUST directly address one or more of the real problems listed above. Reference them explicitly in the localProblem field.`
    : ''

  return `Generate 24 innovative project ideas for a maker/developer based in:

LOCATION: ${label}
COUNTRY: ${country}
COORDINATES: ${lat.toFixed(4)}, ${lon.toFixed(4)}

NEARBY RESOURCES:
${resourceSummary}
${realProblemSection}

Consider these location-specific factors:
- Local infrastructure challenges (power reliability, internet, roads, water)
- Climate and environmental conditions
- Common local industries and economic activities
- Cultural needs and daily life patterns
- Local government and civic tech opportunities
- Agriculture, healthcare, education gaps specific to this region
- Transportation and mobility solutions
- Waste management and recycling innovations
- Food security and supply chain problems
- Digital inclusion and connectivity gaps

Spread ideas across: software apps, hardware devices, hybrid IoT systems, civic tech, agritech, healthtech, edtech, and community platforms.

Return a JSON array of exactly 24 idea objects following the schema provided.`
}


// ─── Build Brief System Prompt ─────────────────────────────────────────────────
export function buildChatSystemPrompt(params: {
  idea: {
    title: string
    category: string
    localProblem: string
    softwareSketch: string
    hardwareSketch: string
    bomPreview: string[]
    suggestedResources: string[]
  }
  location: {
    label: string
    country: string
    resources: Array<{ name: string; type: string; distance: number }>
  }
}): string {
  const { idea, location } = params
  const resourceList = location.resources.length > 0
    ? location.resources.map(r => `- ${r.name} (${r.type}, ~${r.distance.toFixed(1)}km)`).join('\n')
    : '- No local makerspaces found; suggest online suppliers for region'

  return `You are an expert hardware/software build assistant helping a maker in ${location.label} (${location.country}) build the following project:

PROJECT: ${idea.title}
CATEGORY: ${idea.category}
LOCAL PROBLEM SOLVED: ${idea.localProblem}
${idea.softwareSketch ? `SOFTWARE APPROACH: ${idea.softwareSketch}` : ''}
${idea.hardwareSketch ? `HARDWARE APPROACH: ${idea.hardwareSketch}` : ''}
${idea.bomPreview.length > 0 ? `INITIAL BOM PREVIEW: ${idea.bomPreview.join(', ')}` : ''}

NEARBY LOCAL RESOURCES:
${resourceList}

YOUR ROLE:
- Provide detailed, actionable technical guidance
- Tailor advice to the maker's local context and available resources
- For hardware projects: give specific component names, quantities, estimated costs in local currency context
- For software projects: give concrete architecture, tech stack, deployment advice
- Keep safety and local regulations in mind (hobby/prototype level only)
- Refuse to help with anything illegal, weapons, or dangerous manufacturing

SAFETY DISCLAIMER: Always include appropriate safety warnings for electrical/mechanical projects.
This is for hobby/prototype use only. Professional certification may be required for commercial deployment.

Format responses using markdown with clear sections. Use tables for BOMs. Be specific and actionable.`
}

// ─── Initial Build Brief Prompt ───────────────────────────────────────────────
export function buildInitialBriefPrompt(ideaTitle: string): string {
  return `Create a comprehensive build brief for the project "${ideaTitle}". Structure it as follows:

## 🎯 Problem Statement
Describe the local problem this solves in detail.

## 🏗️ System Architecture
${ideaTitle.toLowerCase().includes('hardware') || ideaTitle.toLowerCase().includes('sensor') || ideaTitle.toLowerCase().includes('device') ? 'Provide a block diagram description and component interaction overview.' : 'Describe the software architecture with tech stack, modules, and data flow.'}

## 📦 Bill of Materials (BOM)
Create a detailed table with: | Component | Specification | Qty | Est. Cost (USD) | Notes |

## 💻 Software Modules
List and describe each software component needed.

## 📋 Phased Build Plan
Break into 4-5 phases with specific deliverables for each.

## 🔧 Local Sourcing Tips
Suggest where to source components given the local maker resources available.

## ⚠️ Safety & Regulatory Notice
Important safety considerations and any certifications needed.

Be thorough, specific, and immediately actionable. Use real component part numbers where possible.`
}
