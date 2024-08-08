/* 
Change log:
- import the scatterplot as d3_scatterplot
- rename HelloModel and HelloView as ScatterplotModel and ScatterplotView
*/
var widgets = require('@jupyter-widgets/base');
var d3_scatterplot = require('./scatterplot.js');
var d3_cripav4 = require('./cripav4.js');
var d3_simplemap = require('./simple_map.js');
var d3_simplemap2 = require('./simple_map2.js');
var d3_comparison_map = require('./comparison_map.js');
var _ = require('lodash');

// See example.py for the kernel counterpart to this file.


// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.

// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var ScatterplotModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'ScatterplotModel',
        _view_name : 'ScatterplotView',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : [],
        clicked_dot: -1,
    })
});


// Custom View. Renders the widget model.
var ScatterplotView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        that.model.on('change:value', that.value_changed, that);

        // debug in browser
        window.dom = that.el;
    },

    value_changed: function() {
        let that = this;
        d3_projection.render_scatterplot(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_scatterplot.create(that);
    },
});

// Test widget
var TestwidgetModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'TestwidgetModel',
        _view_name : 'TestwidgetView',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : [],
        clicked_dot: -1,
    })
});


// Custom View. Renders the widget model.
var TestwidgetView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        that.model.on('change:projected_values', that.pj_changed, that);        

        // debug in browser
        window.dom = that.el;
    },

    pj_changed: function() {
        let that = this;
        d3_testwidget.update_testwidget(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_testwidget.create(that);
    },
});


var CriPAV4Model = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'CriPAV4Model',
        _view_name : 'CriPAV4View',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : []
    })
});


// Custom View. Renders the widget model.
var CriPAV4View = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        // that.model.on('change:projected_values', that.pj_changed, that);        
        that.model.on('change:data_cluster', that.update_clusters, that);
        that.model.on('change:current_selection', that.lasso_selection, that);
        that.model.on('change:current_time_series', that.time_series_selection, that);
        that.model.on('change:current_images', that.send_images, that);
        // debug in browser
        window.dom = that.el;
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_cripav4.create(that);
    },
    update_clusters: function() {
        let that = this;
        d3_cripav4.render_probint_scatter(that);
        d3_cripav4.render_cluster_plot(that);
        d3_cripav4.render_map(that);
        d3_cripav4.render_group_chart_plot(that);
        d3_cripav4.render_total_header(that);
    },
    lasso_selection: function() {
        let that = this;
        d3_cripav4.render_probint_scatter(that);
        d3_cripav4.render_map(that);
        d3_cripav4.render_selected_header(that);
    },
    time_series_selection: function() {
        let that = this;
        d3_cripav4.render_time_series(that);
    },
    send_images: function() {
        let that = this;
        d3_cripav4.add_image(that);
    }
});


var SimplemapModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'SimplemapModel',
        _view_name : 'SimplemapView',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : []
    })
});


// Custom View. Renders the widget model.
var SimplemapView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        // that.model.on('change:projected_values', that.pj_changed, that);        

        // debug in browser
        window.dom = that.el;
    },

    pj_changed: function() {
        let that = this;
        // d3_testwidget.update_testwidget(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_simplemap.create(that);
    },
});

var Simplemap2Model = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'Simplemap2Model',
        _view_name : 'Simplemap2View',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : []
    })
});


// Custom View. Renders the widget model.
var Simplemap2View = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        // that.model.on('change:projected_values', that.pj_changed, that);        

        // debug in browser
        window.dom = that.el;
    },

    pj_changed: function() {
        let that = this;
        // d3_testwidget.update_testwidget(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_simplemap2.create(that);
    },
});

var ComparisonMapModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'ComparisonMapModel',
        _view_name : 'ComparisonMapView',
        _model_module : 'jupyter_d3_widget',
        _view_module : 'jupyter_d3_widget',
        _model_module_version : '6.6.6',
        _view_module_version : '6.6.6',
        value : []
    })
});


// Custom View. Renders the widget model.
var ComparisonMapView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        // explicit
        let that = this;

        this.loadAndCreateToolElement();


        // Observe changes in the value traitlet in Python, and define
        // a custom callback.
        // that.model.on('change:projected_values', that.pj_changed, that);        

        // debug in browser
        window.dom = that.el;
    },

    pj_changed: function() {
        let that = this;
        // d3_testwidget.update_testwidget(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // scatterplot rendering
        d3_comparison_map.create(that);
    },
});

module.exports = {
    ScatterplotModel: ScatterplotModel,
    ScatterplotView: ScatterplotView,
    TestwidgetModel: TestwidgetModel,
    TestwidgetView: TestwidgetView,
    CriPAV4View: CriPAV4View,
    CriPAV4Model: CriPAV4Model,
    SimplemapView: SimplemapView,
    SimplemapModel: SimplemapModel,
    Simplemap2View: Simplemap2View,
    Simplemap2Model: Simplemap2Model,
    ComparisonMapView: ComparisonMapView,
    ComparisonMapModel: ComparisonMapModel,
};