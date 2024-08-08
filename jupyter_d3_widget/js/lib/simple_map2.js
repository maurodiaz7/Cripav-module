var d3 = require('d3');
var deckgl_core = require('@deck.gl/core');
var deckgl_layers = require('@deck.gl/layers');
var deckgl_mapbox = require('@deck.gl/mapbox');
var mapbox_gl = require('mapbox-gl');


window.d3=d3;
window.deckgl_core=deckgl_core;
window.deckgl_layers=deckgl_layers;
window.deckgl_mapbox = deckgl_mapbox;
window.mapbox_gl = mapbox_gl;

// constant for svg (probint)
var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 500 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
var xScale, yScale;
var map;
var deckOverlay;


var create = function (that) {
    console.log('start create');

    // intialize the html
    that.el.setAttribute('class', 'd3-cripav1');
    var div_name = "map_"+that.model.get('_div_name');
    that.el.innerHTML = `
        <div id="container_row1" style="width:100%; height:550px;background-color:#f5f9fa;display: flex;justify-content: center;align-items: center;">
            <div id="`+div_name+`" style="width:100%; height:500px;margin: 10px;background-color:#f0f0f0;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
        </div>
    `
    window.dom = that.el;

    setTimeout(function(){
        var div_name = "map_"+that.model.get('_div_name');
        map = new mapbox_gl.Map({
            container: div_name,
            style: 'mapbox://styles/mapbox/light-v9',
            accessToken: 'pk.eyJ1IjoiZ2VnYXphIiwiYSI6ImNqOHNkMXV0cDA4bGgzM3A4OHZwOHNxYWUifQ.cEY6vV7UqVGv7Qd3WxI-dA',
            center: [-46.634731, -23.548682],
            zoom: 12,
            antialias: true,
            bearing: 30,
            pitch: 0,
            attributionControl: false
        });
        deckOverlay = new deckgl_mapbox.MapboxOverlay({
                interleaved:true,
                layers: []
        });
        map.addControl(deckOverlay);
        var data = that.model.get('values');
        console.log('DATA');
        var cant = data.map(d => d.cant);
        console.log(cant);
        var CrimeScale = d3.scaleLinear()
                    .domain(d3.extent(cant)).nice()
                    .range([0,100]);
        var data_layer = new deckgl_layers.ColumnLayer({
                    data: data,
                    diskResolution: 12,
                    radius:that.model.get('radius'),
                    extruded: true,
                    pickable: true,
                    elevationScale: 1,
                    getPosition: d => [d.lng,d.lat],
                    // getFillColor: d=> [],
                    getFillColor: [200,100,50],
                    getLineColor: [0, 0, 0],
                    getElevation: d=> CrimeScale(d.cant),
                    opacity: that.model.get('opacity')
                });
    
        deckOverlay.setProps({
            layers: [data_layer]
        })   
    }, 300);
}

var render = function(that) {
    console.log('start render');

    render_simplemap(that);
}

var render_simplemap = function (that) {
    console.log('START RENDER SIMPLEMAP');
             
}

var view = {
    create: create,
    render_simplemap: render_simplemap
};

module.exports = view;