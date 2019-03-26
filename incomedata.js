
var Data = function(data, x_key, y_key, radius_key, years, country_key, indicator_key) {

    this.data = data;
    this.x_key = x_key;
    this.y_key = y_key;
    this.radius_key = radius_key;
    this.years = years;
    this.country_key = country_key;
    this.indicator_key = indicator_key;

    this.hash = this._init_data(data);

    this.x = {
        min : _nested_min(this.hash, "x_data"),
        max : _nested_max(this.hash, "x_data"),
        key : "x_data"
    }

    this.y = {
        min : _nested_min(this.hash, "y_data") * 0.9,
        max : _nested_max(this.hash, "y_data") * 1.1,
        key : "y_data"
    }

    this.radius = {
        min : _nested_min(this.hash, "radius_data"),
        max : _nested_max(this.hash, "radius_data"),
        key : "radius_data"
    }
}

Data.prototype = {
    _init_data : function(data) {
        var x_data = this._extract_stat(this.x_key)
        var y_data = this._extract_stat(this.y_key);
        var radius_data = this._extract_stat(this.radius_key);

        hash = {}
        for (idx in data) {
            row = data[idx]
            country = row[this.country_key]
            hash[country] = {}
        }
        for (idx in x_data) {
            row = x_data[idx]
            hash[row[0]]["x_data"] = row[1];
        }
        for (idx in y_data) {
            row = y_data[idx]
            hash[row[0]]["y_data"] = row[1];
        }
        for (idx in radius_data) {
            row = radius_data[idx]
            hash[row[0]]["radius_data"] = row[1];
        }
        return hash;
    },

    _extract_stat : function(stat) {
        var self = this;
        stats = this.data.filter(function(datum) {
            return datum[self.indicator_key] == stat;
        });

        stats_array = stats.map(function(datum) {
            return [
                datum[self.country_key],
                _as_array(datum, self.years.start_year, self.years.end_year)
            ]

        })

        return stats_array;
    },
}

var clean = function(num) {
    return parseFloat(
        num
            .replace("$", "")
            .replace(",", "")
    )
}

var _as_array = function(datum, start_year, end_year) {
    var arr = [];
    for (year = start_year; year <= end_year; year++) {
        clean_year = clean(datum[year])
        d = [year, clean_year]
        arr.push(d)
    }
    return arr;
}

var _nested_min = function(hash, key) {
    values = Object.values(hash);
    return d3.min(values, function(datum) {
        return d3.min(datum[key], function(el) {
            return el[1]
        })
    })
}

var _nested_max = function(hash, key) {
    values = Object.values(hash);
    return d3.max(values, function(datum) {
        return d3.max(datum[key], function(el) {
            return el[1]
        })
    })
}
