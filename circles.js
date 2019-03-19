// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d["Income level"]; }
function y(d) { return d["Median age"]; }
function radius(d) { return d["Population"]; }
function color(d) { return d["name"]; }
function key(d) { return d["name"]; }

var incomes = function(country) {
    return country["Income level"].map(function(el) { return el[1]});
}

var ages = function(country) {
    return country["Median age"].map(function(el) { return el[1]});
}

var populations = function(country) {
    return country["Population"].map(function(el) { return el[1]});
}
var start_year = 2020;
var end_year = 2050;

var tweenYear, startAnimation;

// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 100},
    width = 960 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var colorScale = d3.scale.category10();

var container = d3.select("#chart")

var GapMinder = function(container, properties) {
    var p = properties;

    this.scales = p.scales;

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
        .text(start_year);
}

GapMinder.prototype = {
    stopAnimation : function() {
        this.svg.transition();
    },

    startAnimation : function() {
        this.svg.transition()
            .duration(30000)
            .ease("linear")
            .tween("year", tweenYear)
    },

    // Positions the dots based on data.
    position : function(dot, gapminder) {
        self = gapminder;
        dot
          .attr("cx", function(d) { return self.scales.x(x(d)); })
          .attr("cy", function(d) { return self.scales.y(y(d)); })
          .attr("r", function(d) { return self.scales.radius(radius(d)); });
    },

    // Defines a sort order so that the smallest dots are drawn on top.
    order : function(a, b) {
      return radius(b) - radius(a);
    },

    initCircles : function(dataobj, year) {
        // Add a dot per nation. Initialize the data at start_year, and set the colors.
        this.dot = this.svg.append("g")
            .attr("class", "dots")
            .selectAll(".dot")
                .data(this.interpolateData(dataobj, start_year))
                .enter().append("circle")
                    .attr("class", "dot")
                    .style("fill", function(d) { return colorScale(color(d)); })
                    .call(this.position, this)
                    .sort(this.order);
    },

    // Updates the display to show the specified year.
    displayYear : function(dataobj, year) {

            this.dot.data(this.interpolateData(dataobj, year), key).call(this.position, this).sort(this.order);
            this.label.text(Math.round(year));
            // Add a title.
            this.dot.append("title").text(key);
        },


    // Interpolates the dataset for the given (fractional) year.
    interpolateData : function(dataobj, year) {
        // A bisector since many nation's data is sparsely-defined.
        var bisect = d3.bisector(function(d) { return d[0]; });

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

        return dataobj.data.map(function(d) {
          return {
            name: key(d),
            colour: color(d),
            "Income level": interpolateValues(x(d), year),
            "Median age": interpolateValues(y(d), year),
            "Population": interpolateValues(d["Population"], year)
          };
        });
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

var Data = function(data) {
    this.data = data;
}

Data.prototype = {
    min_income : function() {
        return d3.min(this.data, function(datum) { return d3.min(incomes(datum)); })
    },

    max_income : function() {
        return d3.max(this.data, function(datum) { return d3.max(incomes(datum)); })
    },

    min_age : function() {
        return d3.min(this.data, function(datum) { return d3.min(ages(datum)); })
    },

    max_age : function() {
        return d3.max(this.data, function(datum) { return d3.max(ages(datum)); })
    },

    min_population : function() {
        return d3.min(this.data, function(datum) { return d3.min(populations(datum)); })
    },

    max_population : function() {
        return d3.max(this.data, function(datum) { return d3.max(populations(datum)); })
    }
}


// Load the data.
d3.json("income.json", function(data) {
    var dataobj = new Data(data)


    var gapminder = new GapMinder(container, {
        width: width,
        height: height,
        margin: margin,
        scales : {
            x : d3.scale.log().domain([dataobj.min_income(), dataobj.max_income()]).range([10, width]),
            y : d3.scale.linear().domain([dataobj.min_age(), dataobj.max_age()]).range([height, 10]),
            radius : d3.scale.sqrt().domain([dataobj.min_population(), dataobj.max_population()]).range([0, 40])
        }
    });
    var button = new StartButton(gapminder, container);

    gapminder.initCircles(dataobj, start_year);
    // Add an overlay for the year label.
    var box = gapminder.label.node().getBBox();

    var overlay = gapminder.svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)

    gapminder.startAnimation()


  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  tweenYear = function() {
    var year = d3.interpolateNumber(start_year, end_year);
    return function(t) { gapminder.displayYear(dataobj, year(t)); };
  }


});
