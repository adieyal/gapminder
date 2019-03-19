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
var xScale = d3.scale.log().domain([300, 1e5]).range([0, width]),
    yScale = d3.scale.linear().domain([10, 85]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([0, 5e8]).range([0, 40]),
    colorScale = d3.scale.category10();

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
    yAxis = d3.svg.axis().scale(yScale).orient("left");


var container = d3.select("#chart")
var svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var animating = false;

container.append("button")
    .text("Start")
    .style("margin-left", margin.left + 'px')
    .on("click", function(el) {
        var button = d3.select(d3.event.srcElement);
        if (!animating) {
            startAnimation()
            animating = true;
            button.text("Stop");
        } else {
            stopAnimation()
            animating = false;
            button.text("Start");
        }
    })


// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("Income level");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("Median age");

var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(start_year);

// Load the data.
d3.json("income.json", function(nations) {

    min_income = d3.min(nations, function(nation) { return d3.min(incomes(nation)); })
    max_income = d3.max(nations, function(nation) { return d3.max(incomes(nation)); })
    min_age = d3.min(nations, function(nation) { return d3.min(ages(nation)); })
    max_age = d3.max(nations, function(nation) { return d3.max(ages(nation)); })

    min_population = d3.min(nations, function(nation) {
        return d3.min(populations(nation));
    })

    max_population = d3.max(nations, function(nation) {
        return d3.max(populations(nation));
    })

    xScale = d3.scale.log().domain([min_income, max_income]).range([10, width])
    yScale = d3.scale.linear().domain([min_age, max_age]).range([height, 10])
    radiusScale = d3.scale.sqrt().domain([min_population, max_population]).range([0, 40])

    // A bisector since many nation's data is sparsely-defined.
    var bisect = d3.bisector(function(d) { return d[0]; });

    // Add a dot per nation. Initialize the data at start_year, and set the colors.
    var dot = svg.append("g")
        .attr("class", "dots")
        .selectAll(".dot")
            .data(interpolateData(start_year))
            .enter().append("circle")
                .attr("class", "dot")
                .style("fill", function(d) { return colorScale(color(d)); })
                .call(position)
                .sort(order);
    // Add a title.
    dot.append("title").text(key);

    // Add an overlay for the year label.
    var box = label.node().getBBox();

    var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)

    // Start a transition that interpolates the data based on year.
    startAnimation = function() {
        svg.transition()
            .duration(30000)
            .ease("linear")
            .tween("year", tweenYear)
    }

    stopAnimation = function() {
        svg.transition();
    }

    startAnimation()

    // Positions the dots based on data.
    function position(dot) {
        dot
          .attr("cx", function(d) { return xScale(x(d)); })
          .attr("cy", function(d) { return yScale(y(d)); })
          .attr("r", function(d) { return radiusScale(radius(d)); });
    }

    // Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
      return radius(b) - radius(a);
    }

  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  tweenYear = function() {
    var year = d3.interpolateNumber(start_year, end_year);
    return function(t) { displayYear(year(t)); };
  }

  // Updates the display to show the specified year.
  displayYear = function(year) {
    dot.data(interpolateData(year), key).call(position).sort(order);
    label.text(Math.round(year));
  }

  // Interpolates the dataset for the given (fractional) year.
  function interpolateData(year) {
    return nations.map(function(d) {
      return {
        name: key(d),
        colour: color(d),
        region: "",
        "Income level": interpolateValues(x(d), year),
        "Median age": interpolateValues(y(d), year),
        "Population": interpolateValues(d["Population"], year)
      };
    });
  }

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
});
