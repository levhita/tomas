import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import SearchForm from './SearchForm.vue';

const meta: Meta<typeof SearchForm> = {
  title: 'Components/SearchForm',
  component: SearchForm,
  tags: ['stable', 'testable'],

 
};

const Template = (args) => ({
  components: { SearchForm },
  setup() {
    const searchQuery = ref('');
    return { args, searchQuery };
  },
  template: '<SearchForm v-bind="args" v-model="searchQuery" />',
});

export const Default: StoryObj<typeof SearchForm> = {
  render: Template,
  args: {
    placeholder: 'Search...',
  },
};

export default meta;




