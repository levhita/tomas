import AdminNavbar from './AdminNavbar.vue';
import { Meta, Story } from '@storybook/vue3'; 
export default {
  title: 'Components/AdminNavbar',
  component: AdminNavbar,
} as Meta;

const Template: Story = (args) => ({
  components: { AdminNavbar },
  setup() {
    return { args };
  },
  template: '<AdminNavbar v-bind="args" />',
});
export const Default = Template.bind({});
Default.args = {

};