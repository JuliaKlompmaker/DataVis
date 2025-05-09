var svg = d3.select("svg"),
	width = +svg.attr("width"),
	height = +svg.attr("height"),
	innerRadius = 180,
	outerRadius = Math.min(width, height) / 2,
	g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var x = d3.scaleBand()
	.range([0, 2 * Math.PI])
	.align(0);

var y = d3.scaleRadial()
    .range([innerRadius, outerRadius]);

var z = d3.scaleOrdinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

d3.csv("pollenData.csv", function(d, i, columns) {
	for (i = 2, t = 0; i < columns.length; ++i) t += d[columns[i]] = +d[columns[i]];
	d.total = t;
	return d;
}).then(function (data) {
    x.domain(data.map(function(d) { return d.Week; }));
	y.domain([0, d3.max(data, function(d) { return d.total; })]);
	z.domain(data.columns.slice(1));

	g.append("g")
		.selectAll("g")
		.data(d3.stack().keys(data.columns.slice(1))(data))
		.enter().append("g")
		.attr("fill", function(d) { return z(d.key); })
		.selectAll("path")
        .data(function(d) { return d; })
        .enter().append("path")
		.attr("d", d3.arc()
          .innerRadius(function(d) { return y(d[0]); })
          .outerRadius(function(d) { return y(d[1]); })
          .startAngle(function(d) { return x(d.data.Week); })
          .endAngle(function(d) { return x(d.data.Week) + x.bandwidth(); })
          .padAngle(0.01)
            .padRadius(innerRadius));

	let monthGroups = Array.from(
		d3.group(data, (d) => d.Month),
		([month, weeks]) => {
			let centerWeek = weeks[Math.floor(weeks.length / 2)];
			let centerAngle = d3.mean(
				weeks.map((w) => x(w.Week) + x.bandwidth() / 2)
			);
			return { Month: month, Week: centerWeek.Week, angle: centerAngle };
		}
	);

	var label = g.append("g")
		.selectAll("g")
		.data(monthGroups)
		.enter().append("g")
		.attr("text-anchor", "middle")
		.attr("transform", function(d) {return ("rotate(" +((d.angle * 180) / Math.PI - 90) +")translate(" +innerRadius +",0)");});

    label.append("line")
        .attr("x2", -5)
        .attr("stroke", "#000");

    label.append("text")
		.attr("transform", function(d) { return (d.angle + Math.PI / 2) % (2 * Math.PI) < Math.PI? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)"; })
		.text(function(d) { return d.Month; });

    var yAxis = g.append("g")
        .attr("text-anchor", "middle");

    var yTick = yAxis
        .selectAll("g")
        .data(y.ticks(5).slice(1))
        .enter().append("g");

        yTick.append("circle")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("r", y);

        yTick.append("text")
        .attr("y", function(d) { return -y(d); })
		.attr("dy", "0.35em")
		.attr("fill", "none")
		.attr("stroke", "#fff")
		.attr("stroke-width", 5)
		.text(y.tickFormat(5, "s"));

        yTick.append("text")
        .attr("y", function(d) { return -y(d); })
		.attr("dy", "0.35em")
		.text(y.tickFormat(5, "s"));

        yAxis.append("text")
        .attr("y", function(d) { return -y(y.ticks(5).pop()); })
		.attr("dy", "-1em")
		.text("Number of pollen per m^3 of air");

	var legend = g.append("g")
		.selectAll("g")
		.data(data.columns.slice(1).reverse())
		.enter().append("g")
        .attr("transform", function(d, i) { return "translate(-40," + (i - (data.columns.length - 1) / 2) * 20 + ")"; });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", z);

    legend.append("text")
		.attr("x", 24)
		.attr("y", 9)
		.attr("dy", "0.35em")
		.text(function(d) { return d; });
}).catch(function(error) {
    throw error;
  });
