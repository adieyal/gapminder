
// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 100},
    y_axis_margin = 60,
    x_axis_margin = 65;

graph_width = 1000;


var colorScale = d3.scale.category10();

var container = d3.select("#chart")

// Finds (and possibly interpolates) the value for the specified year.
function interpolateValues(values, year) {
    var bisect = d3.bisector(function(d) {
        return d[0];
    });

    var i = bisect.left(values, year, 0, values.length - 1),
        a = values[i];
    if (i > 0) {
      var b = values[i - 1],
          t = (year - a[0]) / (b[0] - a[0]);
      return a[1] * (1 - t) + b[1] * t;
    }
    return a[1];
}

var BubbleLabel = function(gapminder, parameters) {
    this.gapminder = gapminder;
    this.p = parameters; 
    this.name = this.p.name;
    this.colour = this.p.colour;
    this.x = this.p.x;
    this.y = this.p.y;
    this.radius = this.p.radius;
    this.additional_data = this.p.additional_data;
    this.is_hidden = true;
}

BubbleLabel.prototype = {
    update : function(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    },

    hidden : function() {
        if (this.is_hidden && this.gapminder.scales.radius(this.radius) < 15)
            return true;
        return false;
    }
}

var GapMinder = function(container, dataobj, years, properties) {
    var p = properties;

    this.p = p;
    this.scales = p.scales;
    this.years = years;
    this.dataobj = dataobj;
    this.current_year = this.years.start_year;

    var xAxis = d3.svg.axis().orient("bottom").scale(this.scales.x).ticks(12, d3.format(",d")),
        yAxis = d3.svg.axis().scale(this.scales.y).orient("left");

    this.svg = container.append("svg")
        .attr("width", p.width + p.margin.left + p.margin.right)
        .attr("height", p.height + p.margin.top + p.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + p.margin.left + "," + p.margin.top + ")");

    this.graph = this.svg.append("g")
    
    this.graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (p.height - x_axis_margin) + ")")
        .call(xAxis);

    this.graph.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + y_axis_margin + ")")
        .call(yAxis)

    this.svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", p.width / 2)
        .attr("y", p.height)
        .text(p.x_axis_label)
        .classed("x-axis-label", true);

    this.svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("y",0)
        .attr("x", (-p.height  + x_axis_margin) / 2)
        .attr("transform", "rotate(-90)")
        .text(p.y_axis_label)
        .classed("y-axis-label", true);

    this.label = this.graph.append("text")
        .attr("class", "year label")
        .attr("text-anchor", "middle")
        .attr("y", p.height / 2)
        .attr("dy", "0.25em")
        .attr("x", p.graph_width / 2)
        .text(this.years.start_year)
        .classed("year-label", true);

    var lines_group = this.graph.append("g");
    if (properties.additional_lines) {
        for (idx in properties.additional_lines) {
            line = properties.additional_lines[idx];
            line_group = lines_group.append("g")
            line_group.append("line")
                .attr("x1", this.scales.x(0))
                .attr("y1", 0)
                .attr("x2", this.scales.x(dataobj.x.max))
                .attr("y2", 0)
                .classed("world-markets", true)
             line_group.append("text")
                .text(line.label)
                .style("text-anchor", "start")
                .attr("transform", "translate(" + this.scales.x(dataobj.x.max) + ")")
                .attr("dy", "0.3em")
                .attr("dx", "0.3em")

             line_group.attr("transform", "translate(0," + this.scales.y(line.value) + ")")
        }
    }
}

