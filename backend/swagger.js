const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PGVault External API',
      version: '1.0.0',
      description: 'REST API for managing PGVault backups from external services via API Keys.',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local server',
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./routes/externalApi.js'],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
