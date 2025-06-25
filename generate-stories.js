const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'frontend', 'src', 'components');
const storyTemplate = (componentName, vueFile, relDir) => `
// filepath: ${path.join(relDir, vueFile.replace('.vue', '.stories.ts'))}
import ${componentName} from './${vueFile}';

export default {
  title: 'Components/${relDir ? relDir.replace(/\//g, ' / ') + ' / ' : ''}${componentName}',
  component: ${componentName},
};

const Template = (args) => ({
  components: { ${componentName} },
  setup() {
    return { args };
  },
  template: '<${componentName} v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};
`;

function toPascalCase(str) {
  return str
    .replace(/(^\w|-\w)/g, clearAndUpper)
    .replace('.vue', '');
  function clearAndUpper(text) {
    return text.replace(/-/, '').toUpperCase();
  }
}

// Recursively walk through all subfolders and files
function generateStories(dir, relDir = '') {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      generateStories(entryPath, path.join(relDir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      const base = entry.name.replace('.vue', '');
      const storyTs = path.join(dir, `${base}.stories.ts`);
      const storyJs = path.join(dir, `${base}.stories.js`);
      if (!fs.existsSync(storyTs) && !fs.existsSync(storyJs)) {
        const componentName = toPascalCase(base);
        fs.writeFileSync(
          storyTs,
          storyTemplate(componentName, entry.name, relDir).trimStart(),
          { encoding: 'utf8', flag: 'w' }
        );
        console.log(`Generated story: ${storyTs}`);
      }
    }
  });
}

generateStories(componentsDir, '');