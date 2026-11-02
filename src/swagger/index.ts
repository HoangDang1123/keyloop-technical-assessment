import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { Router, Request, Response } from 'express';

// Load docs/openapi.yaml
const yamlPath = path.resolve(__dirname, '../../docs/openapi.yaml');
let openApiSpec: Record<string, unknown> = {};

try {
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  openApiSpec = YAML.parse(yamlContent);
} catch (err) {
  console.error('Failed to load docs/openapi.yaml:', err);
}

const router = Router();

// Endpoint to fetch raw OpenAPI spec in JSON
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

// Endpoint to fetch raw OpenAPI spec in YAML
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yamlContent);
  } catch {
    res.status(500).json({ error: { code: 'FILE_ERROR', message: 'Could not read openapi.yaml' } });
  }
});

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Keyloop Scheduler API Documentation',
  }),
);

export { router as swaggerRouter, openApiSpec };
