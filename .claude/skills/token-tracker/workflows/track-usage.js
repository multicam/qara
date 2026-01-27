#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(path.join(__dirname, '../state'));
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');
const USAGE_FILE = path.join(STATE_DIR, 'usage-data.json');
const ENV_FILE = path.resolve(path.join(__dirname, '../../../.env'));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function getDefaultEndpoint(service) {
  const endpoints = {
    anthropic: 'https://api.anthropic.com/v1/messages',
    openai: 'https://api.openai.com/v1/usage',
    opencode: 'local',
    zai: 'https://api.z.ai/v1/usage-query',
    gemini: 'https://antigravity.google/anthropic/v1/gemini/usage'
  };
  return endpoints[service] || null;
}

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    log('No .env file found, will use manual config only', colors.yellow);
    return {};
  }

  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          env[key] = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          env[key] = value.slice(1, -1);
        } else {
          env[key] = value;
        }
      }
    });

    return env;
  } catch (err) {
    log(`Warning: Could not load .env: ${err.message}`, colors.yellow);
    return {};
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    log('No manual config found, using .env file', colors.cyan);
    const env = loadEnv();

    return {
      sources: Object.entries(env)
        .filter(([key]) => key.includes('_API_KEY') || key.includes('_API_TOKEN'))
        .map(([envKey, apiKey]) => {
          const service = envKey.replace('_API_KEY', '').replace('_API_TOKEN', '').toLowerCase();
          const displayName = envKey.replace('_API_KEY', '').replace('_API_TOKEN', '');
          return {
            id: `src_env_${service}`,
            service,
            display_name: `${displayName} (.env)`,
            api_key: apiKey,
            endpoint: getDefaultEndpoint(service),
            models: null,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            enabled: true,
            source: 'env'
          };
        })
        .filter(source => getDefaultEndpoint(source.service) || source.service === 'zai' || source.service === 'gemini')
    };
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    error(`Failed to load config: ${err.message}`);
    process.exit(1);
  }
}

function loadUsageData() {
  if (!fs.existsSync(USAGE_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(USAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    error(`Failed to load usage data: ${err.message}`);
    return [];
  }
}

function saveUsageData(data) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

async function fetchAnthropicUsage(source) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': source.api_key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    });

    if (!response.ok) {
      log(`Note: Anthropic API returned ${response.status} - using session-based tracking`, colors.yellow);
      return {
        timestamp: new Date().toISOString(),
        service: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        tokens_used: 0,
        cost_estimate: 0,
        metadata: {
          source_id: source.id,
          display_name: source.display_name,
          note: 'API requires usage endpoint - tracking sessions'
        }
      };
    }

    const data = await response.json();

    return {
      timestamp: new Date().toISOString(),
      service: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      tokens_used: data.usage?.input_tokens + data.usage?.output_tokens || 0,
      cost_estimate: ((data.usage?.input_tokens || 0) * 0.000003 + (data.usage?.output_tokens || 0) * 0.000015),
      metadata: {
        source_id: source.id,
        display_name: source.display_name
      }
    };
  } catch (err) {
    log(`Failed to fetch Anthropic usage: ${err.message}`, colors.yellow);
    return null;
  }
}

async function fetchOpenAIUsage(source) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await fetch(`https://api.openai.com/v1/usage?start_date=${thirtyDaysAgo.toISOString().split('T')[0]}`, {
      headers: {
        'Authorization': `Bearer ${source.api_key}`
      }
    });

    if (!response.ok) {
      log(`Note: OpenAI API returned ${response.status} - using session-based tracking`, colors.yellow);
      return {
        timestamp: new Date().toISOString(),
        service: 'openai',
        model: 'gpt-4o',
        tokens_used: 0,
        cost_estimate: 0,
        metadata: {
          source_id: source.id,
          display_name: source.display_name,
          note: 'API requires specific usage endpoint - tracking sessions'
        }
      };
    }

    const data = await response.json();

    const totalTokens = data.data?.reduce((sum, item) => sum + (item.n_generated_tokens + item.n_prompt_tokens), 0) || 0;

    return {
      timestamp: new Date().toISOString(),
      service: 'openai',
      model: 'gpt-4o',
      tokens_used: totalTokens,
      cost_estimate: totalTokens * 0.00001,
      metadata: {
        source_id: source.id,
        display_name: source.display_name,
        request_count: data.data?.length || 0
      }
    };
  } catch (err) {
    log(`Failed to fetch OpenAI usage: ${err.message}`, colors.yellow);
    return null;
  }
}

