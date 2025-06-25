// filepath: Calendar.stories.ts
import Calendar from './Calendar.vue';

export default {
  title: 'Components/Calendar',
  component: Calendar,
};

const Template = (args) => ({
  components: { Calendar },
  setup() {
    return { args };
  },
  template: '<Calendar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
