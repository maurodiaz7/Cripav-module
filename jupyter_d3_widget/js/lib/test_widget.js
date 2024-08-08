/*
- create a javascript file to render a scatterplot
- in the folder of file (js/):
    - run `npm install d3` to install the library of d3
    - run `npm install style-loader` to install the library of loading style file
    - run `npm install css-loader` to install the library of loading css file
    - you will need to install other packages like 'webpack'. 
        just install whatever the error information reminds you to install when running the command `npm install`
- import this file in example.js
- adapt the scatterplot rendering code from https://www.d3-graph-gallery.com/graph/scatter_basic.html
- in the end of the code, export the functions that needed to be accessed by other file
 */


var d3 = require('d3');
window.d3=d3;
require('./test_widget.css');

// constant for svg
var margin = {top: 30, right: 30, bottom: 30, left: 30},
    width = 500 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
var xScale, yScale, xScaleDate, yScaleValues;

var create = function (that) {
    console.log('start create');

    // intialize the html
    that.el.setAttribute('class', 'test_widget');
    that.el.innerHTML = `
        <div id="`+that.model.get('_div_name')+`">
            <svg class="map`+that.model.get('_div_name')+`" style='background-color:#e3eefc'></svg>
            <svg class="AEA`+that.model.get('_div_name')+`" style='background-color:#fff0f3'></svg>
        </div>
    `
    window.dom = that.el;
    render(that);
}

var render = function(that) {
    console.log('start render');

    var data = [];
    var nodes = that.model.get('nodes');
    var nodes_data = that.model.get('nodes_data');
    for (let i = 0; i < nodes.length; i++){
        data.push({
            'name':i,
            'x':nodes[i][1],
            'y':nodes[i][0]
        });
    }

    //alert(that.el.innerHTML);
    var svgElmt = that.el.getElementsByClassName('map'+that.model.get('_div_name'))[0];
    svgElmt.setAttribute('width', width + margin.left + margin.right);
    svgElmt.setAttribute('height', height + margin.top + margin.bottom);
    var svgElmt2 = that.el.getElementsByClassName('AEA'+that.model.get('_div_name'))[0];
    svgElmt2.setAttribute('width', width + margin.left + margin.right);
    svgElmt2.setAttribute('height', height + margin.top + margin.bottom);

    var svg = d3.select(svgElmt);
    var svg2 = d3.select(svgElmt2);
    window.svg = svg;
    window.svg2 = svg2;


    // append the svg object to the body of the page
    svg = svg.append("g")
        .attr('id', 'plot_tw'+that.model.get('_div_name'))
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
    
    svg2 = svg2.append("g")
        .attr('id', 'plot_tw_data'+that.model.get('_div_name'))
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x)).nice()
        .range([0, width])

    svg.append("g")
        .attr('id', 'x-axis')
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).ticks(6));

    // Add Y axis
    yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y)).nice()
        .range([height, 0])
    svg.append("g")
        .attr('id', 'y-axis')
        .call(d3.axisLeft(yScale));
    
    render_testwidget(that);
}

