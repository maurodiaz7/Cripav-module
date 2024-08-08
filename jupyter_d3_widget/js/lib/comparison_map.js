require('./comparison_map.css'); // styles
var d3 = require('d3');
var d3_lasso = require('d3-lasso');
var d3_tip = require('./d3-tip.js');
var deckgl_core = require('@deck.gl/core');
var deckgl_layers = require('@deck.gl/layers');
var deckgl_mapbox = require('@deck.gl/mapbox');
var mapbox_gl = require('mapbox-gl');

window.d3=d3;
window.d3_lasso = d3_lasso;
window.d3_tip = d3_tip;
window.deckgl_core=deckgl_core;
window.deckgl_layers=deckgl_layers;
window.deckgl_mapbox = deckgl_mapbox;
window.mapbox_gl = mapbox_gl;

// misc functions

function create_name(name, dv_name){
    return name +"_" + dv_name
}

function return_name(name){
    return name.slice(0, -6); // remove last 5 characters that are id of class
}

function parse_rgb_attr(input){
    input = input.slice(4, -1);
    var array = JSON.parse("[" + input + "]");
    return array;
}

function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}


// global vars data
let div_name;
let ValueScales;
var map;
let deckOverlays = [];

var alert_cid = function(that, cid){
    /*add_loading_div2(that);
    that.model.set({'clicked_dot': cid});
    that.touch();*/
    alert(cid);
};

var create = function (that) {
    console.log('start create');
    // intialize the html
    that.el.setAttribute('class', 'd3-cripav3');
    var div_name = that.model.get('_div_name');
    var datasets = that.model.get('datasets');
    var html_text = `
        <div id="`+create_name('body',div_name)+`" class="body_comparison_map">        
    `;
    for (let i = 0; i < datasets.length; i++){
        html_text += `<div class="row">
            <div id="`+create_name('map_'+i,div_name)+`" class="content element_visible" style="width:100%;"> 
                </div>
            </div>
        `;
    }
    
    deckOverlays = [];
    html_text +=`</div>`
    that.el.innerHTML = html_text;
    window.dom = that.el;


    setTimeout(function(){ // we have to wait until the html is created; TODO: find other solution
        // add base map to container
        for (let i = 0; i < datasets.length; i++){
            map = new mapbox_gl.Map({
                container: create_name('map_'+i,div_name),
                style: 'mapbox://styles/mapbox/light-v9',
                accessToken: 'pk.eyJ1IjoiZ2VnYXphIiwiYSI6ImNqOHNkMXV0cDA4bGgzM3A4OHZwOHNxYWUifQ.cEY6vV7UqVGv7Qd3WxI-dA',
                center: [-46.634731, -23.548682],
                zoom: 12,
                antialias: true,
                bearing: 30,
                pitch: 0,
                attributionControl: false
            });
            var deckOverlay = new deckgl_mapbox.MapboxOverlay({
                interleaved:true,
                layers: []
            });
            map.addControl(deckOverlay);
            deckOverlays.push(deckOverlay);
            render_map(that, i);
        }
    }, 300);
}

var render = function(that) {
    console.log('start render');
}

var render_map = function (that, i) {
    console.log('START RENDER MAP');
    var dataset = that.model.get('datasets')[i];
    var current_scale = d3.scaleLinear()
                    .domain(d3.extent(dataset.map(d => d.value))).nice()
                    .range([ 0, 35 ]);
    console.log(dataset);
    var data_layer = new deckgl_layers.ColumnLayer({
                    data: dataset,
                    diskResolution: 12,
                    radius:that.model.get('radius'),
                    extruded: true,
                    pickable: true,
                    elevationScale: 70,
                    getPosition: d => [d.lng,d.lat],
                    // getFillColor: d=> [],
                    getFillColor: d=> [66, 135, 245],
                    getLineColor: [0, 0, 0],
                    getElevation:d=> current_scale(d.value),
                });
    
    deckOverlays[i].setProps({
        layers: [data_layer],
        onClick: ({object}) => alert_cid(that, object.cid),
        getTooltip: ({object}) => object && {
            html: `<h5>${object.value}</h5>`,
            style: {
                backgroundColor: '#e8f8ff'
            }
        }
    })                
}


var view = {
    create: create,
    render_map:render_map
};

module.exports = view;