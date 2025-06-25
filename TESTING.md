# Tests

## Running Tests

### API Tests

To run API tests:

```bash
cd api
npm run test
```

### Frontend Storybook Tests

To run frontend Storybook tests:

```bash
cd frontend
npm run test
```

## CI/CD Pipeline

All pull requests must pass both API and frontend tests before they can be merged. The tests are run automatically in GitHub Actions.

### How Storybook Tests Work

The Storybook tests run all stories marked for testing in our `vite.config.js`. To add a new component to the test suite:

1. Make sure your story has a working play function if you're testing interactions
2. Add the story file path to the `includedStories` array in `frontend/vite.config.js`
3. Run the tests locally to verify they pass

### Test Tags

Stories can be marked with tags to indicate their status:

- `testable`: Stories that are ready for testing
- `stable`: Stories that are stable and should be included in the test suite

Example:
```js
export default {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['testable'],
};
```
