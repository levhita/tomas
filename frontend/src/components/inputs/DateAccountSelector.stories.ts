// filepath: inputs/DateAccountSelector.stories.ts
import DateAccountSelector from './DateAccountSelector.vue';

export default {
  title: 'Components/inputs / DateAccountSelector',
  component: DateAccountSelector,
};

const Template = (args) => ({
  components: { DateAccountSelector },
  setup() {
    return { args };
  },
  template: '<DateAccountSelector v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
