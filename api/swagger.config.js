const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Tomas API',
      version: '2.0.0',
      description: `
        Personal and Home finance projection and expense tracking application API.
        
        ## Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
        
        ## Parameter Naming Convention
        All API endpoints use \`snake_case\` for query parameters and request body fields.
        
        ## Breaking Changes (v2.0.0)
        - Removed legacy \`/transactions?book_id=...\` endpoint - use \`/books/{id}/transactions\` instead
        - All parameters now use \`snake_case\` (e.g., \`account_id\`, \`start_date\`, \`end_date\`, \`up_to_date\`)
      `,
      contact: {
        name: 'Tomas API Support',
        url: 'https://github.com/levhita/tomas'
      },
      license: {
        name: 'GPL-3.0',
        url: 'https://www.gnu.org/licenses/gpl-3.0.html'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.tomas.example.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            superadmin: { type: 'boolean', example: true },
            active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            account_id: { type: 'integer', example: 456 },
            category_id: { type: 'integer', nullable: true, example: 789 },
            amount: { type: 'number', format: 'float', example: -50.00, description: 'Negative for expenses, positive for income' },
            description: { type: 'string', example: 'Grocery shopping' },
            note: { type: 'string', nullable: true, example: 'Weekly groceries' },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            exercised: { type: 'boolean', example: true, description: 'Whether the transaction has been executed' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        TransactionInput: {
          type: 'object',
          required: ['account_id', 'amount', 'description', 'date'],
          properties: {
            account_id: { type: 'integer', example: 456 },
            category_id: { type: 'integer', nullable: true, example: 789 },
            amount: { type: 'number', format: 'float', example: -50.00, description: 'Negative for expenses, positive for income' },
            description: { type: 'string', example: 'Grocery shopping' },
            note: { type: 'string', nullable: true, example: 'Weekly groceries' },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            exercised: { type: 'boolean', default: true, example: true }
          }
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            book_id: { type: 'integer', example: 123 },
            name: { type: 'string', example: 'Checking Account' },
            note: { type: 'string', nullable: true, example: 'Main checking account' },
            type: { type: 'string', enum: ['debit', 'credit'], example: 'debit' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        AccountInput: {
          type: 'object',
          required: ['name', 'book_id'],
          properties: {
            name: { type: 'string', example: 'Checking Account' },
            note: { type: 'string', nullable: true, example: 'Main checking account' },
            type: { type: 'string', enum: ['debit', 'credit'], default: 'debit', example: 'debit' },
            book_id: { type: 'integer', example: 123 }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            book_id: { type: 'integer', example: 123 },
            parent_category_id: { type: 'integer', nullable: true, example: null },
            name: { type: 'string', example: 'Food & Dining' },
            note: { type: 'string', nullable: true, example: 'Restaurant and grocery expenses' },
            type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        CategoryInput: {
          type: 'object',
          required: ['name', 'book_id'],
          properties: {
            name: { type: 'string', example: 'Food & Dining' },
            note: { type: 'string', nullable: true, example: 'Restaurant and grocery expenses' },
            parent_category_id: { type: 'integer', nullable: true, example: null, description: 'Optional parent category ID for hierarchical categories' },
            book_id: { type: 'integer', example: 123 },
            type: { type: 'string', enum: ['income', 'expense'], default: 'expense', example: 'expense', description: 'Category type (ignored if parent_category_id is provided)' }
          }
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123 },
            team_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Personal Budget' },
            note: { type: 'string', nullable: true, example: 'Main personal budget book' },
            currency_symbol: { type: 'string', example: '$' },
            week_start: { type: 'string', enum: ['sunday', 'monday'], example: 'monday' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true, example: null }
          }
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Family Budget Team' },
            note: { type: 'string', nullable: true, example: 'Team for managing family finances' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true, example: null },
            role: { type: 'string', enum: ['admin', 'collaborator', 'viewer'], example: 'admin', description: 'User role in the team (included when listing user teams)' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Resource not found' },
            code: { type: 'string', example: 'NOT_FOUND' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                message: 'Invalid request parameters',
                code: 'BAD_REQUEST'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                message: 'Authentication required',
                code: 'UNAUTHORIZED'
              }
            }
          }
        },
        Forbidden: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                message: 'Access forbidden',
                code: 'FORBIDDEN'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                message: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Health', description: 'API health and status checks' },
      { name: 'Transactions', description: 'Financial transaction management' },
      { name: 'Accounts', description: 'Account management and balance queries' },
      { name: 'Books', description: 'Financial book management' },
      { name: 'Categories', description: 'Transaction category management' },
      { name: 'Users', description: 'User management (admin only)' },
      { name: 'Teams', description: 'Team and collaboration management' }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/middleware/*.js'
  ]
};

module.exports = swaggerJSDoc(options);
