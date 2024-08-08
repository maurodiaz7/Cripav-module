var d3 = require('d3');
var d3_lasso = require('d3-lasso');
var deckgl_core = require('@deck.gl/core');
var deckgl_layers = require('@deck.gl/layers');
var deckgl_mapbox = require('@deck.gl/mapbox');
var mapbox_gl = require('mapbox-gl');

require('./cripav1.css');


window.d3=d3;
window.d3_lasso=d3_lasso;
window.deckgl_core=deckgl_core;
window.deckgl_layers=deckgl_layers;
window.deckgl_mapbox = deckgl_mapbox;
window.mapbox_gl = mapbox_gl;

// constant for svg (probint)
var margin = {top: 30, right: 30, bottom: 50, left: 60},
    width = 350 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
var xScale, yScale;
var map;
var deckOverlay;
var CrimeScale;

var parse_rgb_attr = function(input){
    input = input.slice(4, -1);
    var array = JSON.parse("[" + input + "]");
    return array;
};

var create = function (that) {
    console.log('start create');

    // intialize the html
    that.el.setAttribute('class', 'd3-cripav1');
    that.el.innerHTML = `
        <div id="container_controls" style="width:950px; height:100px;background-color:#f5f9fa;display: flex;justify-content: center;align-items: center;">
            <div id="controls" style="width:450px; height:80px;margin: 10px;background-color:#f0f0f0;display: flex;justify-content: center;align-items: center;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
                    <div id="controls_1" style="width:430px;">
                    <h4> Main Filters </h4>
                        <label for="alpha_mf">Alpha: </label>
                        <input type="number" id="alpha_mf" name="alpha_mf" style="width:100px;" min="0" max="1" step="0.1" value="0.5">
                        <label for="pct_mf">Pct: </label>
                        <input type="number" id="pct_mf" name="pct_mf" style="width:100px;" min="0" max="100" step="1" value="3">
                        <input type="button" id="run_lamp" value="Run" style="width:100px;">
                    </div>
            </div>
            <div>
                <div id ="all_nodes" style="width:450px;">
                    Crimes:    | Nodes:
                </div>
                <b>Selection:</b><br>
                <div id ="selected_nodes" style="width:450px;">
                    Crimes:    | Nodes:
                </div>
            </div>
        </div>

        <div id="container_row1" style="width:950px; height:480px;background-color:#f5f9fa;display: flex;justify-content: center;align-items: center;">
            <div id="map" style="width:500px; height:460px;margin: 10px;background-color:#f0f0f0;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
            <div id="probint" style="width:400px; height:460px;margin: 10px;background-color:#f0f0f0;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
        </div>

        <div id="container_row2" style="width:950px; height:480px;background-color:#f5f9fa;display: flex;justify-content: center;align-items: center;">
            <div>
            <div id="show_clusters" class="fixed" style="background-color:lightblue;">🎛️</div><br>
            <div id="show_charts" class="fixed" style="background-color:lightblue;">📈</div>
            </div>
            <div id="cluster_scatterplot" style="width:400px; height:450px;margin: 10px;background-color:#f0f0f0;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
            <div id="group_chart_plot" style="width:400px; height:450px;margin: 10px;background-color:#f0f0f0; overflow-y: scroll; box-shadow: 5px 10px 18px #888888;border: 1px solid;display:none;">
            </div>
            <div id="time_series_plot" style="width:600px; height:450px;margin: 10px;background-color:#f0f0f0; overflow-y: scroll; box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
        </div>
        <div id="container_row3" style="width:950px; height:380px;background-color:#f5f9fa;display: flex;justify-content: center;align-items: center;">
            <div id="selected_time_series" style="width:900px; height:350px;margin: 10px;background-color:#f0f0f0;  box-shadow: 5px 10px 18px #888888;border: 1px solid;">
            </div>
        </div>
    `
    window.dom = that.el;
    var full_data = that.model.get('value');
    CrimeScale = d3.scaleLinear()
                    .domain(d3.extent(full_data, d => d.inte)).nice()
                    .range([ 0, 15 ]);
    
    setTimeout(function(){
        document.getElementById("run_lamp").onclick = function() {
            var lamp_execution = that.model.get('lamp_run');
            that.model.set({ 'alpha_mf': parseFloat(document.getElementById("alpha_mf").value)});
            that.model.set({ 'pct_mf': parseFloat(document.getElementById("pct_mf").value)});
            that.model.set({ 'lamp_run': lamp_execution + 1});
            that.touch();
        };
        map = new mapbox_gl.Map({
            container: 'map',
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
        // render(that);
        document.getElementById("show_clusters").addEventListener('click', function (event) {

            document.getElementById("group_chart_plot").style.display = "none";
            document.getElementById("cluster_scatterplot").style.display = "block";
        });
        document.getElementById("show_charts").addEventListener('click', function (event) {
            document.getElementById("cluster_scatterplot").style.display = "none";
            document.getElementById("group_chart_plot").style.display = "block";
        });
    }, 300);
}


var render = function(that) {
    console.log('start render');
    alert('LLAMADA FUNCION RENDER');
    // render probint

    render_cripav1(that);
};

var alert_cid = function(that, cid){
    alert(cid);
    that.model.set({'clicked_dot': cid});
    that.touch();
};

var render_cripav1 = function (that) {
    console.log('START RENDER CRIPAV1');
    var nodes = that.model.get('current_selection');
    if (nodes.length == 0){
        nodes = that.model.get('data_cluster');
    }
    nodes_filtered = nodes.filter(node => node.class != -1);
    for (let i = 0; i < nodes_filtered.length; i++){
        var elemt = document.getElementsByClassName('class'+nodes_filtered[i].class.toString())[0];
        //console.log(elemt);
        var style = window.getComputedStyle(elemt);
        //console.log('estilo');
        var color = style.getPropertyValue('fill');
        nodes_filtered[i].color = parse_rgb_attr(color);
    }
    //console.log(nodes_filtered);
    var data_layer = new deckgl_layers.ColumnLayer({
                    data: nodes_filtered,
                    diskResolution: 12,
                    radius:30,
                    extruded: true,
                    pickable: true,
                    elevationScale: 70,
                    getPosition: d => [d.lng,d.lat],
                    // getFillColor: d=> [],
                    getFillColor: d=> d.color,
                    getLineColor: [0, 0, 0],
                    getElevation:d=> CrimeScale(d.inte),
                });
    
    deckOverlay.setProps({
        layers: [data_layer],
        onClick: ({object}) => alert_cid(that, object.cid),
        getTooltip: ({object}) => object && {
            html: `<h5>${object.cid}</h5>`,
            style: {
                backgroundColor: '#e8f8ff'
            }
        }
    })                
}

var render_probint_plot = function(that){
    // ############################ PROBINT ##################################
    var prev_svg = d3.select("#probint");
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();
    var divWidth  = document.getElementById('probint').clientWidth;
    var divHeight = document.getElementById('probint').clientHeight;

    var data = that.model.get('value');

    var xScale = d3.scaleLinear()
                .domain(d3.extent(data, function(d) { return d.prob; })).nice()
                .range([0, 1]);

    var yScale = d3.scaleLinear()
                .domain(d3.extent(data, function(d) { return d.inte; })).nice()
                .range([0, 1]);


    var width = divWidth  - margin.left - margin.right;
    var height = divHeight - margin.top - margin.bottom;

    var svg = d3.select("#probint")
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", divHeight);

    var x=d3.scaleLinear()
            .domain([0,1])
            .range([ 0, width ]);

    var y=d3.scaleLinear()
            .domain([0,1])
            .range([ height, 0]);

    const g_probint = svg.append("g")
        .attr('id', 'probint_plot')
        .attr("transform","translate(" + margin.left + "," + margin.top + ")")

    const axisx = g_probint.append("g")
            .attr("transform", "translate(0, "+ height + ")")
            .call(d3.axisBottom(x).ticks(8));    

    const axisy = g_probint.append("g")
            .call(d3.axisLeft(y).ticks(8));

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(20,"+((height/2)+margin.top)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .style("fill","black")
        .text("Intensity");

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate("+((width/2)+margin.left)+","+(divHeight-10)+")")  // text is drawn off the screen top left, move down and out and rotate
        .style("fill","black")
        .text("Probability");

    var data = that.model.get('value');
    const dots_probint_no_hotspot = g_probint.append('g')
        .selectAll("circle")
        .data(data)
        .join("circle")
          .attr('class', 'class-non-hotspot')        
          .attr("cx", function (d) { return x(xScale(d.prob)); } )
          .attr("cy", function (d) { return y(yScale(d.inte)); } )
          .attr("r", 3)
          .attr("opacity", 0.3)
          .style("stroke", "black")
            .style("stroke-opacity",0.3)
            .style("stroke-width",1)
          .attr("id",function(d){return d.cid;});

    var data = that.model.get('current_selection');
    if (data.length > 0){
        const dots_probint_hotspot_selected = g_probint.append('g')
            .selectAll("circle")
            .data(data)
            .join("circle")
            .attr('class', function (d) { return 'class'+d.class.toString(); })        
            .attr("cx", function (d) { return x(xScale(d.prob)); } )
            .attr("cy", function (d) { return y(yScale(d.inte)); } )
            .attr("r", 3)
            .style("stroke", "black")
            .style("stroke-opacity",1)
            .style("stroke-width",1)
            .attr("id",function(d){return d.cid;});
    }
    else{
        var data = that.model.get('data_cluster');
        const dots_probint_hotspot = g_probint.append('g')
        .selectAll("circle")
        .data(data)
        .join("circle")
          .attr('class', 'class-hotspot')        
          .attr("cx", function (d) { return x(xScale(d.prob)); } )
          .attr("cy", function (d) { return y(yScale(d.inte)); } )
          .attr("r", 3)
          .attr("opacity", 0.6)
          .style("stroke", "black")
          .style("stroke-opacity",0.6)
          .style("stroke-width",1)
          .attr("id",function(d){return d.cid;});
    }
    
    // ############################ PROBINT ################################## 
}

var render_cluster_plot = function(that) {
    console.log('START RENDER CLUSTER PLOT');

    var divWidth  = document.getElementById('cluster_scatterplot').clientWidth;
    var divHeight = document.getElementById('cluster_scatterplot').clientHeight;
    if (divWidth == 0){ // si esta oculto entonces sacamos width de la ventana activa
        divWidth  = document.getElementById('group_chart_plot').clientWidth;
        divHeight = document.getElementById('group_chart_plot').clientHeight;
    }

    
    var prev_svg = d3.select("#cluster_scatterplot");
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var svg = d3.select("#cluster_scatterplot")
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", divHeight);

    var margin2 = {top: 15, right: 15, bottom: 15, left: 15};                
    var width = divWidth  - margin2.left - margin2.right;
    var height = divHeight - margin2.top - margin2.bottom;
    
    var data = that.model.get('data_cluster');
    var x=d3.scaleLinear()
            .domain(d3.extent(data, d=>d.x))
            .range([ 0, width ]);

    var y=d3.scaleLinear()
            .domain(d3.extent(data, d=>d.y))
            .range([ height, 0]);

    const g_cluster_plot = svg.append("g")
        .attr('id', 'cluster_plot')
        .attr("transform","translate(" + margin2.left + "," + margin2.top + ")")


    nodes_filtered = data.filter(node => node.class != -1);
    const dots_clusterplot = g_cluster_plot.append('g')
        .selectAll("circle")
        .data(nodes_filtered)
        .join("circle")
          .attr('class', function (d) { return 'class'+d.class.toString(); })        
          .attr("cx", function (d) { return x(d.x); } )
          .attr("cy", function (d) { return y(d.y); } )
          .attr("r", 3.5)
          .attr("id",function(d){return d.cid;})
          .style('stroke', 'black')
          .style('stroke-width', 0.5);

    var lasso_start = function() {
        // console.log('Lasso start');
        lasso.items()
            .attr("r",3.5); // reset size
            //.classed("not_possible",true)
            //.classed("selected",false);
    };

    var lasso_draw = function() {
                
        // Style the possible dots
        lasso.possibleItems()
            .classed("not_possible",false)
            .classed("possible",true);

            // Style the not possible dot
        lasso.notPossibleItems()
            .classed("not_possible",true)
            .classed("possible",false);
        };

    var lasso_end = function() {
        // console.log('Lasso end');
        // Reset the color of all dots
        //lasso.items()
          //  .classed("not_possible",false)
            //.classed("possible",false);

            // Style the selected dots
        lasso.selectedItems()
            .attr("r",7);
            //.classed("selected",true)

        ids = [];
        lasso.selectedItems()._groups[0].forEach(function(d){ids.push(d.id)});
        that.model.set({ 'selected_ids': ids});
        // console.log(ids);
        that.touch();
        // Reset the style of the not selected dots    
    };

    const lasso = d3_lasso.lasso()
          .closePathDistance(305) 
          .closePathSelect(true) 
          .targetArea(svg)
          .items(dots_clusterplot) 
          .on("start",lasso_start) 
          .on("end",lasso_end); 
          //.on("draw",lasso_draw) 
    svg.call(lasso);
};

var render_group_chart_plot = function(that) {
    console.log('START RENDER GROUP CHART PLOT');
    var data = that.model.get('data_cluster_mean');
    data.sort(function(a,b) {
        return b.cant - a.cant
    });
    for (let i = 0; i < data.length; i++){
        data[i].values = Array.from(Array(data[i].mean.length).keys());
    }
    // console.log(data);
    var prev_svg = d3.select("#group_chart_plot");
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var height_factor=d3.scaleLinear()
            .domain(d3.extent(data, d=>d.cant))
            .range([0.35,1]);

    var base_height = 100;
    var total_height = 0;
    for (let i = 0; i < data.length; i++){
        total_height += base_height*height_factor(data[i].cant);
    }
    console.log('total_height ' + total_height);
    
    var width  = document.getElementById('group_chart_plot').clientWidth;
    if (width == 0){
        width  = document.getElementById('cluster_scatterplot').clientWidth; // tomamos del cluster porque tiene el mismo tamano pero el otro no se renderiza al comienzo
    }
    var svg = d3.select("#group_chart_plot")
                .append("svg")
                .attr("width",  width)
                .attr("height", total_height);

    let x = d3.scaleLinear()
      .domain([0, data[0].mean.length])
      .range([0, width]);

    var margin2 = {top: 5, right: 5, bottom: 5, left: 5};
    width = width  - margin2.left - margin2.right;
    var height = total_height - margin2.top - margin2.bottom;
    var height_count = 0;
    for (let i = 0; i<data.length; i++){
        var current_height = base_height*height_factor(data[i].cant);
        var g_group = svg.append("g")
            .attr("width", "100%")
            .attr("height", current_height)
            .attr("transform","translate(0," + height_count + ")")
            .on('click', function () {
                that.model.set({ 'selected_class':data[i].class});
                console.log(that.model.get('selected_class'));
                that.touch();
            });

        
        var maximo = d3.max(data[i].mean);
        let y = d3.scaleLinear()
            .domain([0,maximo])
            .range([current_height, 0]);
        
        var data_aea = [];
        for (let j = 0; j<data[i].mean.length; j++){
            data_aea.push({
                'x':j,
                'y':data[i].mean[j]
            })
        }

        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveCatmullRom.alpha(.5))

        var gg = g_group.append("rect")
            .attr("width", "100%")
            .attr("height", current_height)
            .attr("stroke-width","3")
            .attr("stroke","rgb(0,0,0)")
            .attr("fill-opacity","0.0");

        g_group.append("path")
                .datum(data_aea)
                .attr('d', line)
                .attr("class", "class"+data[i].class)
                .attr("fill-opacity", "0.0")
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);

        height_count += current_height;
    }
    
};

var render_time_series = function(that) {
    console.log('START RENDER TIME SERIES');
    var prev_svg = d3.select("#time_series_plot");
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var data = that.model.get('current_time_series');
    if (data.length == 0){
        return 1;
    }
    /*CALC MAXIMUN*/
    var maximo = 0;
    for (let i = 0; i < data.length; i++){

        var temp_max = d3.max(data[i].data.map(x => x.value));
        if (temp_max > maximo){
            maximo = temp_max;
        }
    }
    // console.log(data);
    console.log('MAXIMO ' + maximo);
    ////////////////////////

    var divWidth  = document.getElementById('time_series_plot').clientWidth;
    var divHeight = document.getElementById('time_series_plot').clientHeight;

    var total_height = (data.length+2)*30;
    var svg = d3.select("#time_series_plot")
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", total_height);

    var margin2 = {top: 5, right: 10, bottom: 15, left: 65};                
    var width = divWidth  - margin2.left - margin2.right;
    var height = total_height - margin2.top - margin2.bottom;    
    

    const g_time_series_plot = svg.append("g")
        .attr('id', 'g_time_series_plot')
        .attr("transform","translate(" + margin2.left + "," + margin2.top + ")")

    let cids = data.map(function(f){return f.id}); 

    let x = d3.scaleLinear()
      .range([0, width])
      .domain([0,data[0].data.length]);

    let y_wrapper = d3.scaleBand()
      .rangeRound([0, height])
      .domain(cids);

    let y = d3.scaleLinear()
      .domain([0,maximo])
      .range([y_wrapper.bandwidth(), 0])

    let area = d3.area()
      .x(function(d){ return x(d.month); })
      .y1(function(d) { return y(d.value); })
      .y0(y(0))
      .curve(d3.curveBasis);
    
    g_time_series_plot.append("g")
      .attr("class", "axisWhite")
      .attr("transform", "translate(0, " + (height - 2) + ")")
      .call(d3.axisBottom(x))

    // labels
    g_time_series_plot.selectAll(".line-label")
        .data(data, function(d){ return d.id; })
      .enter().append("text")
        .attr("class", "line-label")
        .attr("x", -50)
        .attr("y", function(d) { return y_wrapper(d.id) + y_wrapper.bandwidth() - 3; })
        .text(function(d){ return d.id; })
        .style("font-size", "13px")
        .on('click', function (d) {
            alert_cid(that, d.id)
          });
    // baselines
    g_time_series_plot.selectAll(".baseline")
        .data(data, function(d){ return d.id; })
      .enter().append("line")
        .attr("class", "baseline")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", function(d) { return y_wrapper(d.id) + y_wrapper.bandwidth(); })
        .attr("y2", function(d) { return y_wrapper(d.id) + y_wrapper.bandwidth(); })
        .attr("stroke","black")
        .attr("stroke-opacity",1)
        .style("fill","#82bcfa");
    // JOIN
    var area_path = g_time_series_plot.selectAll(".areas")
        .data(data, function(d){ return d.id; })
        .enter().append("path")
        .attr("class", "areas")
        .attr("stroke","black")
        .attr("stroke-opacity",1)
        .attr("opacity",1)
        .attr("transform", function(d) { return "translate(0, " + (y_wrapper(d.id) - 1.5) + ")"; })
        .attr("d", function(d){ return area(d.data); })
        .style("fill","#82bcfa");
};

var render_physical_view = function(that) {
    console.log('START RENDER PHYSICAL VIEW');
    var prev_svg = d3.select("#selected_time_series");
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var data = that.model.get('selected_hotspot_series');
    if (data.length == 0){
        return 1;
    }
    /*CALC MAXIMUN*/
    var maximo = d3.max(data.map(x => x.value));
    ////////////////////////

    var divWidth  = document.getElementById('selected_time_series').clientWidth;
    var divHeight = document.getElementById('selected_time_series').clientHeight;

    var svg = d3.select("#selected_time_series")
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", divHeight);

    var margin2 = {top: 20, right: 20, bottom: 20, left: 20};                
    var width = divWidth  - margin2.left - margin2.right;
    var height = divHeight - margin2.top - margin2.bottom;    
    

    const g_selected_time_series_plot = svg.append("g")
        .attr('id', 'g_selected_time_series_plot')
        .attr("transform","translate(" + margin2.left + "," + margin2.top + ")")

    let x = d3.scaleLinear()
      .range([0, width])
      .domain([0,data.length]);


    let y = d3.scaleLinear()
      .domain([0,maximo])
      .range([height, 0])

    let area = d3.area()
      .x(function(d){ return x(d.month); })
      .y1(function(d) { return y(d.value); })
      .y0(y(0))
      .curve(d3.curveBasis);
    
    g_selected_time_series_plot.append("g")
      .attr("class", "axisWhite")
      .attr("transform", "translate(0, " + (height - 2) + ")")
      .call(d3.axisBottom(x))

    // JOIN
    var area_path = g_selected_time_series_plot.selectAll(".areas")
        .data(data)
        .enter().append("path")
        .attr("class", "areas")
        .attr("stroke","black")
        .attr("stroke-opacity",1)
        .attr("opacity",1)
        .attr("d", function(d){ return area(data); })    
        .style("fill","#82bcfa");
};

var render_total_header = function(that) {
    console.log('RENDER HEADER');
    var header1  = document.getElementById('all_nodes');
    var total_crimes = that.model.get('total_crimes');
    var total_hotspots = that.model.get('total_hotspots');
    var calculated_crimes = that.model.get('calculated_crimes');
    var calculated_hotspots = that.model.get('calculated_hotspots');
    var crimes_percent = ((calculated_crimes/total_crimes)*100).toFixed(2);
    var hotspots_percent = ((calculated_hotspots/total_hotspots)*100).toFixed(2);
    
    header1.textContent = "Crimes: " + crimes_percent + "% (" + calculated_crimes + " / " + total_crimes + " ) | ";
    header1.textContent += "Nodes: " + hotspots_percent + "% (" + calculated_hotspots + " / " + total_hotspots + " )";

};
var render_selected_header = function(that) {
    console.log('RENDER SELECTED HEADER');
    var header1  = document.getElementById('selected_nodes');
    var calculated_crimes = that.model.get('calculated_crimes');
    var calculated_hotspots = that.model.get('calculated_hotspots');
    var selected_crimes = that.model.get('selected_crimes');
    var selected_hotspots = that.model.get('selected_hotspots');
    var crimes_percent = ((selected_crimes/calculated_crimes)*100).toFixed(2);
    var hotspots_percent = ((selected_hotspots/calculated_hotspots)*100).toFixed(2);
        
    header1.textContent = "Crimes: " + crimes_percent + "% (" + selected_crimes + " / " + calculated_crimes + " ) | ";
    header1.textContent += "Nodes: " + hotspots_percent + "% (" + selected_hotspots + " / " + calculated_hotspots + " )";    

};

var view = {
    create: create,
    render_cripav1: render_cripav1,
    render_cluster_plot: render_cluster_plot,
    render_group_chart_plot: render_group_chart_plot,
    render_probint_plot: render_probint_plot,
    render_time_series: render_time_series,
    render_total_header: render_total_header,
    render_selected_header: render_selected_header,
    render_physical_view: render_physical_view
};

module.exports = view;