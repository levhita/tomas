// filepath: navbars/GeneralNavbar.stories.ts
import GeneralNavbar from './GeneralNavbar.vue';

export default {
  title: 'Components/navbars / GeneralNavbar',
  component: GeneralNavbar,
};

const Template = (args) => ({
  components: { GeneralNavbar },
  setup() {
    return { args };
  },
  template: '<GeneralNavbar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
