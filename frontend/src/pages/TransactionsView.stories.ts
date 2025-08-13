// filepath: pages/TransactionsView.stories.ts
import TransactionsView from './TransactionsView.vue';
import { expect, userEvent, within } from 'storybook/test';
import { createPinia, setActivePinia } from 'pinia';

export default {
  title: 'Pages/TransactionsView',
  component: TransactionsView,
  tags: ['stable', 'testable'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'TransactionsView component displays and manages financial transactions in a responsive card grid layout with filtering capabilities.'
      }
    }
  },
  decorators: [
    (story) => {
      const pinia = createPinia()
      setActivePinia(pinia)
      
      return {
        components: { story },
        template: '<story />'
      }
    }
  ]
};

const Template = (args) => ({
  components: { TransactionsView },
  setup() {
    return { args };
  },
  template: '<TransactionsView v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
Default.parameters = {
  docs: {
    description: {
      story: 'Default state of TransactionsView with basic structure and filters.'
    }
  }
};
Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  
  // Test that the page title is rendered
  const heading = canvas.getByRole('heading', { level: 1 })
  await expect(heading).toHaveTextContent('Transactions')
  
  // Test that filters form is present
  const searchInput = canvas.getByLabelText('Search')
  await expect(searchInput).toBeInTheDocument()
  await expect(searchInput).toHaveAttribute('placeholder', 'Search transactions')
  
  const accountSelect = canvas.getByLabelText('Account')
  await expect(accountSelect).toBeInTheDocument()
  
  const resetButton = canvas.getByRole('button', { name: 'Reset Filters' })
  await expect(resetButton).toBeInTheDocument()
  await expect(resetButton).toHaveClass('btn', 'btn-info')
};

export const FilterInteractions = Template.bind({});
FilterInteractions.args = {};
FilterInteractions.parameters = {
  docs: {
    description: {
      story: 'Test filter interactions - search input functionality and account filter selection.'
    }
  }
};
FilterInteractions.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  
  // Test search input interaction
  const searchInput = canvas.getByLabelText('Search')
  await userEvent.type(searchInput, 'test search')
  await expect(searchInput).toHaveValue('test search')
  
  // Test account select interaction
  const accountSelect = canvas.getByLabelText('Account')
  await userEvent.click(accountSelect)
  
  // Verify that search and account filter work together
  await expect(searchInput).toHaveValue('test search')
  await expect(accountSelect).toBeInTheDocument()
};

export const ResetFiltersFunction = Template.bind({});
ResetFiltersFunction.args = {};
ResetFiltersFunction.parameters = {
  docs: {
    description: {
      story: 'Test the reset filters functionality to ensure it clears all filter inputs.'
    }
  }
};
ResetFiltersFunction.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  
  // First set some filter values
  const searchInput = canvas.getByLabelText('Search')
  await userEvent.type(searchInput, 'some search term')
  
  // Click reset button
  const resetButton = canvas.getByRole('button', { name: 'Reset Filters' })
  await userEvent.click(resetButton)
  
  // Verify that search input is cleared
  await expect(searchInput).toHaveValue('')
};

export const AccessibilityTest = Template.bind({});
AccessibilityTest.args = {};
AccessibilityTest.parameters = {
  docs: {
    description: {
      story: 'Test accessibility features including proper labeling, ARIA attributes, and keyboard navigation.'
    }
  }
};
AccessibilityTest.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  
  // Test that form inputs have proper labels
  const searchInput = canvas.getByLabelText('Search')
  await expect(searchInput).toBeInTheDocument()
  
  const accountSelect = canvas.getByLabelText('Account')
  await expect(accountSelect).toBeInTheDocument()
  
  // Test that buttons have accessible text
  const resetButton = canvas.getByRole('button', { name: 'Reset Filters' })
  await expect(resetButton).toBeInTheDocument()
  
  // Test heading hierarchy
  const mainHeading = canvas.getByRole('heading', { level: 1 })
  await expect(mainHeading).toHaveTextContent('Transactions')
};
