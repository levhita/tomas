// filepath: dialogs/ConfirmDialog.stories.ts
import ConfirmDialog from './ConfirmDialog.vue';

export default {
  title: 'Components/dialogs / ConfirmDialog',
  component: ConfirmDialog,
  tags: ['testable'],
};

const Template = (args) => ({
  components: { ConfirmDialog },

  setup() {
    return { args };
  },
  template: '<ConfirmDialog v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
