// filepath: navbars/AdminNavbar.stories.ts
import AdminNavbar from './AdminNavbar.vue';

export default {
  title: 'Components/navbars / AdminNavbar',
  component: AdminNavbar,
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