function fetchOpenCodeUsage(source) {
  try {
    const sessionsDir = path.join(PAI_DIR, '.sessions');
    if (!fs.existsSync(sessionsDir)) {
      return null;
    }

    const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    let totalTokens = 0;

    sessionFiles.forEach(file => {
      try {
        const sessionData = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), 'utf8'));
        if (sessionData.usage) {
          totalTokens += sessionData.usage.input_tokens || 0;
          totalTokens += sessionData.usage.output_tokens || 0;
        }
      } catch (err) {
      }
    });

    return {
      timestamp: new Date().toISOString(),
      service: 'opencode',
      model: 'claude-sonnet-4',
      tokens_used: totalTokens,
      cost_estimate: totalTokens * 0.000015,
      metadata: {
        source_id: source.id,
        display_name: source.display_name,
        session_count: sessionFiles.length
      }
    };
  } catch (err) {
    log(`Failed to fetch OpenCode usage: ${err.message}`, colors.yellow);
    return null;
  }
}

async function fetchCustomUsage(source) {
  try {
    if (!source.endpoint) {
      return null;
    }

    const response = await fetch(source.endpoint, {
      headers: {
        'Authorization': `Bearer ${source.api_key}`
      }
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      timestamp: new Date().toISOString(),
      service: 'custom',
      model: 'unknown',
      tokens_used: data.tokens || 0,
      cost_estimate: data.cost || 0,
      metadata: {
        source_id: source.id,
        display_name: source.display_name,
        endpoint: source.endpoint
      }
    };
  } catch (err) {
    log(`Failed to fetch custom usage: ${err.message}`, colors.yellow);
    return null;
  }
}

/**
 * z.ai Model Pricing (GLM-4.7 Family - Dec 2025)
 *
 * Pricing tiers:
 * - glm-4.7: Premium ($3/mo Coding Plan), 200K context, best for agentic coding
 * - glm-4.7-flashx: Mid-tier, speed + affordability
 * - glm-4.7-flash: Free tier, general-purpose
 * - glm-4-32b-0414-128k: Budget ($0.1/M tokens), 128K context, research/Q&A
 * - glm-4.6v: Mid-tier, vision/multimodal
 */
const ZAI_MODEL_PRICING = {
  'glm-4.7': { input: 0.00001, output: 0.00003, tier: 'premium' },
  'glm-4.7-flashx': { input: 0.000005, output: 0.000015, tier: 'mid' },
  'glm-4.7-flash': { input: 0, output: 0, tier: 'free' },
  'glm-4-32b-0414-128k': { input: 0.0001 / 1000, output: 0.0001 / 1000, tier: 'budget' }, // $0.1/M tokens
  'glm-4.6v': { input: 0.000005, output: 0.000015, tier: 'mid' }
};

function generateZaiJwtToken(apiKey) {
  // z.ai API key format: {id}.{secret}
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid ZAI_API_KEY format. Expected: {id}.{secret}');
  }

  const [id, secret] = parts;
  const now = Date.now();

  // Simple JWT generation for z.ai (HS256)
  // In production, use jsonwebtoken library
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    api_key: id,
    exp: now + 3600000, // 1 hour
    timestamp: now
  })).toString('base64url');

  // For proper JWT, we'd need crypto.createHmac - simplified for now
  // The actual implementation should use the jwt library from hooks/lib/llm/zai.ts
  return `${header}.${payload}.placeholder`;
}

