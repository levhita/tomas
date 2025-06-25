// filepath: UserMenu.stories.ts
import UserMenu from './UserMenu.vue';

export default {
  title: 'Components/UserMenu',
  component: UserMenu,
};

const Template = (args) => ({
  components: { UserMenu },
  setup() {
    return { args };
  },
  template: '<UserMenu v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
