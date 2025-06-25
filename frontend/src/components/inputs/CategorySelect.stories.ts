// filepath: inputs/CategorySelect.stories.ts
import CategorySelect from './CategorySelect.vue';

export default {
  title: 'Components/inputs / CategorySelect',
  component: CategorySelect,
};

const Template = (args) => ({
  components: { CategorySelect },
  setup() {
    return { args };
  },
  template: '<CategorySelect v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
