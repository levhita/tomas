// filepath: DarkModeToggle.stories.ts
import DarkModeToggle from './DarkModeToggle.vue';

export default {
  title: 'Components/DarkModeToggle',
  component: DarkModeToggle,
};

const Template = (args) => ({
  components: { DarkModeToggle },
  setup() {
    return { args };
  },
  template: '<DarkModeToggle v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
