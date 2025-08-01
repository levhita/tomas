// filepath: modals/AccountModal.stories.ts
import AccountModal from './AccountModal.vue';
import { ref, watch } from 'vue';
import { expect, fn, userEvent, within } from 'storybook/test';

export default {
  title: 'Components/modals / AccountModal',
  component: AccountModal,
  tags: ['stable', 'testable'],
  argTypes: {
    modelValue: {
      control: 'boolean',
      description: 'Controls the visibility of the modal dialog (true = visible, false = hidden). Used with v-model for two-way binding.'
    },
    isLoading: {
      control: 'boolean',
      description: 'When true, displays a loading spinner and disables form inputs'
    },
    workspaceId: {
      control: 'number',
      description: 'ID of the workspace where the account belongs or will be created'
    },
    account: {
      control: 'object',
      description: 'Account object for editing. When null, the form is prepared for creating a new account'
    },
    'update:modelValue': {
      action: 'update:modelValue',
      description: 'Event emitted when modal visibility changes (part of v-model binding)'
    },
    save: {
      action: 'save',
      description: 'Event emitted when the form is submitted with valid data'
    }
  }
};

// Hard-coded demo accounts for stories to ensure they work properly
const debitAccountDemo = {
  id: 1,
  name: 'Checking Account',
  note: 'My primary bank account for daily expenses',
  type: 'debit',
  workspace_id: 101 // Will be overridden in story args
};

const creditAccountDemo = {
  id: 2,
  name: 'Credit Card',
  note: 'Visa credit card with 2% cashback',
  type: 'credit',
  workspace_id: 101 // Will be overridden in story args
};

const Template = (args) => ({
  components: { AccountModal },
  setup() {
    // Use reactive ref for modelValue
    const modelValue = ref(args.modelValue);

    // Create a reactive reference for the account data from args
    const account = ref(args.account ? { ...args.account } : null);


    // Force a complete reference change whenever an account property changes
    function updateAccountReference(newData) {
      account.value = newData ? { ...newData } : null;
    }

    // Watch for control panel changes - always create a new reference
    watch(() => args.account, (newVal) => {
      if (newVal) {
        // Preserve the account's original workspace_id if it exists
        updateAccountReference({
          ...newVal,
          // Don't override the workspace_id if it already exists in the account
          workspace_id: newVal.workspace_id !== undefined ? newVal.workspace_id : args.workspaceId
        });
      } else {
        updateAccountReference(null);
      }
    }, { deep: true });

    return {
      args,
      account,
      modelValue,
      updateAccountReference,
      onSave: (data) => {
        args.save(data);
      },
      onUpdateModelValue: (value) => {
        modelValue.value = value;
        args['update:modelValue'](value);
      },
      // Helper methods for UI testing
      toggleAccountType: () => {
        if (!account.value) return;
        const newType = account.value.type === 'credit' ? 'debit' : 'credit';
        // Create a completely new reference with the type changed
        updateAccountReference({
          ...account.value,
          type: newType
          // Preserve the original workspace_id from the account
        });
      },
      changeName: () => {
        if (!account.value) return;
        // Create a completely new reference with the name changed
        updateAccountReference({
          ...account.value,
          name: `${account.value.name} (edited at ${new Date().toLocaleTimeString()})`
          // Preserve the original workspace_id from the account
        });
      },
      resetAccount: () => {
        updateAccountReference(null);
      },
      changeWorkspaceId: () => {
        if (!account.value) return;
        // Create a completely new reference with a different workspace_id
        const newWorkspaceId = account.value.workspace_id === args.workspaceId
          ? args.workspaceId + 1
          : args.workspaceId;

        updateAccountReference({
          ...account.value,
          workspace_id: newWorkspaceId
        });
      }
    };
  },
  template: `
    <div>
      <AccountModal 
        v-model="modelValue"
        :account="account"
        :workspaceId="args.workspaceId"
        :isLoading="args.isLoading"
        @save="onSave"
      />
    </div>
  `,
});

