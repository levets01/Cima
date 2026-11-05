import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Control Préstamos Rosita - API',
      version: '1.0.0',
      description: 'API REST para la plataforma de gestión de préstamos (tipo gota a gota)',
      contact: {
        name: 'Rosita',
        email: 'rosita@cima.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingrese el token JWT obtenido tras el login',
        },
      },
      schemas: {
        CustomerLoan: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            customerName: { type: 'string' },
            loanDate: { type: 'string', format: 'date-time' },
            principal: { type: 'number' },
            modality: { type: 'string', enum: ['Mensual', 'Quincenal'] },
            ratePerPeriod: { type: 'number' },
            interestPerPeriod: { type: 'number' },
            firstInterestPaymentDate: { type: 'string', format: 'date-time', nullable: true },
            capitalPaid: { type: 'number' },
            capitalPending: { type: 'number' },
            interestReceived: { type: 'number' },
            status: { type: 'string', enum: ['Activo', 'En seguimiento', 'Falta fecha', 'Capital pagado'] },
            nextCollection: { type: 'string', format: 'date-time', nullable: true },
            interestOverdue: { type: 'number' },
            daysOverdue: { type: 'integer' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            loanId: { type: 'integer' },
            paymentDate: { type: 'string', format: 'date-time' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['Capital', 'Rédito'] },
            periodNumber: { type: 'integer', nullable: true },
            note: { type: 'string' },
            customerName: { type: 'string' },
            review: { type: 'string' },
          },
        },
        Period: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            loanId: { type: 'integer' },
            customerName: { type: 'string' },
            periodNumber: { type: 'integer' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            modality: { type: 'string', enum: ['Mensual', 'Quincenal'] },
            capitalPendingEstimated: { type: 'number' },
            interestGenerated: { type: 'number' },
            interestPaid: { type: 'number' },
            interestPending: { type: 'number' },
            status: { type: 'string', enum: ['Por pagar', 'Pendiente vencido', 'Rédito pagado', 'Capital pagado'] },
          },
        },
        BusinessConfig: {
          type: 'object',
          properties: {
            quincenalRate: { type: 'number' },
            monthlyRate: { type: 'number' },
            periodsPerLoan: { type: 'integer' },
            maxLoans: { type: 'integer' },
            maxPayments: { type: 'integer' },
          },
        },
        SummaryIndicators: {
          type: 'object',
          properties: {
            totalLent: { type: 'number' },
            capitalPending: { type: 'number' },
            capitalRecovered: { type: 'number' },
            capitalRecoveredPct: { type: 'number' },
            interestCollected: { type: 'number' },
            profitabilityPct: { type: 'number' },
            interestOverdueUncollected: { type: 'number' },
            interestPendingCalendar: { type: 'number' },
            totalReceived: { type: 'number' },
            activeLoans: { type: 'integer' },
            loansInFollowUp: { type: 'integer' },
            capitalInFollowUp: { type: 'number' },
            loansMissingDate: { type: 'integer' },
            loansCapitalPaid: { type: 'integer' },
            paymentsToReview: { type: 'integer' },
          },
        },
        MonthlyMovement: {
          type: 'object',
          properties: {
            month: { type: 'string' },
            interestCollected: { type: 'number' },
            capitalRecovered: { type: 'number' },
            capitalLent: { type: 'number' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
            token: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { background-color: #1e40af }',
    customSiteTitle: 'Control Préstamos Rosita - API Docs',
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
