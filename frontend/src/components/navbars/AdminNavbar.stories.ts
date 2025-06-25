// filepath: navbars/AdminNavbar.stories.ts
import AdminNavbar from './AdminNavbar.vue';

export default {
  title: 'Components/navbars / AdminNavbar',
  component: AdminNavbar,
  // Add parameters to skip this story in tests
  parameters: {
    vitest: {
      skip: true // Skip this story in Vitest tests
    }
  }
};

const Template = (args) => ({
  components: { AdminNavbar },
  setup() {
    return { args };
  },
  template: '<AdminNavbar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
