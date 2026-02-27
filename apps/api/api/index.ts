/**
 * Vercel Serverless Entry Point
 * Wraps the Express app to run on Vercel's serverless infrastructure
 */

import { createServer } from '../src/server.js';

// Create app once (cached between invocations in the same container)
let app: any;

export default async function handler(req: any, res: any) {
    if (!app) {
        app = await createServer();
    }
    return app(req, res);
}
