// filepath: inputs/CategoryForm.stories.ts
import CategoryForm from './CategoryForm.vue';

export default {
  title: 'Components/inputs / CategoryForm',
  component: CategoryForm,
};

const Template = (args) => ({
  components: { CategoryForm },
  setup() {
    return { args };
  },
  template: '<CategoryForm v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
