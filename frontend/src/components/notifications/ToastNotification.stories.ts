// filepath: notifications/ToastNotification.stories.ts
import ToastNotification from './ToastNotification.vue';

export default {
  title: 'Components/notifications / ToastNotification',
  component: ToastNotification,
};

const Template = (args) => ({
  components: { ToastNotification },
  setup() {
    return { args };
  },
  template: '<ToastNotification v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
