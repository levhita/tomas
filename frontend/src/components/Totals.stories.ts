// filepath: Totals.stories.ts
import Totals from './Totals.vue';

export default {
  title: 'Components/Totals',
  component: Totals,
};

const Template = (args) => ({
  components: { Totals },
  setup() {
    return { args };
  },
  template: '<Totals v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
