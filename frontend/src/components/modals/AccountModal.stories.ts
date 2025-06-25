// filepath: modals/AccountModal.stories.ts
import AccountModal from './AccountModal.vue';

export default {
  title: 'Components/modals / AccountModal',
  component: AccountModal,
};

const Template = (args) => ({
  components: { AccountModal },
  setup() {
    return { args };
  },
  template: '<AccountModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
