// filepath: modals/UserProfileModal.stories.ts
import UserProfileModal from './UserProfileModal.vue';

export default {
  title: 'Components/modals / UserProfileModal',
  component: UserProfileModal,
};

const Template = (args) => ({
  components: { UserProfileModal },
  setup() {
    return { args };
  },
  template: '<UserProfileModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
