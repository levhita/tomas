// filepath: dialogs/ConfirmDialog.stories.ts
import ConfirmDialog from './ConfirmDialog.vue';

export default {
  title: 'Components/dialogs / ConfirmDialog',
  component: ConfirmDialog,
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
