
// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 100},
    width = 960 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var colorScale = d3.scale.category10();

var container = d3.select("#chart")

var GapMinder = function(container, dataobj, years, properties) {
    var p = properties;

    this.scales = p.scales;
    this.years = years;
    this.dataobj = dataobj;

    var xAxis = d3.svg.axis().orient("bottom").scale(this.scales.x).ticks(12, d3.format(",d")),
        yAxis = d3.svg.axis().scale(this.scales.y).orient("left");

    this.svg = container.append("svg")
        .attr("width", p.width + p.margin.left + p.margin.right)
        .attr("height", p.height + p.margin.top + p.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + p.margin.left + "," + p.margin.top + ")");

    // Add the x-axis.
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + p.height + ")")
        .call(xAxis);

    // Add the y-axis.
    this.svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Add an x-axis label.
    this.svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", p.width)
        .attr("y", p.height - 6)
        .text("Income level");

    // Add a y-axis label.
    this.svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Median age");

    this.label = this.svg.append("text")
        .attr("class", "year label")
        .attr("text-anchor", "end")
        .attr("y", p.height - 24)
        .attr("x", p.width)
        .text(this.years.start_year);
}

GapMinder.prototype = {
    stopAnimation : function() {
        this.svg.transition();
    },

    startAnimation : function() {
        var self = this;
      // Tweens the entire chart by first tweening the year, and then the data.
      // For the interpolated data, the dots and label are redrawn.
      tweenYear = function() {
        var year = d3.interpolateNumber(self.years.start_year, self.years.end_year);
        return function(t) { self.displayYear(year(t)); };
      }

        this.svg.transition()
            .duration(30000)
            .ease("linear")
            .tween("year", tweenYear)
    },

    // Positions the dots based on data.
    position : function(dot, gapminder) {
        self = gapminder;
        dot
          .attr("cx", function(d) { return self.scales.x(d.x); })
          .attr("cy", function(d) { return self.scales.y(d.y); })
          .attr("r", function(d) { return self.scales.radius(d.radius); });
    },

    // Defines a sort order so that the smallest dots are drawn on top.
    order : function(a, b) {
      return b.radius - a.radius;
    },

    initCircles : function() {
        // Add a dot per nation. Initialize the data at start_year, and set the colors.
        this.dot = this.svg.append("g")
            .attr("class", "dots")
            .selectAll(".dot")
                .data(this.interpolateData(this.years.start_year))
                .enter().append("circle")
                    .attr("class", "dot")
                    .style("fill", function(d) { return colorScale(d.name); })
                    .call(this.position, this)
                    .sort(this.order);
    },

    // Updates the display to show the specified year.
    displayYear : function(year) {

        function key(d) { return d["name"]; }
        this.dot.data(this.interpolateData(year)).call(this.position, this).sort(this.order);
        this.label.text(Math.round(year));
        // Add a title.
        this.dot.append("title").text(key);
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
    animating = false;

    container.append("button")
        .text("Start")
        .style("margin-left", margin.left + 'px')
        .on("click", function(el) {
            var button = d3.select(d3.event.srcElement);
            if (!animating) {
                gapminder.startAnimation()
                animating = true;
                button.text("Stop");
            } else {
                gapminder.stopAnimation()
                animating = false;
                button.text("Start");
            }
        })
}

var load_data = function(csvfile, x_key, y_key, radius_key, years) {
    d3.csv(csvfile, function(data) {
        var dataobj = new Data(data, x_key, y_key, radius_key, years)

        var gapminder = new GapMinder(container, dataobj, years, {
            width: width,
            height: height,
            margin: margin,
            scales : {
                x : d3.scale.log().domain([dataobj.x.min, dataobj.x.max]).range([10, width]),
                y : d3.scale.linear().domain([dataobj.y.min, dataobj.y.max]).range([height, 10]),
                radius : d3.scale.sqrt().domain([dataobj.radius.min, dataobj.radius.max]).range([0, 40])
            }
        });
        var button = new StartButton(gapminder, container);

        gapminder.initCircles();
        gapminder.startAnimation()
    })
};