GapMinder.prototype = {
    stopAnimation : function() {
        this.svg.transition();
    },

    startAnimation : function() {
        var self = this;
        tweenYear = function() {
            var year = d3.interpolateNumber(self.current_year, self.years.end_year);
            return function(t) { self.displayYear(year(t)); };
        }

        this.svg.transition()
            .duration(30000)
            .ease("linear")
            .tween("year", tweenYear)
    },

    position : function(dot, gapminder) {
        self = gapminder;
        dot
          .attr("cx", function(d) { return self.scales.x(d.x); })
          .attr("cy", function(d) { return self.scales.y(d.y); })
          .attr("r", function(d) { return self.scales.radius(d.radius); });
    },

    position_label : function(dot, gapminder) {
        self = gapminder;
        dot
          .attr("x", function(d) {
              var radius = self.scales.radius(d.radius);
              return self.scales.x(d.x) + radius / 2 + 8})
          .attr("y", function(d) {
              var radius = self.scales.radius(d.radius);
              return self.scales.y(d.y) - (radius / 2);
           })
          .classed("hidden", function(d) {
              return d.hidden();
          })
    },

    // Defines a sort order so that the smallest dots are drawn on top.
    order : function(a, b) {
      return b.radius - a.radius;
    },

    initCircles : function() {
        var self = this;
        this.bubble_labels = []
        var interpolated_data = this.interpolateData(this.years.start_year);
        for (idx in interpolated_data) {
            var datum = interpolated_data[idx];
            this.bubble_labels.push(new BubbleLabel(this, datum));
        }

        // Add a dot per nation. Initialize the data at start_year, and set the colors.
        this.dot = this.graph.append("g")
            .attr("class", "dots")
            .selectAll(".dot")
                .data(this.bubble_labels)
                .enter().append("circle")
                    .attr("class", "dot")
                    .style("fill", function(d) {
                        return colorScale(d.name); })
                    .call(this.position, this)
                    .sort(this.order)
                    .on("mouseover", function() {
                        this.__data__.is_hidden = false;
                        console.log(this);
                    })
                    .on("mouseout", function() {
                        this.__data__.is_hidden = true;
                    })

        this.labels = this.graph.append("g")
            .attr("class", "labels")
            .selectAll(".label")
                .data(this.bubble_labels)
                .enter().append("text")
                    .attr("class", "label")
                    .attr("text-anchor", "start")
                    .text(self.p.func_label)
                    .call(this.position_label, this)
    },

    displayYear : function(year) {
        var interpolated_data = this.interpolateData(year);
        for (idx in interpolated_data) {
            var datum = interpolated_data[idx];
            this.bubble_labels[idx].update(datum.x, datum.y, datum.radius)
        }
        this.current_year = year;
        
        this.dot.data(this.bubble_labels).call(this.position, this).sort(this.order);
        this.label.text(Math.round(year));
        this.labels.data(this.bubble_labels).call(this.position_label, this)
    },


    // Interpolates the dataset for the given (fractional) year.
    interpolateData : function(year) {

        year_data = [];
        var hash = this.dataobj.hash;
        var countries = Object.keys(hash);
        for (idx in countries) {
            year_idx = year - this.years.start_year;
            country = countries[idx];
            country_data = hash[country];
            year_data.push({
                name: country,
                colour: country,
                x: interpolateValues(country_data[this.dataobj.x.key], year),
                y: interpolateValues(country_data[this.dataobj.y.key], year),
                radius: interpolateValues(country_data[this.dataobj.radius.key], year),
                additional_data : this.p.additional_data[country],
            })
        }
        return year_data
    }
}

var StartButton = function(gapminder, container) {

    animating = true;
    
    var reset = function() {
        pause();
        gapminder.current_year = gapminder.years.start_year;

        start();
    }

    var start = function() {
        animating = true;
        gapminder.startAnimation()
    }

    var pause = function() {
        animating = false;
        gapminder.stopAnimation()
    }


    container.append("br")

    var startStop = container.append("button")
        .text("Pause")
        .style("margin-left", margin.left + 'px')
        .style("margin-top", margin.top + 'px')
        .on("click", function() {
            var button = d3.select(this);
            if (!animating) {
                button.text("Pause");
                start();
            } else {
                button.text("Start");
                pause()
            }
        })

    container.append("button")
        .text("Reset")
        .on("click", function(el) {
            reset();
            startStop.text("Pause");
        })
}

var load_data = function(csvfile, params) {
    var min_y = params.min_y ? params.min_y : 0;
    var min_x = params.min_x ? params.min_x : 0;
    var min_radius = params.min_radius ? params.min_radius : 5;
    var max_radius = params.max_radius ? params.max_radius : 40;
    var func_label = params.func_label ? params.func_label : function(d) { return d.name; };
    var additional_data = params.additional_data ? params.additional_data : {};
    var additional_lines = params.additional_lines ? params.additional_lines : [];

    d3.csv(csvfile, function(data) {
        var dataobj = new Data(data, params.x_key, params.y_key, params.radius_key, params.years, params.country_key, params.indicator_key)

        var width = params.width - margin.right;
        var height = params.height - margin.top - margin.bottom;
        var graph_width = width;
        if (params.additional_lines)
            graph_width *= 0.7;
            
        var gapminder = new GapMinder(container, dataobj, params.years, {
            width: width,
            height: height,
            graph_width: graph_width,
            margin: margin,
            scales : {
                // TODO fix this 500 - be more generic and dynamic
                x : d3.scale.linear().domain([min_x, dataobj.x.max]).range([y_axis_margin, graph_width]).nice(),
                y : d3.scale.linear().domain([min_y, dataobj.y.max]).range([height - x_axis_margin, 10]).nice(),
                radius : d3.scale.sqrt().domain([dataobj.radius.min, dataobj.radius.max]).range([min_radius, max_radius])
            },
            x_axis_label : params.x_axis_label,
            y_axis_label : params.y_axis_label,
            func_label : func_label,
            additional_data : additional_data,
            additional_lines : additional_lines
        });
        var button = new StartButton(gapminder, container);

        gapminder.initCircles();
        gapminder.startAnimation()

        if (params.drawing_callback) {
            params.drawing_callback(container.select("svg"), gapminder)
        }
    })
};
