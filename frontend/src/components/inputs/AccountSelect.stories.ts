// filepath: inputs/AccountSelect.stories.ts
import AccountSelect from './AccountSelect.vue';

export default {
  title: 'Components/inputs / AccountSelect',
  component: AccountSelect,
};

const Template = (args) => ({
  components: { AccountSelect },
  setup() {
    return { args };
  },
  template: '<AccountSelect v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
