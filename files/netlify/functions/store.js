const fs = require('fs');
const path = require('path');

/*
  Shared store handler for Netlify:
  - GET reads shared site products/settings from data/store.json
  - PUT commits changes to GitHub when GITHUB_OWNER/REPO/TOKEN are configured
  - PUT falls back to local file storage for development if GitHub is not configured
*/
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
const STORE_PATH = 'data/store.json';

function isGitHubPersistenceConfigured() {
  return Boolean(GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN);
}

function readLocalStore() {
  const filePath = path.join(__dirname, '..', STORE_PATH);
  try {
    const json = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(json);
  } catch (error) {
    return {
      products: [],
      settings: {
        phone: '9647503441344',
        email: 'pin3d-lab@proton.me',
        location: 'Duhok, Iraq'
      },
      adminPass: 'pin3d2025'
    };
  }
}

async function fetchGitHubStore() {
  if (!isGitHubPersistenceConfigured()) return null;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${STORE_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'netlify-function',
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`GitHub fetch failed ${res.status}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, data.encoding).toString('utf8');
  return {
    sha: data.sha,
    store: JSON.parse(content)
  };
}

async function commitGitHubStore(store, sha) {
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    throw new Error('Missing GitHub deployment variables for remote persistence.');
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${STORE_PATH}`;
  const body = {
    message: 'Update PIN3D LAB shared store',
    content: Buffer.from(JSON.stringify(store, null, 2)).toString('base64'),
    branch: GITHUB_BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'netlify-function',
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub commit failed ${res.status}: ${errText}`);
  }

  return await res.json();
}

exports.handler = async function (event) {
  if (event.httpMethod === 'GET') {
    try {
      const remoteResult = await fetchGitHubStore();
      const store = remoteResult ? { ...remoteResult.store, __source: 'github' } : { ...readLocalStore(), __source: 'local' };
      return {
        statusCode: 200,
        body: JSON.stringify(store)
      };
    } catch (error) {
      const store = { ...readLocalStore(), __source: 'local' };
      return {
        statusCode: 200,
        body: JSON.stringify(store)
      };
    }
  }

  if (event.httpMethod === 'PUT') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (error) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!isGitHubPersistenceConfigured()) {
      if (process.env.NODE_ENV !== 'production') {
        const localStore = readLocalStore();
        const nextStore = {
          products: Array.isArray(payload.products) ? payload.products : localStore.products,
          settings: typeof payload.settings === 'object' && payload.settings !== null ? payload.settings : localStore.settings,
          adminPass: typeof payload.adminPass === 'string' ? payload.adminPass : localStore.adminPass
        };
        const filePath = path.join(__dirname, '..', STORE_PATH);
        fs.writeFileSync(filePath, JSON.stringify(nextStore, null, 2), 'utf8');
        return {
          statusCode: 200,
          body: JSON.stringify({ ...nextStore, __source: 'local' })
        };
      }
      return {
        statusCode: 501,
        body: JSON.stringify({ error: 'GitHub persistence is not configured. Set GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN in Netlify environment variables.' })
      };
    }

    let payloadStore;
    try {
      payloadStore = JSON.parse(event.body || '{}');
    } catch (error) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const localStore = readLocalStore();
    const nextStore = {
      products: Array.isArray(payloadStore.products) ? payloadStore.products : localStore.products,
      settings: typeof payloadStore.settings === 'object' && payloadStore.settings !== null ? payloadStore.settings : localStore.settings,
      adminPass: typeof payloadStore.adminPass === 'string' ? payloadStore.adminPass : localStore.adminPass
    };

    try {
      const remoteResult = await fetchGitHubStore();
      const sha = remoteResult ? remoteResult.sha : undefined;
      await commitGitHubStore(nextStore, sha);
      return {
        statusCode: 200,
        body: JSON.stringify({ ...nextStore, __source: 'github' })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GitHub persistence failed', detail: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: { Allow: 'GET, PUT' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
