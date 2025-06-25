// filepath: modals/WorkspaceModal.stories.ts
import WorkspaceModal from './WorkspaceModal.vue';

export default {
  title: 'Components/modals / WorkspaceModal',
  component: WorkspaceModal,
};

const Template = (args) => ({
  components: { WorkspaceModal },
  setup() {
    return { args };
  },
  template: '<WorkspaceModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
