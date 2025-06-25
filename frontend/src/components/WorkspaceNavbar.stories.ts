// filepath: WorkspaceNavbar.stories.ts
import WorkspaceNavbar from './WorkspaceNavbar.vue';

export default {
  title: 'Components/WorkspaceNavbar',
  component: WorkspaceNavbar,
};

const Template = (args) => ({
  components: { WorkspaceNavbar },
  setup() {
    return { args };
  },
  template: '<WorkspaceNavbar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
