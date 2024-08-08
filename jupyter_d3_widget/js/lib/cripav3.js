require('./cripav3.css'); // styles

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

var alert_cid = function(that, cid){
    alert(cid);
    that.model.set({'clicked_dot': cid});
    that.touch();
};



// global vars data
var div_name;
var CrimeScale;
var full_data;
var map;
var deckOverlay;



var create = function (that) {
    console.log('start create');

    // intialize the html
    that.el.setAttribute('class', 'd3-cripav3');
    div_name = that.model.get('_div_name');
    that.el.innerHTML = `
        <div id="`+create_name('body',div_name)+`" class="body_cripav">
            <div id="`+create_name('controls_cripav',div_name)+`" class="navbar_cripav" style="height:60px;">
                <div class="column">
                    <b>Main Filters:</b>
                    <label for="alpha_mf">Alpha: </label>
                    <input type="number" id="alpha_mf" name="alpha_mf" style="width:100px;" min="0" max="1" step="0.1" value="0.5">
                    <label for="pct_mf">Pct: </label>
                    <input type="number" id="pct_mf" name="pct_mf" style="width:100px;" min="0" max="100" step="1" value="3">
                </div>
                <div class="column">
                    <div id="`+create_name('btn_run', div_name)+`" class="btn_run"><b>RUN</b></div>
                </div>
            </div>
            <div id="`+create_name('navbar_cripav',div_name)+`" class="navbar_cripav">
                <div id="`+create_name('btn_map', div_name)+`" class="btn_navbar" data-value="map"><b>MAP</b></div>
                <div id="`+create_name('btn_scatter', div_name)+`" class="btn_navbar" data-value="scatter"><b>SCATTER</b></div>
                <div id="`+create_name('btn_group', div_name)+`" class="btn_navbar" data-value="clusters"><b>CLUSTERS</b></div>
                <div id="`+create_name('btn_group', div_name)+`" class="btn_navbar" data-value="group"><b>GROUP</b></div>
                <div id="`+create_name('btn_time_series', div_name)+`" class="btn_navbar" data-value="time_series"><b>TIME SERIES</b></div>
                <div id="`+create_name('btn_images', div_name)+`" class="btn_navbar" data-value="images"><b>IMAGES</b></div>
            </div>
            <div id="`+create_name('map',div_name)+`" class="content element_visible"> 
            </div>
            <div id="`+create_name('scatter',div_name)+`" class="content element_hidden">
            </div>
            <div id="`+create_name('clusters',div_name)+`" class="content element_hidden">
            </div>
            <div id="`+create_name('group',div_name)+`" class="content element_hidden">
            </div>
            <div id="`+create_name('time_series',div_name)+`" class="content element_hidden" style="overflow-y: scroll;">
            </div>
            <div id="`+create_name('images',div_name)+`" class="content element_hidden">
            </div>
            <div class="footer_cripav" style="height:40px;">
                <div class="footer_info"><b>All hotspots:</b></div>
                <div class="footer_info"><b>Selected hotspots:</b></div>
            </div>
            <div id="`+create_name('footer_cripav',div_name)+`" class="footer_cripav">
                    <div id ="all_nodes" class="footer_info">Crimes:    | Nodes:</div>
                    <div id ="selected_nodes" class="footer_info">Crimes:    | Nodes:</div>
            </div>
        </div>
    `
    window.dom = that.el;
    full_data = that.model.get('value');
    CrimeScale = d3.scaleLinear()
                    .domain(d3.extent(full_data, d => d.inte)).nice()
                    .range([ 0, 15 ]);

    setTimeout(function(){ // we have to wait until the html is created; TODO: find other solution
        document.getElementById(create_name('btn_run', div_name)).onclick = function() {
            var n_execution = that.model.get('n_run');
            that.model.set({ 'alpha_mf': parseFloat(document.getElementById("alpha_mf").value)});
            that.model.set({ 'pct_mf': parseFloat(document.getElementById("pct_mf").value)});
            that.model.set({ 'n_run': n_execution + 1});
            that.touch();
        };
        // add base map to container
        map = new mapbox_gl.Map({
            container: create_name('map',div_name),
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
        set_links(that);
    }, 100);
}

var render = function(that) {
    console.log('start render');

    set_links(that);
}

var render_probint_scatter = function(that){
    console.log('RENDER PROBINT SCATTER');
    var name = create_name('scatter',div_name);
    var prev_svg = d3.select('#'+name);
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();
    var curr_visible = document.getElementsByClassName("element_visible")[0].id;
    var divWidth  = document.getElementById(curr_visible).clientWidth;
    var divHeight = document.getElementById(curr_visible).clientHeight;
    var xScale = d3.scaleLinear()
                .domain(d3.extent(full_data, function(d) { return d.prob; })).nice()
                .range([0, 1]);

    var yScale = d3.scaleLinear()
                .domain(d3.extent(full_data, function(d) { return d.inte; })).nice()
                .range([0, 1]);

    var margin_pct = {
        top: 0.1*divHeight,
        right: 0.20*divWidth,
        bottom: 0.1*divHeight,
        left: 0.20*divWidth
    };

    var width = divWidth  - margin_pct.left - margin_pct.right;
    var height = divHeight - margin_pct.top - margin_pct.bottom;


    var svg = d3.select('#'+name)
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
        .attr("transform","translate(" + margin_pct.left + "," + margin_pct.top + ")")

    const axisx = g_probint.append("g")
            .attr("transform", "translate(0, "+ height + ")")
            .call(d3.axisBottom(x).ticks(8));    

    const axisy = g_probint.append("g")
            .call(d3.axisLeft(y).ticks(8));

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate(20,"+((height/2)+margin_pct.top)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .style("fill","black")
        .text("Intensity");

    svg.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate("+((width/2)+margin_pct.left)+","+(divHeight-10)+")")  // text is drawn off the screen top left, move down and out and rotate
        .style("fill","black")
        .text("Probability");

    const dots_probint_no_hotspot = g_probint.append('g')
        .selectAll("circle")
        .data(full_data)
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
    
};

var render_cluster_plot = function(that) {
    console.log('START RENDER CLUSTER PLOT');

    var curr_visible = document.getElementsByClassName("element_visible")[0].id;
    var divWidth  = document.getElementById(curr_visible).clientWidth;
    var divHeight = document.getElementById(curr_visible).clientHeight;
    
    var prev_svg = d3.select("#"+create_name('clusters',div_name));
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var svg = d3.select("#"+create_name('clusters',div_name))
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", divHeight);

    var margin_pct = {
        top: 0.1*divHeight,
        right: 0.10*divWidth,
        bottom: 0.1*divHeight,
        left: 0.10*divWidth
    };

    var width = divWidth  - margin_pct.left - margin_pct.right;
    var height = divHeight - margin_pct.top - margin_pct.bottom;
    
    var data = that.model.get('data_cluster');
    var x=d3.scaleLinear()
            .domain(d3.extent(data, d=>d.x))
            .range([ 0, width ]);

    var y=d3.scaleLinear()
            .domain(d3.extent(data, d=>d.y))
            .range([ height, 0]);

    const g_cluster_plot = svg.append("g")
        .attr('id', 'cluster_plot')
        .attr("transform","translate(" + margin_pct.left + "," + margin_pct.top + ")")


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

var render_map = function (that) {
    console.log('START RENDER MAP');
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

var render_group_chart_plot = function(that) {
    console.log('START RENDER GROUP CHART PLOT');
    var curr_visible = document.getElementsByClassName("element_visible")[0].id;
    var dataset = that.model.get('data_cluster_mean');
    var divWidth  = document.getElementById(curr_visible).clientWidth;
    var divHeight = document.getElementById(curr_visible).clientHeight;
    var margin_pct = {
        top: 0.05*divHeight,
        right: 0.05*divWidth,
        bottom: 0.05*divHeight,
        left: 0.05*divWidth
    };
    
    var width = divWidth - margin_pct.left - margin_pct.right;
    var height = divHeight - margin_pct.bottom - margin_pct.top;

    var prev_svg = d3.select("#"+create_name('group',div_name));
    prev_svg.selectAll('g').remove();
    prev_svg.selectAll('svg').remove();

    var Mainsvg = d3.select("#"+create_name('group',div_name))
        .append("svg")
        .attr("width", divWidth)
        .attr("height", divHeight)

    var scatterArrange = Mainsvg.append('g')
        .attr('width', width )
        .attr('height', height)
        .attr('transform', 'translate(' + margin_pct.left + ',' + margin_pct.top + ')');
    
    var x=d3.scaleLinear()
        .domain([0,40])
        .range([ 0, width]);

    var y=d3.scaleLinear()
        .domain([0,20])
        .range([0, height]);
    
   
    
    var Scales = {};
    dataset.forEach(function(d){
        let  landExtent = d3.extent(d.serie.upper, function(f) { return f; });
        let xes = d3.scaleLinear()
                 .domain([0, d.serie.mean.length])
                 .range([x(d.x),x(d.x+d.with)]);

        let yes = d3.scaleLinear()
                .domain([0,landExtent[1]])
                .range([y(d.y)+y(d.height),y(d.y)]);
        
        Scales[d.class]={"xScale":xes,"yScale":yes};
    });
    
    var Areas = {};
    var Lines = {};
    dataset.forEach(function(j){
        Areas[j.class]= d3.area()
            .x(function(d,i) { 
                return Scales[j.class].xScale(i); })
            .y1(function(d){ 
                return Scales[j.class].yScale(d[2]); })
            .y0(function(d){ 
                return Scales[j.class].yScale(d[0]);})
            .curve(d3.curveBasis);
        
        Lines[j.class]= d3.line()
            .x(function(d,i) {          return Scales[j.class].xScale(i); })
            .y(function(d){             return Scales[j.class].yScale(d[1]); })
            .curve(d3.curveBasis);
    });
    
    var ListMixture = {};
    dataset.forEach(function(f){
        let TempArray =[];
        f.serie.mean.forEach(function(d,i){
            TempArray.push([f.serie.lower[i],d,f.serie.upper[i]])
        });
        ListMixture[f.class] = TempArray;
    });

    var area_path = scatterArrange.selectAll(".area")
        .data(dataset)
        .enter().append("path")
        .attr("id",function(d){return "arr_"+d.class;})
        .attr("class", function(d){return "class"+d.class;})
        .attr("d", function(d){ 
            return Areas[d.class](ListMixture[d.class]);
         })
        .attr("fill-opacity",0.7)
        .attr("stroke-opacity", 1);
        //.attr("fill",function(d){return CLASES[d.class].color})
        //.attr("stroke",function(d){return CLASES[d.class].color;})
    
     var Line_path = scatterArrange.selectAll(".area")
        .data(dataset)
        .enter().append("path")
        .attr("d", function(d){ return Lines[d.class](ListMixture[d.class]);   })
        .attr("fill","none")
        .attr("stroke","#4e4e4e")//function(d){return CLASES[d.class].color;})
        .attr("stroke-opacity", 1)
        .attr("stroke-width",2)
    
    scatterArrange.selectAll("rect")
        .data(dataset)
        .enter()
        .append("rect")
            .attr("x",function(d){return x(d.x)})
            .attr("y",function(d){return y(d.y)})
            .attr("width",function(d){return x(d.with)})
            .attr("height",function(d){return y(d.height)})
            .attr("fill-opacity",0)
            .attr("stroke", "#747474")
            .attr("stroke-width",2)
            .on("click",function(e){
                that.model.set({ 'selected_class':e.class});
                console.log(that.model.get('selected_class'));
                that.touch();
            });
            //.attr("fill",function(d){return CLASES[d.class].color})
};

var render_time_series = function(that) {
    console.log('START RENDER TIME SERIES');
    var prev_svg = d3.select("#"+create_name('time_series',div_name));
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
    var curr_visible = document.getElementsByClassName("element_visible")[0].id;
    var divWidth  = document.getElementById(curr_visible).clientWidth;
    var divHeight = document.getElementById(curr_visible).clientHeight;

    var total_height = (data.length)*30;
    var svg = d3.select("#"+create_name('time_series',div_name))
                .append("svg")
                .attr("width",  divWidth)
                .attr("height", total_height);

    var margin_pct = {
        top: 0,
        right: 0.1*divWidth,
        bottom: 10,
        left: 0.1*divWidth
    };

    var width = divWidth  - margin_pct.left - margin_pct.right;
    var height = total_height - margin_pct.top - margin_pct.bottom;    

    console.log(margin_pct);
    const g_time_series_plot = svg.append("g")
        .attr('id', 'g_time_series_plot')
        .attr("transform","translate(" + margin_pct.left + "," + margin_pct.top + ")")

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
        .attr("x", -30)
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

var set_links = function (that) {
    const collection = document.getElementsByClassName("btn_navbar");
    for (let i = 0; i < collection.length; i++){
        collection[i].onclick = function(){
            var btn_val = create_name(collection[i].getAttribute('data-value'), div_name);
            var previous_visible = document.getElementsByClassName("element_visible")[0].id;
            document.getElementById(previous_visible).classList.remove('element_visible');
            document.getElementById(previous_visible).classList.add('element_hidden');
            // cambiar actual oculto -> visible
            document.getElementById(btn_val).classList.remove('element_hidden');
            document.getElementById(btn_val).classList.add('element_visible');
        }
    }
}

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
    render_probint_scatter:render_probint_scatter,
    render_cluster_plot:render_cluster_plot,
    render_group_chart_plot:render_group_chart_plot,
    render_time_series:render_time_series,
    render_map:render_map,
    render_total_header: render_total_header,
    render_selected_header: render_selected_header
};

module.exports = view;