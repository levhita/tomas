// filepath: modals/CategoriesModal.stories.ts
import CategoriesModal from './CategoriesModal.vue';

export default {
  title: 'Components/modals / CategoriesModal',
  component: CategoriesModal,
};

const Template = (args) => ({
  components: { CategoriesModal },
  setup() {
    return { args };
  },
  template: '<CategoriesModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
