// filepath: modals/TransactionModal.stories.ts
import TransactionModal from './TransactionModal.vue';

export default {
  title: 'Components/modals / TransactionModal',
  component: TransactionModal,
};

const Template = (args) => ({
  components: { TransactionModal },
  setup() {
    return { args };
  },
  template: '<TransactionModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
