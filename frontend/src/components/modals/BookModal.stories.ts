// filepath: modals/BookModal.stories.ts
import BookModal from './BookModal.vue';

export default {
  title: 'Components/modals / BookModal',
  component: BookModal,
};

const Template = (args) => ({
  components: { BookModal },
  setup() {
    return { args };
  },
  template: '<BookModal v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
