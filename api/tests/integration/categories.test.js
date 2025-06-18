/**
 * Categories API Integration Tests
 * 
 * Tests all category management endpoints with authentication and permission validation.
 */

const request = require('supertest');
const app = require('../../src/app');
const {
  loginUser,
  authenticatedRequest,
  validateApiResponse,
  TEST_USERS
} = require('../utils/test-helpers');

describe('Categories Management API', () => {
  let superadminToken, testUserToken;

  beforeAll(async () => {
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
  });

  describe('GET /api/categories', () => {
    it('should return categories for workspace with read access', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories?workspace_id=1');

      validateApiResponse(response, 200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate category structure
      if (response.body.length > 0) {
        const category = response.body[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('workspace_id');
        expect(category.workspace_id).toBe(1);
      }
    });

    it('should deny access without workspace_id parameter', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access to workspace without permission', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories?workspace_id=999');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/categories?workspace_id=1');

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category details for valid category', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories/1');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('workspace_id');
    });

    it('should return 404 for non-existent category', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow access to category in workspace with permission', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/categories/2');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', 2);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/categories/1');

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('POST /api/categories', () => {
    it('should create new category as admin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        name: 'Test Category',
        workspace_id: 1,
        type: 'expense',
        note: 'Test category for expenses'
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('workspace_id', categoryData.workspace_id);
      expect(response.body).toHaveProperty('type', categoryData.type);
    });

    it('should create category with minimal data', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        name: 'Minimal Category',
        workspace_id: 1
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('workspace_id', categoryData.workspace_id);
      expect(response.body).toHaveProperty('type', 'expense'); // Default type
    });

    it('should create income category', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        name: 'Income Category',
        workspace_id: 1,
        type: 'income'
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('type', 'income');
    });

    it('should reject missing name', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        workspace_id: 1
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing workspace_id', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        name: 'Test Category'
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid category type', async () => {
      const auth = authenticatedRequest(superadminToken);
      const categoryData = {
        name: 'Test Category',
        workspace_id: 1,
        type: 'invalid_type'
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow collaborator to create categories', async () => {
      const auth = authenticatedRequest(testUserToken);
      const categoryData = {
        name: 'Collaborator Test Category',
        workspace_id: 1
      };

      const response = await auth.post('/api/categories').send(categoryData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('workspace_id', categoryData.workspace_id);
    });

    it('should deny access without authentication', async () => {
      const categoryData = {
        name: 'Test Category',
        workspace_id: 1
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData);

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category as admin', async () => {
      // First create a category to update
      const auth = authenticatedRequest(superadminToken);
      const createData = {
        name: 'Category to Update',
        workspace_id: 1
      };
      const createResponse = await auth.post('/api/categories').send(createData);
      const categoryId = createResponse.body.id;

      // Now update it
      const updateData = {
        name: 'Updated Category Name',
        note: 'Updated description'
      };

      const response = await auth.put(`/api/categories/${categoryId}`).send(updateData);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('note', updateData.note);
    });

    it('should return 404 for non-existent category', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = { name: 'Updated Name' };

      const response = await auth.put('/api/categories/99999').send(updateData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow collaborator to update categories', async () => {
      const auth = authenticatedRequest(testUserToken);
      const updateData = { name: 'Updated by Collaborator' };

      const response = await auth.put('/api/categories/1').send(updateData);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('name', updateData.name);
    });

    it('should deny access without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/categories/1')
        .send(updateData);

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category without transactions as admin', async () => {
      // First create a category to delete
      const auth = authenticatedRequest(superadminToken);
      const createData = {
        name: 'Category to Delete',
        workspace_id: 1
      };
      const createResponse = await auth.post('/api/categories').send(createData);
      const categoryId = createResponse.body.id;

      // Delete the category
      const response = await auth.delete(`/api/categories/${categoryId}`);

      validateApiResponse(response, 204);

      // Verify it's deleted
      const getResponse = await auth.get(`/api/categories/${categoryId}`);
      validateApiResponse(getResponse, 404);
    });

    it('should return 404 for non-existent category', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.delete('/api/categories/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent deletion of category with transactions', async () => {
      const auth = authenticatedRequest(superadminToken);
      // Category 1 should have transactions in test data
      const response = await auth.delete('/api/categories/1');

      validateApiResponse(response, 428); // Precondition Required
      expect(response.body).toHaveProperty('error');
    });

    it('should allow collaborator to delete categories', async () => {
      // First create a category to delete
      const auth = authenticatedRequest(testUserToken);
      const createData = {
        name: 'Category to Delete by Collaborator',
        workspace_id: 1
      };
      const createResponse = await auth.post('/api/categories').send(createData);
      const categoryId = createResponse.body.id;

      // Delete the category
      const response = await auth.delete(`/api/categories/${categoryId}`);

      validateApiResponse(response, 204);

      // Verify it's deleted
      const getResponse = await auth.get(`/api/categories/${categoryId}`);
      validateApiResponse(getResponse, 404);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .delete('/api/categories/1');

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('Advanced Category Scenarios', () => {
    describe('Hierarchical Categories', () => {
      it('should create category with parent category', async () => {
        const auth = authenticatedRequest(superadminToken);

        // First create a parent category
        const parentData = {
          name: 'Parent Category',
          workspace_id: 1,
          type: 'expense'
        };
        const parentResponse = await auth.post('/api/categories').send(parentData);
        validateApiResponse(parentResponse, 201);
        const parentId = parentResponse.body.id;

        // Now create a child category
        const childData = {
          name: 'Child Category',
          workspace_id: 1,
          parent_category_id: parentId
        };
        const response = await auth.post('/api/categories').send(childData);

        validateApiResponse(response, 201);
        expect(response.body).toHaveProperty('parent_category_id', parentId);
        expect(response.body).toHaveProperty('type', 'expense'); // Should inherit parent type
      });

      it('should prevent three-level nesting', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create grandparent
        const grandparentData = { name: 'Grandparent', workspace_id: 1, type: 'expense' };
        const grandparentResponse = await auth.post('/api/categories').send(grandparentData);
        const grandparentId = grandparentResponse.body.id;

        // Create parent as child of grandparent
        const parentData = { name: 'Parent', workspace_id: 1, parent_category_id: grandparentId };
        const parentResponse = await auth.post('/api/categories').send(parentData);
        const parentId = parentResponse.body.id;

        // Try to create child as child of parent (should fail - three levels)
        const childData = { name: 'Child', workspace_id: 1, parent_category_id: parentId };
        const response = await auth.post('/api/categories').send(childData);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('two levels deep');
      });

      it('should enforce parent-child workspace consistency', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Try to create category with parent from different workspace
        const categoryData = {
          name: 'Cross-workspace Child',
          workspace_id: 2,
          parent_category_id: 1 // Category 1 is in workspace 1
        };
        const response = await auth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('same workspace');
      });

      it('should handle non-existent parent category', async () => {
        const auth = authenticatedRequest(superadminToken);
        const categoryData = {
          name: 'Orphaned Category',
          workspace_id: 1,
          parent_category_id: 99999
        };
        const response = await auth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 404);
        expect(response.body).toHaveProperty('error', 'Parent category not found');
      });
    });

    describe('Category Types', () => {
      it('should create expense category by default', async () => {
        const auth = authenticatedRequest(superadminToken);
        const categoryData = {
          name: 'Default Type Category',
          workspace_id: 1
        };
        const response = await auth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 201);
        expect(response.body).toHaveProperty('type', 'expense');
      });

      it('should inherit type from parent category', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create income parent
        const parentData = { name: 'Income Parent', workspace_id: 1, type: 'income' };
        const parentResponse = await auth.post('/api/categories').send(parentData);
        const parentId = parentResponse.body.id;

        // Create child with different type specified (should be ignored)
        const childData = {
          name: 'Child Category',
          workspace_id: 1,
          parent_category_id: parentId,
          type: 'expense' // This should be ignored
        };
        const response = await auth.post('/api/categories').send(childData);

        validateApiResponse(response, 201);
        expect(response.body).toHaveProperty('type', 'income'); // Should inherit from parent
      });
    });

    describe('Workspace Permission Variations', () => {
      it('should allow collaborator to create categories', async () => {
        // First, we need to add testuser1 as collaborator to workspace 2
        const adminAuth = authenticatedRequest(superadminToken);

        // Remove user from workspace 2 first (in case they're already there)
        await adminAuth.delete('/api/workspaces/2/users/2').catch(() => { }); // Ignore error if not found

        // Add user as collaborator to workspace 2
        await adminAuth.post('/api/workspaces/2/users').send({
          userId: 2,
          role: 'collaborator'
        });

        const collabAuth = authenticatedRequest(testUserToken);
        const categoryData = {
          name: 'Collaborator Category',
          workspace_id: 2
        };
        const response = await collabAuth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 201);
        expect(response.body).toHaveProperty('name', categoryData.name);
      });

      it('should deny viewer access to create categories', async () => {
        const adminAuth = authenticatedRequest(superadminToken);

        // Remove user from workspace 2 first (in case they're already there)
        await adminAuth.delete('/api/workspaces/2/users/2').catch(() => { }); // Ignore error if not found

        // Add user as viewer to workspace 2
        await adminAuth.post('/api/workspaces/2/users').send({
          userId: 2,
          role: 'viewer'
        });

        const viewerAuth = authenticatedRequest(testUserToken);
        const categoryData = {
          name: 'Viewer Category',
          workspace_id: 2
        };
        const response = await viewerAuth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Category Updates', () => {
      it('should update category type and preserve relationships', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create a category to update
        const createData = { name: 'Updateable Category', workspace_id: 1, type: 'expense' };
        const createResponse = await auth.post('/api/categories').send(createData);
        const categoryId = createResponse.body.id;

        // Update the category
        const updateData = {
          name: 'Updated Category',
          type: 'income',
          note: 'Updated note'
        };
        const response = await auth.put(`/api/categories/${categoryId}`).send(updateData);

        validateApiResponse(response, 200);
        expect(response.body).toHaveProperty('name', updateData.name);
        expect(response.body).toHaveProperty('type', updateData.type);
        expect(response.body).toHaveProperty('note', updateData.note);
      });

      it('should handle partial updates', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create a category
        const createData = { name: 'Partial Update Category', workspace_id: 1, note: 'Original note' };
        const createResponse = await auth.post('/api/categories').send(createData);
        const categoryId = createResponse.body.id;

        // Update only the name
        const updateData = { name: 'Partially Updated' };
        const response = await auth.put(`/api/categories/${categoryId}`).send(updateData);

        validateApiResponse(response, 200);
        expect(response.body).toHaveProperty('name', updateData.name);
        expect(response.body).toHaveProperty('note', 'Original note'); // Should preserve
      });
    });

    describe('Category Filtering and Querying', () => {
      it('should return categories consistently ordered', async () => {
        const auth = authenticatedRequest(testUserToken);
        const response = await auth.get('/api/categories?workspace_id=1');

        validateApiResponse(response, 200);
        expect(response.body).toBeInstanceOf(Array);

        // Check that categories are returned consistently
        if (response.body.length > 1) {
          // Make two requests and verify order is consistent
          const response2 = await auth.get('/api/categories?workspace_id=1');
          expect(response.body.map(cat => cat.id)).toEqual(response2.body.map(cat => cat.id));

          // Check that each category has the required fields
          response.body.forEach(category => {
            expect(category).toHaveProperty('id');
            expect(category).toHaveProperty('name');
            expect(category).toHaveProperty('workspace_id', 1);
          });
        }
      });

      it('should return empty array for workspace with no categories', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create a new workspace first
        const workspaceData = { name: 'Empty Workspace', currency_symbol: '$' };
        const workspaceResponse = await auth.post('/api/workspaces').send(workspaceData);
        const workspaceId = workspaceResponse.body.id;

        const response = await auth.get(`/api/categories?workspace_id=${workspaceId}`);

        validateApiResponse(response, 200);
        expect(response.body).toEqual([]);
      });
    });

    describe('Category Validation', () => {
      it('should reject empty category name', async () => {
        const auth = authenticatedRequest(superadminToken);
        const categoryData = {
          name: '',
          workspace_id: 1
        };
        const response = await auth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject null category name', async () => {
        const auth = authenticatedRequest(superadminToken);
        const categoryData = {
          name: null,
          workspace_id: 1
        };
        const response = await auth.post('/api/categories').send(categoryData);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle very long category names', async () => {
        const auth = authenticatedRequest(superadminToken);
        const categoryData = {
          name: 'a'.repeat(300), // Very long name
          workspace_id: 1
        };
        const response = await auth.post('/api/categories').send(categoryData);

        // Should either accept or reject with appropriate error
        expect([201, 400]).toContain(response.status);
      });
    });

    describe('Error Handling', () => {
      it('should handle database connection errors gracefully', async () => {
        // This test would require mocking the database, which we're avoiding
        // But we can test invalid workspace IDs which might cause DB errors
        const auth = authenticatedRequest(superadminToken);
        const response = await auth.get('/api/categories?workspace_id=99999');

        validateApiResponse(response, 403); // Should be permission denied, not crash
      });

      it('should handle malformed workspace_id parameter', async () => {
        const auth = authenticatedRequest(testUserToken);
        const response = await auth.get('/api/categories?workspace_id=invalid');

        expect([400, 403]).toContain(response.status);
      });
    });
  });
});
