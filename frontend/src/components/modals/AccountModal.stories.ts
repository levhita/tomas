// filepath: modals/AccountModal.stories.ts
import AccountModal from './AccountModal.vue';
import { ref, onMounted, watch } from 'vue';

export default {
  title: 'Components/modals / AccountModal',
  component: AccountModal,
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
  workspace_id: 123
};

const creditAccountDemo = {
  id: 2,
  name: 'Credit Card',
  note: 'Visa credit card with 2% cashback',
  type: 'credit',
  workspace_id: 123
};

const Template = (args) => ({
  components: { AccountModal },
  setup() {
    // Use reactive ref for modelValue
    const modelValue = ref(args.modelValue || true);

    // Create a reactive reference for the account data from args
    const account = ref(args.account ? { ...args.account } : null);

    // Watch for control panel changes
    watch(() => args.account, (newVal) => {
      if (newVal) {
        account.value = { ...newVal };
      } else {
        account.value = null;
      }
    }, { deep: true });

    // Debug logging
    console.log('Story setup - account data:', account.value);

    onMounted(() => {
      console.log('Component mounted, account data:', account.value);
    });

    return {
      args,
      account,
      modelValue,
      onSave: (data) => {
        console.log('Account saved:', data);
        args.save(data);
      },
      onUpdateModelValue: (value) => {
        modelValue.value = value;
        args['update:modelValue'](value);
      }
    };
  },
  template: `
    <div>
      <AccountModal 
        v-model="modelValue"
        :account="account"
        :workspaceId="123"
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

// Edit an existing debit account story
export const EditDebitAccount = Template.bind({});
EditDebitAccount.args = {
  modelValue: true,
  workspaceId: 123,
  isLoading: false,
  account: { ...debitAccountDemo }  // Create a new object for better reactivity
};
EditDebitAccount.parameters = {
  docs: {
    description: {
      story: 'Modal for editing an existing debit account with pre-populated fields (modelValue=true makes the modal visible).'
    }
  }
};

// Edit an existing credit account story
export const EditCreditAccount = Template.bind({});
EditCreditAccount.args = {
  modelValue: true,
  workspaceId: 123,
  isLoading: false,
  account: { ...creditAccountDemo }  // Create a new object for better reactivity
};
EditCreditAccount.parameters = {
  docs: {
    description: {
      story: 'Modal for editing an existing credit account with pre-populated fields (modelValue=true makes the modal visible).'
    }
  }
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
