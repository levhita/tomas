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

**Current Status**: ✅ **Successfully converted 20 endpoints to @swagger format**

**Documented Endpoints**:
- 🔐 **Authentication**: User login ✅
- 💊 **Health**: API health checks and admin statistics ✅ (3 endpoints)
- 📊 **Transactions**: Complete CRUD operations ✅ (4 endpoints)
- 🏦 **Accounts**: Account details and balance queries ✅ (2 endpoints)
- 📚 **Books**: Book details, accounts, categories, and transactions ✅ (4 endpoints)
- 📖 **Categories**: Category details and creation ✅ (2 endpoints)
- 👥 **Users**: User search and listing ✅ (2 endpoints)
- 🏗️ **Teams**: Team listing and search ✅ (2 endpoints)


**Remaining Work**: Some endpoints in books.js, categories.js, users.js, and teams.js still use traditional JSDoc format and can be converted as needed.

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
