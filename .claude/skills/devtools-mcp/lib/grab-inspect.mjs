#!/usr/bin/env node

/**
 * grab-inspect.mjs
 *
 * Queries react-grab state via Chrome DevTools Protocol.
 * Returns the currently selected/hovered component info:
 * - File path, component stack, element tag/text, React props
 *
 * Requires Chrome running with --remote-debugging-port=9222
 *
 * Usage:
 *   node grab-inspect.mjs                  # one-shot query
 *   node grab-inspect.mjs --activate       # activate react-grab first
 *   node grab-inspect.mjs --port 9223      # custom CDP port
 */

import { resolve } from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_PORT = 9222
const APP_HOST = 'localhost'

const JS_INSPECT = `(function() {
    var g = window.__REACT_GRAB__;
    if (!g) return JSON.stringify({error: "react-grab not loaded"});
    var s = g.getState();
    var result = {
        active: s.isActive,
        filePath: s.selectionFilePath || null,
        promptMode: s.isPromptMode
    };
    if (s.targetElement) {
        result.element = {
            tag: s.targetElement.tagName,
            text: (s.targetElement.textContent || "").substring(0, 150)
        };
        var fiberKey = Object.keys(s.targetElement).find(function(k) {
            return k.startsWith("__reactFiber");
        });
        if (fiberKey) {
            var names = [], f = s.targetElement[fiberKey];
            while (f && names.length < 10) {
                if (f.type && typeof f.type === "function") {
                    var name = f.type.displayName || f.type.name;
                    if (name) names.push(name);
                }
                f = f.return;
            }
            result.components = names;
        }
        var propsKey = Object.keys(s.targetElement).find(function(k) {
            return k.startsWith("__reactProps");
        });
        if (propsKey) {
            var props = s.targetElement[propsKey], safe = {};
            for (var k in props) {
                var v = props[k];
                if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
                    safe[k] = v;
            }
            if (Object.keys(safe).length) result.props = safe;
        }
    }
    return JSON.stringify(result);
})()`

const JS_ACTIVATE = `(function() {
    var g = window.__REACT_GRAB__;
    if (!g) return JSON.stringify({error: "react-grab not loaded"});
    if (!g.isActive()) g.activate();
    return JSON.stringify({activated: true});
})()`

/**
 * Find the WebSocket debugger URL for the app tab
 */
export async function getPageWs(port = DEFAULT_PORT, appHost = APP_HOST) {
    const res = await fetch(`http://localhost:${port}/json`)
    const tabs = await res.json()
    const tab = tabs.find(t => t.url?.includes(appHost))
    return tab?.webSocketDebuggerUrl ?? null
}

/**
 * Send a CDP Runtime.evaluate and return the parsed result
 */
export function cdpEval(wsUrl, expression) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const timer = setTimeout(() => { ws.close(); reject(new Error('CDP timeout')) }, 5000)
        ws.onopen = () => ws.send(JSON.stringify({
            id: 1, method: 'Runtime.evaluate', params: { expression }
        }))
        ws.onmessage = (ev) => {
            clearTimeout(timer)
            const data = JSON.parse(String(ev.data))
            const val = data?.result?.result?.value
            ws.close()
            try { resolve(val ? JSON.parse(val) : null) }
            catch { resolve(val) }
        }
        ws.onerror = (e) => { clearTimeout(timer); ws.close(); reject(e) }
    })
}

/**
 * Activate react-grab inspector overlay
 */
export async function activate(port = DEFAULT_PORT) {
    const wsUrl = await getPageWs(port)
    if (!wsUrl) throw new Error('No app tab found')
    return cdpEval(wsUrl, JS_ACTIVATE)
}

/**
 * Query current react-grab selection state
 * Returns: { active, filePath, components, element, props }
 */
export async function inspect(port = DEFAULT_PORT) {
    const wsUrl = await getPageWs(port)
    if (!wsUrl) throw new Error('No app tab found')
    return cdpEval(wsUrl, JS_INSPECT)
}

/**
 * Hard-refresh the browser page (bypass cache)
 * Uses CDP Page.reload with ignoreCache instead of deprecated location.reload(true)
 */
export async function hardRefresh(port = DEFAULT_PORT) {
    const wsUrl = await getPageWs(port)
    if (!wsUrl) throw new Error('No app tab found')
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        const timer = setTimeout(() => { ws.close(); reject(new Error('CDP timeout')) }, 5000)
        ws.onopen = () => ws.send(JSON.stringify({
            id: 1, method: 'Page.reload', params: { ignoreCache: true }
        }))
        ws.onmessage = () => {
            clearTimeout(timer)
            ws.close()
            resolve({ refreshed: true })
        }
        ws.onerror = (e) => { clearTimeout(timer); ws.close(); reject(e) }
    })
}

/**
 * Evaluate arbitrary JS in the browser context
 */
export async function evaluate(expression, port = DEFAULT_PORT) {
    const wsUrl = await getPageWs(port)
    if (!wsUrl) throw new Error('No app tab found')
    return cdpEval(wsUrl, expression)
}

// --- CLI ---
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
    const args = process.argv.slice(2)
    const port = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : DEFAULT_PORT
    const doActivate = args.includes('--activate')

    try {
        if (doActivate) {
            const r = await activate(port)
            console.log(JSON.stringify(r, null, 2))
        }
        const state = await inspect(port)
        console.log(JSON.stringify(state, null, 2))
    } catch (e) {
        console.error('Error:', e.message)
        process.exit(1)
    }
}