async function fetchZaiUsage(source) {
  try {
    // z.ai doesn't have a public usage API
    // Use session-based tracking by reading z.ai session files
    const zaiSessionsDir = path.join(STATE_DIR, '../../../.zai-sessions');

    if (fs.existsSync(zaiSessionsDir)) {
      const sessionFiles = fs.readdirSync(zaiSessionsDir).filter(f => f.endsWith('.json'));
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let modelUsage = {};

      sessionFiles.forEach(file => {
        try {
          const sessionData = JSON.parse(fs.readFileSync(path.join(zaiSessionsDir, file), 'utf8'));
          if (sessionData.usage) {
            totalInputTokens += sessionData.usage.input_tokens || 0;
            totalOutputTokens += sessionData.usage.output_tokens || 0;
            const model = sessionData.model || 'glm-4.7';
            modelUsage[model] = (modelUsage[model] || 0) + (sessionData.usage.input_tokens || 0) + (sessionData.usage.output_tokens || 0);
          }
        } catch (err) {
          // Skip invalid session files
        }
      });

      // Determine most used model
      const primaryModel = Object.entries(modelUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || 'glm-4.7';
      const pricing = ZAI_MODEL_PRICING[primaryModel] || ZAI_MODEL_PRICING['glm-4.7'];
      const costEstimate = (totalInputTokens * pricing.input) + (totalOutputTokens * pricing.output);

      return {
        timestamp: new Date().toISOString(),
        service: 'zai',
        model: primaryModel,
        tokens_used: totalInputTokens + totalOutputTokens,
        cost_estimate: costEstimate,
        metadata: {
          source_id: source.id,
          display_name: source.display_name,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          session_count: sessionFiles.length,
          pricing_tier: pricing.tier,
          tracking_method: 'session-based'
        }
      };
    }

    // Fallback: API key validation check
    log(`Note: z.ai uses JWT auth. Session tracking enabled.`, colors.cyan);
    log(`Models: glm-4.7 (agentic), glm-4.7-flashx (fast), glm-4-32b (budget)`, colors.cyan);

    return {
      timestamp: new Date().toISOString(),
      service: 'zai',
      model: 'glm-4.7',
      tokens_used: 0,
      cost_estimate: 0,
      metadata: {
        source_id: source.id,
        display_name: source.display_name,
        note: 'No usage API - session tracking enabled',
        models_available: Object.keys(ZAI_MODEL_PRICING),
        pricing: {
          'glm-4.7': 'Premium (Coding Plan $3/mo)',
          'glm-4-32b': 'Budget ($0.1/M tokens)',
          'glm-4.7-flash': 'Free tier'
        },
        tracking_method: 'session-based'
      }
    };
  } catch (err) {
    log(`Failed to fetch z.ai usage: ${err.message}`, colors.yellow);
    return null;
  }
}

async function fetchGeminiUsage(source) {
  try {
    log(`Note: antigravity.google endpoint not publicly documented`, colors.yellow);
    log(`Recommended: Use Google's official Gemini API`, colors.yellow);
    log(`Documentation: https://aistudio.google.com/app/apikey`, colors.cyan);
    
    return {
      timestamp: new Date().toISOString(),
      service: 'gemini',
      model: 'gemini-pro',
      tokens_used: 0,
      cost_estimate: 0,
      metadata: {
        source_id: source.id,
        display_name: source.display_name,
        note: 'Endpoint requires manual configuration',
        alternative: 'Use GOOGLE_API_KEY with official Gemini API'
      }
    };
  } catch (err) {
    log(`Failed to fetch Gemini usage: ${err.message}`, colors.yellow);
    return null;
  }
}

async function fetchUsageFromSource(source) {
  if (!source.enabled) {
    return null;
  }

  switch (source.service) {
    case 'anthropic':
      return await fetchAnthropicUsage(source);
    case 'openai':
      return await fetchOpenAIUsage(source);
    case 'opencode':
      return fetchOpenCodeUsage(source);
    case 'zai':
      return await fetchZaiUsage(source);
    case 'gemini':
      return await fetchGeminiUsage(source);
    case 'custom':
      return await fetchCustomUsage(source);
    case 'zai':
      return await fetchZaiUsage(source);
    case 'gemini':
      return await fetchGeminiUsage(source);
    default:
      return null;
  }
}

function checkDuplicates(newRecord, existingRecords) {
  const recentRecords = existingRecords.filter(r => {
    const recordTime = new Date(r.timestamp);
    const newTime = new Date(newRecord.timestamp);
    return (newTime - recordTime) < 60000;
  });

  return recentRecords.some(r => 
    r.service === newRecord.service && 
    r.metadata?.source_id === newRecord.metadata?.source_id
  );
}

async function main() {
  log('\n📊 Token Tracker - Fetching Usage Data', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  const config = loadConfig();
  const usageData = loadUsageData();

  if (config.sources.length === 0) {
    error('No sources configured. Run configure-source first.');
    process.exit(1);
  }

  log(`\nFetching from ${config.sources.length} source(s)...\n`, colors.cyan);

  const newRecords = [];
  let totalTokens = 0;
  let totalCost = 0;

  for (const source of config.sources) {
    log(`Fetching: ${source.display_name || source.service}...`);

    const record = await fetchUsageFromSource(source);

    if (record) {
      const isDuplicate = checkDuplicates(record, usageData);
      if (isDuplicate) {
        log(`  Skipped (recent duplicate)`, colors.yellow);
        continue;
      }

      newRecords.push(record);
      totalTokens += record.tokens_used;
      totalCost += record.cost_estimate;

      log(`  ✓ ${record.tokens_used.toLocaleString()} tokens`, colors.green);
      log(`  ✓ $${record.cost_estimate.toFixed(4)}`, colors.green);
    }
  }

  if (newRecords.length === 0) {
    error('No new usage data collected.');
    process.exit(1);
  }

  log(`\nSaving ${newRecords.length} record(s)...`);
  usageData.push(...newRecords);
  saveUsageData(usageData);

  success('\nUsage data updated successfully!');
  log(`\nSummary:`, colors.cyan);
  log(`  New Records: ${newRecords.length}`);
  log(`  Total Tokens: ${totalTokens.toLocaleString()}`);
  log(`  Total Cost: $${totalCost.toFixed(4)}`);
  log(`  Total Records: ${usageData.length}`);
  log('');
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