var render_testwidget = function (that) {
    console.log('start render_testwidget')
    var svg = window.svg.select('#plot_tw'+that.model.get('_div_name'));
    var svg2 = window.svg2.select('#plot_tw_data'+that.model.get('_div_name'));

    //Read the data
    // todo: hacerlo mas bonito
    var nodes = that.model.get('nodes');
    var edges = that.model.get('edges');
    var nodes_data = that.model.get('nodes_data');

    var data = [];
    for (let i = 0; i < nodes.length; i++){
        data.push({
            'name':i,
            'x':nodes[i][1],
            'y':nodes[i][0]
        });
    }
    var edges_data = [];
    for (let i = 0; i < edges.length; i++){
        edges_data.push({
            'name':i,
            'start':edges[i][0],
            'end':edges[i][1],
            'start_x':nodes[edges[i][0]][1],
            'start_y':nodes[edges[i][0]][0],
            'end_x':nodes[edges[i][1]][1],
            'end_y':nodes[edges[i][1]][0],
        });
    }
    var clicked_dot = that.model.get('clicked_dot');
    const svg2_path = svg2.append('path')
            .style("stroke", "black")
            .style("fill", "none");
    // Draw edges
    function draw(context, start, end) {
        context.moveTo(start[0], start[1]);
        context.lineTo(end[0], end[1]);
        return context;
    }
    function draw_path(context, x_axis, y_axis) {
        context.moveTo(x_axis[0], y_axis[0]);
        for (let i = 1; i < x_axis.length; i++){
            context.lineTo(x_axis[i], y_axis[i]);  
        }
        return context;
    }
    for(let i = 0; i < edges_data.length; i++){
        svg.append('path')
        .style("stroke", "black")
        .attr("d", draw(d3.path(),
            [xScale(edges_data[i].start_x),yScale(edges_data[i].start_y)],
            [xScale(edges_data[i].end_x),yScale(edges_data[i].end_y)])
        );
    }
    // Add nodes
    const dot = svg.append('g')
        .selectAll("circle")
        .data(data)
        .join("circle")
          .attr('class', 'dot')        
          .attr("cx", function (d) { return xScale(d.x); } )
          .attr("cy", function (d) { return yScale(d.y); } )
          .attr("r", 5)
          .attr("id", (d,i) => `dot-${i}`)
          .style('fill', '#69b3a2')
          .on('click', function () {
                var id = d3.select(this)._groups[0][0].id;
                var idx = +id.split('-')[1];                
                console.log('current clicked_dot: ' + clicked_dot);
                console.log('new idx: ' + idx);
                // Use D3 to select element, change color and size
                if (clicked_dot == idx) {
                    d3.select(this).style("fill", "#69b3a2");
                    that.model.set({ 'clicked_dot': -1});
                    clicked_dot = -1;
                } else {
                    d3.select(`#dot-${clicked_dot}`).style("fill", "#69b3a2");

                    d3.select(this).style("fill", "orange");
                    // change values
                    that.model.set({ 'clicked_dot': idx});
                    clicked_dot = idx;
                }
                that.touch();
          })
    
}

var update_testwidget = function (that) {
    console.log('start update_testwidget')
    //alert("get "+'#plot_tw_data'+that.model.get('_div_name'));
    var svg2 = window.svg2.select('#plot_tw_data'+that.model.get('_div_name'));
    //Read the data
    // todo: hacerlo mas bonito
    var nodes = that.model.get('nodes');
    var edges = that.model.get('edges');
    var nodes_data = that.model.get('nodes_data');
    var clicked_dot = that.model.get('clicked_dot');
    var projected_values = that.model.get('projected_values');
    //Remove previous axis
    svg2.selectAll('g').remove();
    svg2.selectAll('path').remove();
    //Add X axis for map_data
    var dates_list = nodes_data[clicked_dot][0];
    dates_list = dates_list.concat(projected_values[0]);
    dates_list = dates_list.map(dt => new Date(dt));
    xScaleDate = d3.scaleTime()
        .domain(d3.extent(dates_list)).nice()
        .range([0, width])

    const x_axis = svg2.append("g")
        .attr('id', 'x-axis')
        .attr("transform", "translate(0," + height + ")")
        .call(
            d3.axisBottom(xScaleDate)
            .ticks(d3.timeDay.every(10))
            .tickFormat(d3.timeFormat("%Y/%m/%d")));

    // Add Y axis for map_data
    var values_list = nodes_data[clicked_dot][1];
    values_list = values_list.concat(projected_values[1]);
    yScaleValues = d3.scaleLinear()
        .domain(d3.extent(values_list)).nice()
        .range([height, 0])

    svg2.append("g")
        .attr('id', 'y-axis')
        .call(d3.axisLeft(yScaleValues));

    x_dates = projected_values[0].map(dt => xScaleDate(new Date(dt)));
    y_cant = projected_values[1].map(dt => yScaleValues(dt));

    const svg2_path = svg2.append('path')
            .style("stroke", "blue")
            .style("fill", "none");
    const svg1_path = svg2.append('path')
            .style("stroke", "black")
            .style("fill", "none");

    function draw_path(context, x_axis, y_axis) {
        context.moveTo(x_axis[0], y_axis[0]);
        for (let i = 1; i < x_axis.length; i++){
            context.lineTo(x_axis[i], y_axis[i]);  
        }
        return context;
    }

    svg2_path.attr("d", draw_path(d3.path(),x_dates,y_cant));
    x_dates = nodes_data[clicked_dot][0].map(dt => xScaleDate(new Date(dt)));
    y_cant = nodes_data[clicked_dot][1].map(dt => yScaleValues(dt));
    svg1_path.attr("d", draw_path(d3.path(),x_dates,y_cant));
}

var view = {
    create: create,
    render_testwidget: render_testwidget,
    update_testwidget: update_testwidget
};

module.exports = view;