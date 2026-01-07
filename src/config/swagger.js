import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUiExpress from 'swagger-ui-express';
const { serve, setup } = swaggerUiExpress;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API Documentation',
      version: '1.0.0',
      description: 'API documentation for Backend application with authentication and OTP verification',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.VERCEL_URL ? 'Production server' : 'Development server'
      },
      {
        url: process.env.API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://api.example.com'),
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            userName: {
              type: 'string',
              description: 'Username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        SignupRequest: {
          type: 'object',
          required: ['userName', 'email', 'password'],
          properties: {
            userName: {
              type: 'string',
              example: 'johndoe',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
              description: 'User email address'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'SecurePass123!',
              description: 'User password (min 6 characters)'
            },
            role: {
              type: 'string',
              enum: ['Admin', 'Client', 'Freelancer'],
              example: 'Freelancer',
              description: 'User role (default: Freelancer)'
            }
          }
        },
        SigninRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'SecurePass123!'
            }
          }
        },
        OTPRequest: {
          type: 'object',
          required: ['otp'],
          properties: {
            otp: {
              type: 'string',
              example: '123456',
              description: '6-digit OTP code received via email'
            }
          }
        },
        ResendOTPRequest: {
          type: 'object',
          required: ['email', '_id'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            _id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
              description: 'User ID'
            }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            newPassword: {
              type: 'string',
              format: 'password',
              example: 'NewPass123!',
              description: 'New password for reset'
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              example: 'NewPass123!',
              description: 'Confirm new password (optional)'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'number',
              example: 200
            },
            message: {
              type: 'string',
              example: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'number',
              example: 400
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'OTP',
        description: 'OTP verification endpoints'
      },
      {
        name: 'Password',
        description: 'Password management endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'] // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = (app) => {
  // Get base URL for Swagger (works with Vercel)
  const getBaseUrl = (req) => {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
    return `${protocol}://${host}`;
  };

  // Swagger UI endpoint - custom HTML with CDN (Vercel compatible)
  app.get('/api-docs', (req, res) => {
    const baseUrl = getBaseUrl(req);
    // Use relative URL to avoid CORS issues
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Backend API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>
    `;
    res.send(html);
  });
  
  // Keep the serve route for compatibility (though it may not work on Vercel)
  app.use('/api-docs-old', serve, setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Backend API Documentation'
  }));

  // Swagger JSON endpoint - dynamically update server URL based on request
  app.get('/api-docs.json', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const updatedSpec = {
      ...swaggerSpec,
      servers: [
        {
          url: baseUrl,
          description: 'Current Server'
        }
      ]
    };
    // Set CORS headers to allow Swagger UI to fetch the JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.send(updatedSpec);
  });
  
  // Handle OPTIONS request for CORS preflight
  app.options('/api-docs.json', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
  });
};

export default swaggerDocs;

