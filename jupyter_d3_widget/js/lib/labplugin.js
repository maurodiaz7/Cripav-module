import {HelloModel, HelloView, version} from './index';
import {IJupyterWidgetRegistry} from '@jupyter-widgets/base';

export const helloWidgetPlugin = {
  id: 'jupyter_d3_widget:plugin',
  requires: [IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'jupyter_d3_widget',
          version: version,
          exports: { HelloModel, HelloView }
      });
  },
  autoStart: true
};

export default helloWidgetPlugin;
