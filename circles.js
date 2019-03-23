
// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 100},
    width = 1024 - margin.right,
    height = 500 - margin.top - margin.bottom,
    y_axis_margin = 60,
    x_axis_margin = 65;


var colorScale = d3.scale.category10();

var container = d3.select("#chart")

var GapMinder = function(container, dataobj, years, properties) {
    var p = properties;

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
        .attr("x", -p.height / 2)
        .attr("transform", "rotate(-90)")
        .text(p.y_axis_label)
        .classed("y-axis-label", true);

    this.label = this.graph.append("text")
        .attr("class", "year label")
        .attr("text-anchor", "middle")
        .attr("y", p.height / 2)
        .attr("dy", "0.25em")
        .attr("x", p.width / 2)
        .text(this.years.start_year)
        .classed("year-label", true);
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
          .attr("x", function(d) { return self.scales.x(d.x); })
          .attr("y", function(d) { return self.scales.y(d.y); })
    },

    // Defines a sort order so that the smallest dots are drawn on top.
    order : function(a, b) {
      return b.radius - a.radius;
    },

    initCircles : function() {
        // Add a dot per nation. Initialize the data at start_year, and set the colors.
        this.dot = this.graph.append("g")
            .attr("class", "dots")
            .selectAll(".dot")
                .data(this.interpolateData(this.years.start_year))
                .enter().append("circle")
                    .attr("class", "dot")
                    .style("fill", function(d) { return colorScale(d.name); })
                    .call(this.position, this)
                    .sort(this.order)

        this.labels = this.graph.append("g")
            .attr("class", "labels")
            .selectAll(".label")
                .data(this.interpolateData(this.years.start_year))
                .enter().append("text")
                    .attr("class", "label")
                    .text(function(d) {
                        return d.name
                    })
                    .call(this.position_label, this)
    },

    displayYear : function(year) {
        this.current_year = year;

        function key(d) { return d["name"]; }
        this.dot.data(this.interpolateData(year)).call(this.position, this).sort(this.order);
        this.label.text(Math.round(year));
        this.labels.data(this.interpolateData(year)).call(this.position_label, this)
    },


    // Interpolates the dataset for the given (fractional) year.
    interpolateData : function(year) {
        // A bisector since many nation's data is sparsely-defined.
        var bisect = d3.bisector(function(d) {
            return d[0];
        });

        // Finds (and possibly interpolates) the value for the specified year.
        function interpolateValues(values, year) {
            var i = bisect.left(values, year, 0, values.length - 1),
                a = values[i];
            if (i > 0) {
              var b = values[i - 1],
                  t = (year - a[0]) / (b[0] - a[0]);
              return a[1] * (1 - t) + b[1] * t;
            }
            return a[1];
        }

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
                radius: interpolateValues(country_data[this.dataobj.radius.key], year)
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
    d3.csv(csvfile, function(data) {
        var dataobj = new Data(data, params.x_key, params.y_key, params.radius_key, params.years, params.country_key, params.indicator_key)

        var gapminder = new GapMinder(container, dataobj, params.years, {
            width: width,
            height: height,
            margin: margin,
            scales : {
                x : d3.scale.linear().domain([dataobj.x.min, dataobj.x.max]).range([y_axis_margin, width]),
                y : d3.scale.linear().domain([dataobj.y.min, dataobj.y.max]).range([height - x_axis_margin, 10]),
                radius : d3.scale.sqrt().domain([dataobj.radius.min, dataobj.radius.max]).range([0, 40])
            },
            x_axis_label : params.x_axis_label,
            y_axis_label : params.y_axis_label
        });
        var button = new StartButton(gapminder, container);

        gapminder.initCircles();
        gapminder.startAnimation()
    })
};
