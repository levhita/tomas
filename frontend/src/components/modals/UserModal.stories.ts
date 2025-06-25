// filepath: modals/UserModal.stories.ts
import UserModal from './UserModal.vue';

export default {
  title: 'Components/modals / UserModal',
  component: UserModal,
};

const Template = (args) => ({
  components: { UserModal },
  setup() {
    return { args };
  },
  template: '<UserModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
