# API Documentation

This directory contains the generated OpenAPI documentation for the Tomas API.

## Available Documentation Formats

### 1. Interactive Swagger UI (Recommended) ✨
Access the interactive documentation at: **http://localhost:3000/api-docs**

This provides:
- ✅ Interactive API testing
- ✅ Request/response examples  
- ✅ Schema validation
- ✅ Authentication testing

### 2. Generated JSON (swagger.json)
The `swagger.json` file contains the complete OpenAPI specification generated from JSDoc comments in the code.

## Usage

### Generate Documentation
```bash
npm run build-docs
```

### View Documentation
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open your browser to: **http://localhost:3000/api-docs**

This reads JSDoc comments with @swagger annotations from:
- `./src/routes/*.js` - API route definitions with Swagger annotations
- `./src/middleware/*.js` - Middleware documentation

**Current Status**: ✅ **Successfully converted ALL major endpoints to @swagger format**

**Fully Documented Endpoints by Category**:
- 🔐 **Authentication**: User login ✅ (1 endpoint)
- 💊 **Health**: API health checks and admin statistics ✅ (3 endpoints)
- 📊 **Transactions**: Complete CRUD operations ✅ (4 endpoints)
- 🏦 **Accounts**: Complete CRUD operations and balance queries ✅ (5 endpoints)
- 📚 **Books**: Complete management including soft/hard delete and restore ✅ (8 endpoints)
- 📖 **Categories**: Complete CRUD operations with hierarchy management ✅ (4 endpoints)
- 🏠 **General**: API home page ✅ (1 endpoint)

**Partially Documented**:
- 👥 **Users**: Some user management endpoints ✅ (converted key endpoints for search/listing)
- 🏗️ **Teams**: Some team management endpoints ✅ (converted key endpoints for team operations)

**Total Converted**: 30+ endpoints with comprehensive Swagger documentation

> **Note**: All primary business endpoints (transactions, accounts, books, categories) are fully documented with interactive Swagger UI. Remaining user/team management endpoints use traditional JSDoc and can be converted as needed for administrative features.

### 2. Serve Interactive Documentation

To view the interactive Swagger UI:

```bash
npm install  # Install swagger-ui-serve if not already installed
npm run serve-docs
```

Then open http://localhost:8080 in your browser.

### 3. Use with Tools

You can import `swagger.json` into:
- **Postman**: Import → OpenAPI 3.0
- **Insomnia**: Import → OpenAPI spec
- **VS Code**: Use OpenAPI extensions

### 4. Generate Client SDKs

Generate client libraries in various languages:

```bash
# Install openapi-generator-cli globally
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript client
openapi-generator-cli generate -i ./docs/swagger.json -g javascript -o ./client-js

# Generate Python client
openapi-generator-cli generate -i ./docs/swagger.json -g python -o ./client-python

# Generate TypeScript client
openapi-generator-cli generate -i ./docs/swagger.json -g typescript-axios -o ./client-ts
```

## Adding Documentation

To add documentation for new endpoints, add JSDoc comments to your route files:

```javascript
/**
 * @swagger
 * /books/{id}/transactions:
 *   get:
 *     summary: List transactions for a book
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *       - in: query
 *         name: account_id
 *         schema:
 *           type: integer
 *         description: Filter by account ID
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get('/books/:id/transactions', async (req, res) => {
  // Route implementation
});
```

After adding JSDoc comments, run `npm run build-docs` to regenerate the documentation.
