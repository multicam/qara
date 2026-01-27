#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.resolve(path.join(__dirname, '../state'));
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');

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

function initConfig() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    const initialConfig = {
      sources: [],
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2));
    log('Created new configuration file', colors.cyan);
  }
}

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    error(`Failed to load config: ${err.message}`);
    process.exit(1);
  }
}

function saveConfig(config) {
  config.last_updated = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function validateApiKey(service, apiKey) {
  try {
    if (service === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.ok;
    } else if (service === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } else if (service === 'opencode') {
      return true;
    }
    return true;
  } catch (err) {
    log(`Warning: Could not validate key: ${err.message}`, colors.yellow);
    return true;
  }
}

function listSources(config) {
  if (config.sources.length === 0) {
    info('No sources configured yet.');
    return;
  }

  log('\n📋 Configured Sources:', colors.cyan);
  config.sources.forEach((source, index) => {
    log(`\n${index + 1}. ${source.display_name || source.service}`, colors.cyan);
    log(`   Service: ${source.service}`);
    log(`   ID: ${source.id}`);
    log(`   Status: ${source.enabled ? '✓ Enabled' : '✗ Disabled'}`);
    if (source.models && source.models.length > 0) {
      log(`   Models: ${source.models.join(', ')}`);
    }
  });
  log('');
}

async function addSource() {
  log('\n🔧 Configure New Token Tracking Source', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  log('\nSupported services:');
  log('  1. Anthropic (Claude)');
  log('  2. OpenAI (GPT)');
  log('  3. OpenCode (local sessions)');
  log('  4. Custom service');
  log('');

  const serviceMap = {
    '1': 'anthropic',
    '2': 'openai',
    '3': 'opencode',
    '4': 'custom'
  };

  const choice = prompt('Select service (1-4): ');
  const service = serviceMap[choice];

  if (!service) {
    error('Invalid service selection');
    return;
  }

  let apiKey = null;
  if (service !== 'opencode') {
    apiKey = prompt('Enter API key: ');
    if (!apiKey || apiKey.trim().length === 0) {
      error('API key is required');
      return;
    }
  }

  const displayName = prompt(`Display name [default: ${service}]: `) || service;

  let endpoint = null;
  if (service === 'custom') {
    endpoint = prompt('Enter usage endpoint URL: ');
    if (!endpoint) {
      error('Endpoint URL is required for custom services');
      return;
    }
  }

  const trackModels = prompt('Track specific models? (y/N): ');
  let models = null;
  if (trackModels.toLowerCase() === 'y') {
    models = prompt('Enter comma-separated model names: ')
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }

  log('\nValidating API key...', colors.cyan);
  const isValid = await validateApiKey(service, apiKey);
  if (isValid) {
    success('API key validated');
  } else {
    log('Warning: API key validation failed, but continuing...', colors.yellow);
    const proceed = prompt('Continue anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      return;
    }
  }

  const source = {
    id: `src_${crypto.randomBytes(8).toString('hex')}`,
    service,
    display_name: displayName,
    api_key: apiKey,
    endpoint: endpoint || getDefaultEndpoint(service),
    models,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    enabled: true
  };

  const config = loadConfig();
  config.sources.push(source);
  saveConfig(config);

  success(`Source "${displayName}" configured successfully`);
  log(`ID: ${source.id}`, colors.cyan);
  log(`You can now track tokens from this source\n`);
}

function getDefaultEndpoint(service) {
  const endpoints = {
    anthropic: 'https://api.anthropic.com/v1/usage',
    openai: 'https://api.openai.com/v1/usage',
    opencode: 'local'
  };
  return endpoints[service] || null;
}

async function updateSource() {
  const config = loadConfig();
  listSources(config);

  if (config.sources.length === 0) {
    return;
  }

  const choice = prompt('\nEnter source number to update: ');
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= config.sources.length) {
    error('Invalid source number');
    return;
  }

  const source = config.sources[index];

  log(`\nUpdating: ${source.display_name}`, colors.cyan);
  log(`Current service: ${source.service}`);
  log(`ID: ${source.id}\n`);

  const updateKey = prompt('Update API key? (y/N): ');
  if (updateKey.toLowerCase() === 'y') {
    const newKey = prompt('Enter new API key: ');
    if (newKey && newKey.trim().length > 0) {
      source.api_key = newKey;
      log('Validating new API key...', colors.cyan);
      const isValid = await validateApiKey(source.service, newKey);
      if (isValid) {
        success('New API key validated');
      }
    }
  }

  const updateName = prompt(`Update display name [${source.display_name}?: `);
  if (updateName && updateName.trim().length > 0) {
    source.display_name = updateName;
  }

  const updateEnabled = prompt(`Toggle enabled status [currently: ${source.enabled ? 'enabled' : 'disabled'}]? (y/N): `);
  if (updateEnabled.toLowerCase() === 'y') {
    source.enabled = !source.enabled;
    log(`Source ${source.enabled ? 'enabled' : 'disabled'}`, source.enabled ? colors.green : colors.yellow);
  }

  source.last_updated = new Date().toISOString();
  saveConfig(config);
  success('Source updated successfully\n');
}

function removeSource() {
  const config = loadConfig();
  listSources(config);

  if (config.sources.length === 0) {
    return;
  }

  const choice = prompt('\nEnter source number to remove: ');
  const index = parseInt(choice) - 1;

  if (isNaN(index) || index < 0 || index >= config.sources.length) {
    error('Invalid source number');
    return;
  }

  const source = config.sources[index];
  const confirm = prompt(`Remove "${source.display_name}"? This cannot be undone. (yes/NO): `);

  if (confirm.toLowerCase() === 'yes') {
    config.sources.splice(index, 1);
    saveConfig(config);
    success(`Source "${source.display_name}" removed\n`);
  } else {
    log('Cancelled', colors.yellow);
  }
}

function prompt(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  initConfig();

  log('\n🔑 Token Tracker - Configure API Sources', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  const config = loadConfig();
  listSources(config);

  log('\nOptions:');
  log('  1. Add new source');
  log('  2. Update existing source');
  log('  3. Remove source');
  log('  4. List sources');
  log('  5. Exit');
  log('');

  const choice = prompt('Select option (1-5): ');

  switch (choice) {
    case '1':
      await addSource();
      break;
    case '2':
      await updateSource();
      break;
    case '3':
      removeSource();
      break;
    case '4':
      listSources(config);
      break;
    case '5':
      log('Goodbye!', colors.cyan);
      break;
    default:
      error('Invalid option');
  }

  process.exit(0);
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