// Create a new account story
export const CreateNewAccount = Template.bind({});
CreateNewAccount.args = {
  modelValue: true,
  workspaceId: 123,
  isLoading: false,
  account: null
};
CreateNewAccount.parameters = {
  docs: {
    description: {
      story: 'Modal for creating a new financial account with empty form fields (modelValue=true makes the modal visible). The account type defaults to "debit".'
    }
  }
};

// Play function to test form filling and submission
CreateNewAccount.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Fill in the account name
  const nameInput = canvas.getByLabelText('Name *');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Test Savings Account');

  // Verify input was entered
  expect(nameInput.value).toBe('Test Savings Account');

  // Fill in the account note
  const noteInput = canvas.getByLabelText('Note');
  await userEvent.clear(noteInput);
  await userEvent.type(noteInput, 'This is a test savings account');

  // Verify input was entered
  expect(noteInput.value).toBe('This is a test savings account');

  // Select account type (debit is default, but explicitly set it)
  const typeSelect = canvas.getByLabelText('Account Type');
  await userEvent.selectOptions(typeSelect, 'debit');

  // Verify selection
  expect(typeSelect.value).toBe('debit');

  // Expected data that should be emitted
  const expectedData = {
    name: 'Test Savings Account',
    note: 'This is a test savings account',
    type: 'debit',
    workspace_id: 123
  };

  // Mock the save function to verify data
  args.save = fn();

  // Click save button using test-id
  const saveButton = canvas.getByTestId('save-account-button');
  await userEvent.click(saveButton);

  // Verify the correct data was emitted
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining(expectedData));
};

// Edit an existing debit account story
export const EditDebitAccount = Template.bind({});
EditDebitAccount.args = {
  modelValue: true,
  workspaceId: 101,
  isLoading: false,
  account: debitAccountDemo,
};
EditDebitAccount.parameters = {
  docs: {
    description: {
      story: 'Modal for editing an existing debit account with pre-populated fields (modelValue=true makes the modal visible).'
    }
  }
};

// Play function to test editing an existing debit account
EditDebitAccount.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Verify pre-filled data
  const nameInput = canvas.getByLabelText('Name *');
  const noteInput = canvas.getByLabelText('Note');
  const typeSelect = canvas.getByLabelText('Account Type');

  // Verify initial values are correctly pre-filled
  expect(nameInput).toHaveValue('Checking Account');
  expect(noteInput).toHaveValue('My primary bank account for daily expenses');
  expect(typeSelect).toHaveValue('debit');

  // Modify the account name and note
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Main Checking Account');

  await userEvent.clear(noteInput);
  await userEvent.type(noteInput, 'Personal checking account for bills and expenses');

  // Expected data that should be emitted
  const expectedData = {
    id: 1,
    name: 'Main Checking Account',
    note: 'Personal checking account for bills and expenses',
    type: 'debit',
    workspace_id: 101
  };

  // Mock the save function to verify data
  args.save = fn();

  // Click save button using test-id
  const saveButton = canvas.getByTestId('save-account-button');
  await userEvent.click(saveButton);

  // Verify the correct data was emitted
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining(expectedData));
};

// Edit an existing credit account story
export const EditCreditAccount = Template.bind({});
EditCreditAccount.args = {
  modelValue: true,
  workspaceId: 101,
  isLoading: false,
  account: creditAccountDemo
};
EditCreditAccount.parameters = {
  docs: {
    description: {
      story: 'Modal for editing an existing credit account with pre-populated fields (modelValue=true makes the modal visible).'
    }
  }
};

// Play function to test editing an existing account
EditCreditAccount.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Verify pre-filled data
  const nameInput = canvas.getByLabelText('Name *');
  const noteInput = canvas.getByLabelText('Note');
  const typeSelect = canvas.getByLabelText('Account Type');

  // Verify initial values are correctly pre-filled
  expect(nameInput).toHaveValue('Credit Card');
  expect(noteInput).toHaveValue('Visa credit card with 2% cashback');
  expect(typeSelect).toHaveValue('credit');

  // Modify the account name
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Premium Credit Card');

  // Expected data that should be emitted
  const expectedData = {
    id: 2,
    name: 'Premium Credit Card',
    note: 'Visa credit card with 2% cashback', // Original note preserved
    type: 'credit',
    workspace_id: 101
  };

  // Mock the save function to verify data
  args.save = fn();

  // Click save button using test-id
  const saveButton = canvas.getByTestId('save-account-button');
  await userEvent.click(saveButton);

  // Verify the correct data was emitted with exact object matching
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining(expectedData));
};

