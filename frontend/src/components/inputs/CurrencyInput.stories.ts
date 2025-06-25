// filepath: inputs/CurrencyInput.stories.ts
import CurrencyInput from './CurrencyInput.vue';

export default {
  title: 'Components/inputs / CurrencyInput',
  component: CurrencyInput,
};

const Template = (args) => ({
  components: { CurrencyInput },
  setup() {
    return { args };
  },
  template: '<CurrencyInput v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