// Loading state story
export const LoadingState = Template.bind({});
LoadingState.args = {
  modelValue: true,
  workspaceId: 123,
  isLoading: true,
  account: null
};
LoadingState.parameters = {
  docs: {
    description: {
      story: 'Modal with loading state activated, showing spinner and disabled inputs during save operation (modelValue=true makes the modal visible).'
    }
  }
};

// Play function to test loading state
LoadingState.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Get form elements to verify disabled state
  const nameInput = canvas.getByLabelText('Name *');
  const noteInput = canvas.getByLabelText('Note');
  const typeSelect = canvas.getByLabelText('Account Type');
  const saveButton = canvas.getByTestId('save-account-button');

  // Verify all inputs are disabled
  expect(nameInput).toBeDisabled();
  expect(noteInput).toBeDisabled();
  expect(typeSelect).toBeDisabled();
  expect(saveButton).toBeDisabled();

  // Verify loading spinner is visible using test-id
  const spinner = canvas.getByTestId('loading-spinner');
  expect(spinner).toBeInTheDocument();
};

// Add a story for testing workspace_id handling
export const WorkspaceIdHandling = Template.bind({});
WorkspaceIdHandling.args = {
  modelValue: true,
  workspaceId: 999, // Different from the account's workspace_id
  isLoading: false,
  account: {
    id: 5,
    name: 'Account with explicit workspace_id',
    note: 'This account has its own workspace_id that should be preserved',
    type: 'debit',
    workspace_id: 555 // Explicitly different from props.workspaceId
  }
};
WorkspaceIdHandling.parameters = {
  docs: {
    description: {
      story: 'Tests that account.workspace_id is properly preserved even when workspaceId prop has a different value.'
    }
  }
};

// Play function to verify workspace_id handling
WorkspaceIdHandling.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Mock the save function to verify data
  args.save = fn();

  // Click save button without changing anything first
  const saveButton = canvas.getByTestId('save-account-button');
  await userEvent.click(saveButton);

  // Verify first save call preserved the original workspace_id
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining({
    workspace_id: 555 // The original workspace_id from the account
  }));

  // Now modify the name but workspace_id should still be preserved
  const nameInput = canvas.getByLabelText('Name *');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Renamed account');

  // Save again
  await userEvent.click(saveButton);

  // Verify second save call still preserved the workspace_id
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Renamed account',
    workspace_id: 555 // Should still be the original workspace_id
  }));
};

// Add a story for testing new account creation with workspaceId fallback
export const NewAccountWorkspaceIdFallback = Template.bind({});
NewAccountWorkspaceIdFallback.args = {
  modelValue: true,
  workspaceId: 777, // This should be used as fallback
  isLoading: false,
  account: null
};
NewAccountWorkspaceIdFallback.parameters = {
  docs: {
    description: {
      story: 'Tests that a new account correctly uses the workspaceId prop when no account.workspace_id exists.'
    }
  }
};

// Play function to verify workspaceId fallback for new accounts
NewAccountWorkspaceIdFallback.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);

  // Mock the save function to verify data
  args.save = fn();

  // Fill required fields
  const nameInput = canvas.getByLabelText('Name *');
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'New Account with Fallback ID');

  // Save the new account using test-id
  const saveButton = canvas.getByTestId('save-account-button');
  await userEvent.click(saveButton);

  // Verify the save event includes the fallback workspace_id from props
  expect(args.save).toHaveBeenCalledWith(expect.objectContaining({
    name: 'New Account with Fallback ID',
    workspace_id: 777 // Should use the workspaceId prop as fallback
  }));
};
